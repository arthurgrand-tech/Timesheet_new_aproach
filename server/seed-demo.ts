import { db } from './db';
import { tenants, users } from '@shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seedDemo() {
  try {
    console.log('Creating demo tenant and user...');
    
    // Create demo tenant
    const [tenant] = await db.insert(tenants).values({
      name: 'Demo Company',
      slug: 'demo-company',
    }).returning();
    
    // Create demo user
    const [user] = await db.insert(users).values({
      username: 'demo',
      email: 'demo@example.com',
      password: await hashPassword('password123'),
      firstName: 'Demo',
      lastName: 'User',
      role: 'admin',
      tenantId: tenant.id,
      isActive: true,
    }).returning();
    
    console.log('Demo user created successfully!');
    console.log('Login credentials:');
    console.log('Username: demo');
    console.log('Password: password123');
    console.log('Role: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating demo user:', error);
    process.exit(1);
  }
}

seedDemo();