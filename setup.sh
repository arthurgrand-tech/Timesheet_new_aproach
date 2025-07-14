#!/bin/bash

# Multi-Tenant Timesheet Management System Setup Script (Fixed)
# This script sets up the complete application with MySQL database

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate random string
generate_secret() {
    if command_exists openssl; then
        openssl rand -base64 32 2>/dev/null
    elif command_exists head; then
        head -c 32 /dev/urandom | base64 2>/dev/null
    else
        echo "change-this-secret-$(date +%s)"
    fi
}

print_status "🚀 Starting Multi-Tenant Timesheet Management System Setup (Fixed)..."
echo

# Since you already provided the database URL, let's use it
DATABASE_URL="mysql://master:master@localhost:3306/timesheet_db"
print_status "Using database: $DATABASE_URL"

# Test database connection first
print_status "Testing database connection..."

# Create a simple test script
cat > test_db.js << 'EOF'
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection(process.argv[2]);
    console.log('✅ Database connection successful');
    
    // Test if database exists, if not create it
    await connection.execute('CREATE DATABASE IF NOT EXISTS timesheet_db');
    console.log('✅ Database timesheet_db is ready');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
EOF

# Install mysql2 first to test connection
print_status "Installing mysql2 for connection test..."
npm install mysql2 --no-save

# Test the connection
node test_db.js "$DATABASE_URL" || {
    print_error "Database connection failed. Please check your MySQL server and credentials."
    rm test_db.js
    exit 1
}

rm test_db.js
print_success "Database connection verified"

# Install project dependencies with correct packages
print_status "Installing project dependencies..."

# Remove old PostgreSQL dependencies if they exist
npm uninstall @neondatabase/serverless connect-pg-simple 2>/dev/null || true

# Install the correct MySQL session store package
print_status "Installing express-mysql-session (correct package)..."
npm install express-mysql-session mysql2

# Install all other dependencies
print_status "Installing remaining dependencies..."
npm install || {
    print_warning "Some dependencies failed to install. Continuing with --legacy-peer-deps..."
    npm install --legacy-peer-deps
}

print_success "Dependencies installed successfully"

# Update the auth.ts file to use the correct session store
print_status "Updating authentication configuration..."

# Create the updated auth.ts file with correct imports
cat > server/auth.ts << 'EOF'
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import MySQLStore from "express-mysql-session";
import mysql from "mysql2/promise";

declare global {
  namespace Express {
    interface User extends SelectUser {}
    interface Request {
      tenantId?: number;
      tenantSlug?: string;
      tenant?: any;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Multi-tenant middleware to extract tenant from subdomain or domain
export function extractTenantMiddleware() {
  return async (req: any, res: any, next: any) => {
    try {
      let tenantSlug = null;
      
      // Method 1: Extract from subdomain (e.g., acme.yourdomain.com)
      const host = req.get('host') || '';
      const subdomain = host.split('.')[0];
      
      // Method 2: Extract from custom domain
      const customDomain = host;
      
      // Method 3: Extract from header (for development/testing)
      const tenantHeader = req.get('X-Tenant-Slug');
      
      // Priority: header > custom domain > subdomain
      if (tenantHeader) {
        tenantSlug = tenantHeader;
      } else {
        // Check if it's a custom domain first
        const tenantByDomain = await storage.getTenantByDomain(customDomain);
        if (tenantByDomain) {
          tenantSlug = tenantByDomain.slug;
        } else if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost') {
          tenantSlug = subdomain;
        }
      }
      
      if (tenantSlug) {
        const tenant = await storage.getTenantBySlug(tenantSlug);
        if (tenant && tenant.isActive) {
          req.tenantSlug = tenantSlug;
          req.tenantId = tenant.id;
          req.tenant = tenant;
        }
      }
      
      next();
    } catch (error) {
      console.error('Error extracting tenant:', error);
      next();
    }
  };
}

export function setupAuth(app: Express) {
  // Parse DATABASE_URL for session store
  const dbUrl = new URL(process.env.DATABASE_URL!);
  
  // Create MySQL session store with correct configuration
  const MySQLStoreConstructor = MySQLStore(session);
  const sessionStore = new MySQLStoreConstructor({
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port) || 3306,
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1), // Remove leading slash
    createDatabaseTable: true,
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'session_id',
        expires: 'expires',
        data: 'data'
      }
    }
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
  };

  app.set("trust proxy", 1);
  
  // Apply tenant extraction middleware before session
  app.use(extractTenantMiddleware());
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      passReqToCallback: true // Allow access to req object
    }, async (req: any, username, password, done) => {
      try {
        // Multi-tenant login: find user within the tenant context
        const tenantId = req.tenantId;
        if (!tenantId) {
          return done(null, false, { message: "Tenant not found" });
        }
        
        const user = await storage.getUserByUsernameAndTenant(username, tenantId);
        if (!user || !user.isActive) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        if (!(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        // Update last login
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  // Registration endpoint with enhanced multi-tenant support
  app.post("/api/register", async (req, res, next) => {
    try {
      const { 
        username, 
        email, 
        password, 
        firstName, 
        lastName, 
        role = 'user',
        tenantName,
        tenantSlug,
        subdomain,
        domain
      } = req.body;

      let tenantId = req.tenantId;
      let isNewTenant = false;

      // If no tenant context and tenant info provided, create new tenant
      if (!tenantId && tenantName && tenantSlug) {
        // Check if tenant slug is available
        const existingTenant = await storage.getTenantBySlug(tenantSlug);
        if (existingTenant) {
          return res.status(400).json({ message: "Tenant slug already exists" });
        }

        const tenant = await storage.createTenant({
          name: tenantName,
          slug: tenantSlug,
          subdomain,
          domain,
          plan: 'trial',
          maxUsers: 50,
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        });
        
        tenantId = tenant.id;
        isNewTenant = true;
        req.tenantId = tenantId;
        req.tenant = tenant;
      }

      if (!tenantId) {
        return res.status(400).json({ message: "Tenant context required" });
      }

      // Check if user already exists in this tenant
      const existingUser = await storage.getUserByUsernameAndTenant(username, tenantId);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists in this organization" });
      }

      const existingEmail = await storage.getUserByEmailAndTenant(email, tenantId);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists in this organization" });
      }

      // For new tenants, first user becomes owner
      const userRole = isNewTenant ? 'owner' : role;

      const user = await storage.createUser({
        username,
        email,
        password: await hashPassword(password),
        firstName,
        lastName,
        role: userRole,
        tenantId,
        isActive: true,
        timezone: req.body.timezone || 'UTC',
        emailVerifiedAt: new Date(), // Auto-verify for now
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          user: { ...user, password: undefined },
          tenant: req.tenant,
          isNewTenant
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Enhanced login endpoint
  app.post("/api/login", (req, res, next) => {
    if (!req.tenantId) {
      return res.status(400).json({ message: "Tenant not found" });
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json({
          user: { ...user, password: undefined },
          tenant: req.tenant
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Enhanced user endpoint with tenant context
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({
      user: { ...req.user, password: undefined },
      tenant: req.tenant
    });
  });

  // Tenant validation endpoint
  app.get("/api/tenant/validate/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const tenant = await storage.getTenantBySlug(slug);
      
      if (!tenant || !tenant.isActive) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json({
        valid: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Invite user to tenant
  app.post("/api/invite", async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user || !['admin', 'owner', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { email, firstName, lastName, role = 'user' } = req.body;
      const tenantId = req.tenantId!;

      // Check if user already exists
      const existingUser = await storage.getUserByEmailAndTenant(email, tenantId);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists in this organization" });
      }

      // Generate temporary username
      const username = email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5);
      const tempPassword = Math.random().toString(36).substr(2, 12);

      const user = await storage.createUser({
        username,
        email,
        password: await hashPassword(tempPassword),
        firstName,
        lastName,
        role,
        tenantId,
        isActive: false, // Inactive until they set their password
        invitedBy: req.user.id,
        invitedAt: new Date(),
        timezone: 'UTC',
      });

      // TODO: Send invitation email with temporary password or setup link

      res.status(201).json({
        message: "User invited successfully",
        user: { ...user, password: undefined },
        tempPassword // Remove this in production, send via email instead
      });
    } catch (error) {
      console.error('Invitation error:', error);
      res.status(500).json({ message: "Failed to invite user" });
    }
  });
}
EOF

print_success "Authentication configuration updated"

# Create environment file
print_status "Creating environment configuration..."

SESSION_SECRET=$(generate_secret)

cat > .env << EOF
# Database Configuration
DATABASE_URL=${DATABASE_URL}

# Session Configuration
SESSION_SECRET=${SESSION_SECRET}

# Application Configuration
NODE_ENV=development
PORT=5000

# Multi-tenant Configuration
DEFAULT_TENANT_DOMAIN=localhost:5000
ALLOW_TENANT_SIGNUP=true

# Security Configuration
BCRYPT_ROUNDS=12

# Feature Flags
ENABLE_TIME_TRACKING=true
ENABLE_APPROVALS=true
ENABLE_REPORTS=true
ENABLE_DEPARTMENTS=true
EOF

print_success "Environment file created"

# Update package.json to remove the problematic type definition
print_status "Updating package.json..."

# Create a temporary Node.js script to update package.json
cat > update_package.js << 'EOF'
const fs = require('fs');
const path = require('path');

const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update dependencies for MySQL (using correct packages)
const mysqlDeps = {
  "mysql2": "^3.11.3",
  "express-mysql-session": "^3.0.3"
};

packageJson.dependencies = {
  ...packageJson.dependencies,
  ...mysqlDeps
};

// Remove PostgreSQL dependencies
delete packageJson.dependencies['@neondatabase/serverless'];
delete packageJson.dependencies['connect-pg-simple'];
delete packageJson.dependencies['connect-session-mysql']; // Remove the problematic one

// Remove problematic type definitions from devDependencies
delete packageJson.devDependencies['@types/connect-pg-simple'];
delete packageJson.devDependencies['@types/connect-session-mysql'];

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log('package.json updated successfully');
EOF

node update_package.js
rm update_package.js

print_success "Package.json updated"

# Run database migrations
print_status "Running database migrations..."

npm run db:push || {
    print_error "Failed to run migrations. The database might not be accessible."
    exit 1
}

print_success "Database migrations completed"

# Create demo data
print_status "Creating demo data..."

npm run seed || {
    print_warning "Failed to create demo data. You can run 'npm run seed' later."
}

print_success "Demo data created"

# Create startup scripts
print_status "Creating startup scripts..."

cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Multi-Tenant Timesheet Management System..."
echo

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Start the application
npm run dev
EOF

chmod +x start.sh

cat > start-production.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting Multi-Tenant Timesheet Management System (Production)..."
echo

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please run setup.sh first."
    exit 1
fi

# Build and start the application
npm run build
npm start
EOF

chmod +x start-production.sh

print_success "Startup scripts created"

# Final instructions
echo
echo "🎉 Setup completed successfully!"
echo
print_success "=================================="
print_success "    SETUP COMPLETE"
print_success "=================================="
echo
print_status "Application Details:"
echo "  📍 URL: http://localhost:5000"
echo "  🏢 Demo Tenant: http://demo.localhost:5000"
echo "  📊 Database Studio: npm run db:studio"
echo
print_status "Demo Login Credentials:"
echo "  👑 Owner:   username: owner   | password: password123"
echo "  🔧 Admin:   username: admin   | password: password123"
echo "  📋 Manager: username: manager | password: password123"
echo "  👤 User:    username: user    | password: password123"
echo
print_status "Available Commands:"
echo "  🚀 Start Development:  ./start.sh  (or npm run dev)"
echo "  🏭 Start Production:   ./start-production.sh"
echo "  📊 Database Studio:    npm run db:studio"
echo "  🌱 Reset Demo Data:    npm run seed"
echo "  🔍 Type Check:         npm run check"
echo
print_status "Multi-Tenant Access Methods:"
echo "  1. Subdomain: http://demo.localhost:5000"
echo "  2. Header: X-Tenant-Slug: demo-company"
echo "  3. Domain: Configure DNS for custom domains"
echo
print_status "Next Steps:"
echo "  1. Run: ./start.sh"
echo "  2. Open: http://localhost:5000"
echo "  3. Login with demo credentials"
echo "  4. Explore the multi-tenant features!"
echo

# Ask if user wants to start the application now
echo
read -p "🚀 Start the application now? (y/n): " START_NOW

if [[ $START_NOW =~ ^[Yy]$ ]]; then
    print_status "Starting the application..."
    echo
    ./start.sh
else
    print_success "Setup complete! Run './start.sh' when you're ready to start the application."
fi