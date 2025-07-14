import { db } from './db';
import { tenants, users, departments, projects, tasks, projectAssignments } from '@shared/schema';
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
    console.log('Creating demo tenant and users...');
    
    // Create demo tenant
    const [tenantResult] = await db.insert(tenants).values({
      name: 'Demo Company Inc.',
      slug: 'demo-company',
      subdomain: 'demo',
      plan: 'trial',
      maxUsers: 50,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      isActive: true,
    });
    
    const tenantId = tenantResult.insertId;
    console.log(`Created tenant with ID: ${tenantId}`);
    
    // Create demo users with different roles
    const [ownerResult] = await db.insert(users).values({
      username: 'owner',
      email: 'owner@demo-company.com',
      password: await hashPassword('password123'),
      firstName: 'John',
      lastName: 'Owner',
      role: 'owner',
      tenantId: tenantId,
      isActive: true,
      timezone: 'UTC',
      emailVerifiedAt: new Date(),
    });

    const [adminResult] = await db.insert(users).values({
      username: 'admin',
      email: 'admin@demo-company.com',
      password: await hashPassword('password123'),
      firstName: 'Jane',
      lastName: 'Admin',
      role: 'admin',
      tenantId: tenantId,
      isActive: true,
      timezone: 'UTC',
      emailVerifiedAt: new Date(),
    });

    const [managerResult] = await db.insert(users).values({
      username: 'manager',
      email: 'manager@demo-company.com',
      password: await hashPassword('password123'),
      firstName: 'Bob',
      lastName: 'Manager',
      role: 'manager',
      tenantId: tenantId,
      isActive: true,
      timezone: 'UTC',
      emailVerifiedAt: new Date(),
    });

    const [userResult] = await db.insert(users).values({
      username: 'user',
      email: 'user@demo-company.com',
      password: await hashPassword('password123'),
      firstName: 'Alice',
      lastName: 'User',
      role: 'user',
      tenantId: tenantId,
      isActive: true,
      timezone: 'UTC',
      emailVerifiedAt: new Date(),
    });

    console.log('Created demo users');

    // Create departments
    const [engineeringDeptResult] = await db.insert(departments).values({
      name: 'Engineering',
      description: 'Software development and engineering team',
      managerId: managerResult.insertId,
      tenantId: tenantId,
      isActive: true,
    });

    const [marketingDeptResult] = await db.insert(departments).values({
      name: 'Marketing',
      description: 'Marketing and communications team',
      managerId: managerResult.insertId,
      tenantId: tenantId,
      isActive: true,
    });

    console.log('Created departments');

    // Create sample projects
    const [project1Result] = await db.insert(projects).values({
      name: 'Website Redesign',
      description: 'Complete redesign of company website',
      clientName: 'Internal',
      color: '#3B82F6',
      status: 'active',
      priority: 'high',
      budget: '50000.00',
      hourlyRate: '75.00',
      departmentId: engineeringDeptResult.insertId,
      managerId: managerResult.insertId,
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      tenantId: tenantId,
      isActive: true,
      isBillable: true,
      requiresApproval: true,
    });

    const [project2Result] = await db.insert(projects).values({
      name: 'Mobile App Development',
      description: 'Native mobile application for iOS and Android',
      clientName: 'TechCorp Ltd',
      clientEmail: 'contact@techcorp.com',
      color: '#10B981',
      status: 'active',
      priority: 'medium',
      budget: '100000.00',
      hourlyRate: '85.00',
      departmentId: engineeringDeptResult.insertId,
      managerId: managerResult.insertId,
      startDate: '2024-02-01',
      endDate: '2024-12-31',
      tenantId: tenantId,
      isActive: true,
      isBillable: true,
      requiresApproval: true,
    });

    const [project3Result] = await db.insert(projects).values({
      name: 'Marketing Campaign Q2',
      description: 'Digital marketing campaign for Q2 product launch',
      clientName: 'Internal',
      color: '#8B5CF6',
      status: 'active',
      priority: 'medium',
      budget: '25000.00',
      hourlyRate: '60.00',
      departmentId: marketingDeptResult.insertId,
      managerId: managerResult.insertId,
      startDate: '2024-04-01',
      endDate: '2024-06-30',
      tenantId: tenantId,
      isActive: true,
      isBillable: false,
      requiresApproval: true,
    });

    console.log('Created sample projects');

    // Create sample tasks
    await db.insert(tasks).values([
      {
        name: 'Frontend Development',
        description: 'Build responsive frontend with React',
        projectId: project1Result.insertId,
        assignedTo: userResult.insertId,
        status: 'in_progress',
        priority: 'high',
        estimatedHours: '120.00',
        isBillable: true,
        hourlyRate: '75.00',
        isActive: true,
      },
      {
        name: 'Backend API Development',
        description: 'Develop REST API with Node.js',
        projectId: project1Result.insertId,
        status: 'open',
        priority: 'high',
        estimatedHours: '80.00',
        isBillable: true,
        hourlyRate: '75.00',
        isActive: true,
      },
      {
        name: 'UI/UX Design',
        description: 'Design user interface and user experience',
        projectId: project1Result.insertId,
        status: 'open',
        priority: 'medium',
        estimatedHours: '60.00',
        isBillable: true,
        hourlyRate: '70.00',
        isActive: true,
      },
      {
        name: 'iOS Development',
        description: 'Native iOS app development',
        projectId: project2Result.insertId,
        status: 'open',
        priority: 'medium',
        estimatedHours: '200.00',
        isBillable: true,
        hourlyRate: '85.00',
        isActive: true,
      },
      {
        name: 'Android Development',
        description: 'Native Android app development',
        projectId: project2Result.insertId,
        status: 'open',
        priority: 'medium',
        estimatedHours: '200.00',
        isBillable: true,
        hourlyRate: '85.00',
        isActive: true,
      },
      {
        name: 'Content Creation',
        description: 'Create marketing content and copy',
        projectId: project3Result.insertId,
        status: 'open',
        priority: 'medium',
        estimatedHours: '40.00',
        isBillable: false,
        hourlyRate: '60.00',
        isActive: true,
      },
    ]);

    console.log('Created sample tasks');

    // Assign users to projects
    await db.insert(projectAssignments).values([
      {
        projectId: project1Result.insertId,
        userId: userResult.insertId,
        role: 'developer',
        hourlyRate: '75.00',
        canSubmitTime: true,
        canViewReports: false,
        assignedBy: managerResult.insertId,
      },
      {
        projectId: project1Result.insertId,
        userId: managerResult.insertId,
        role: 'lead',
        hourlyRate: '90.00',
        canSubmitTime: true,
        canViewReports: true,
        assignedBy: adminResult.insertId,
      },
      {
        projectId: project2Result.insertId,
        userId: userResult.insertId,
        role: 'developer',
        hourlyRate: '85.00',
        canSubmitTime: true,
        canViewReports: false,
        assignedBy: managerResult.insertId,
      },
      {
        projectId: project3Result.insertId,
        userId: userResult.insertId,
        role: 'contributor',
        hourlyRate: '60.00',
        canSubmitTime: true,
        canViewReports: false,
        assignedBy: managerResult.insertId,
      },
    ]);

    console.log('Created project assignments');
    
    console.log('\n=== Demo Setup Complete! ===');
    console.log('\nTenant Information:');
    console.log('- Name: Demo Company Inc.');
    console.log('- Slug: demo-company');
    console.log('- Subdomain: demo');
    console.log('- Access URL: http://demo.localhost:5000 (or use X-Tenant-Slug header)');
    
    console.log('\nDemo Login Credentials:');
    console.log('1. Owner Account:');
    console.log('   Username: owner');
    console.log('   Password: password123');
    console.log('   Role: owner (full access)');
    
    console.log('\n2. Admin Account:');
    console.log('   Username: admin');
    console.log('   Password: password123');
    console.log('   Role: admin (full access)');
    
    console.log('\n3. Manager Account:');
    console.log('   Username: manager');
    console.log('   Password: password123');
    console.log('   Role: manager (can approve timesheets, manage projects)');
    
    console.log('\n4. User Account:');
    console.log('   Username: user');
    console.log('   Password: password123');
    console.log('   Role: user (can submit timesheets)');

    console.log('\nSample Data Created:');
    console.log('- 2 Departments (Engineering, Marketing)');
    console.log('- 3 Projects with different statuses and priorities');
    console.log('- 6 Tasks assigned to projects');
    console.log('- Project assignments for team collaboration');
    
    console.log('\nNext Steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Access via: http://localhost:5000');
    console.log('3. Add X-Tenant-Slug: demo-company header for API requests');
    console.log('4. Or set up subdomain: demo.localhost:5000');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating demo data:', error);
    process.exit(1);
  }
}

seedDemo();