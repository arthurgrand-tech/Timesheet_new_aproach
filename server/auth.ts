import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import MySQLStore from "connect-session-mysql/lib/MySQLStore";
import { pool } from "./db";

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
        } else if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
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
  // MySQL session store
  const sessionStore = new MySQLStore({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'timesheet_db',
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