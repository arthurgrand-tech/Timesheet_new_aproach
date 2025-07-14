import { 
  users, 
  tenants, 
  projects, 
  tasks, 
  timesheets, 
  timesheetEntries,
  type User, 
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type Timesheet,
  type InsertTimesheet,
  type TimesheetEntry,
  type InsertTimesheetEntry,
  type UserWithTenant,
  type ProjectWithTasks,
  type TimesheetWithEntries
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getUsersByTenant(tenantId: number): Promise<User[]>;
  
  // Tenant management
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant>;
  
  // Project management
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByTenant(tenantId: number): Promise<ProjectWithTasks[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<boolean>;
  
  // Task management
  getTask(id: number): Promise<Task | undefined>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<boolean>;
  
  // Timesheet management
  getTimesheet(id: number): Promise<TimesheetWithEntries | undefined>;
  getTimesheetsByUser(userId: number, limit?: number): Promise<TimesheetWithEntries[]>;
  getTimesheetsByTenant(tenantId: number, status?: string): Promise<TimesheetWithEntries[]>;
  getTimesheetForWeek(userId: number, weekStartDate: string): Promise<TimesheetWithEntries | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, timesheet: Partial<InsertTimesheet>): Promise<Timesheet>;
  deleteTimesheet(id: number): Promise<boolean>;
  
  // Timesheet entry management
  getTimesheetEntry(id: number): Promise<TimesheetEntry | undefined>;
  createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry>;
  updateTimesheetEntry(id: number, entry: Partial<InsertTimesheetEntry>): Promise<TimesheetEntry>;
  deleteTimesheetEntry(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, insertUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(insertUser).where(eq(users.id, id)).returning();
    return user;
  }

  async getUsersByTenant(tenantId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  // Tenant management
  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant).returning();
    return tenant;
  }

  async updateTenant(id: number, insertTenant: Partial<InsertTenant>): Promise<Tenant> {
    const [tenant] = await db.update(tenants).set(insertTenant).where(eq(tenants.id, id)).returning();
    return tenant;
  }

  // Project management
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByTenant(tenantId: number): Promise<ProjectWithTasks[]> {
    const projectsWithTasks = await db.query.projects.findMany({
      where: eq(projects.tenantId, tenantId),
      with: {
        tasks: true
      },
      orderBy: [asc(projects.name)]
    });
    return projectsWithTasks;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, insertProject: Partial<InsertProject>): Promise<Project> {
    const [project] = await db.update(projects).set(insertProject).where(eq(projects.id, id)).returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  // Task management
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, insertTask: Partial<InsertTask>): Promise<Task> {
    const [task] = await db.update(tasks).set(insertTask).where(eq(tasks.id, id)).returning();
    return task;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  // Timesheet management
  async getTimesheet(id: number): Promise<TimesheetWithEntries | undefined> {
    const timesheet = await db.query.timesheets.findFirst({
      where: eq(timesheets.id, id),
      with: {
        entries: {
          with: {
            project: true,
            task: true
          }
        },
        user: true,
        approver: true
      }
    });
    return timesheet || undefined;
  }

  async getTimesheetsByUser(userId: number, limit: number = 10): Promise<TimesheetWithEntries[]> {
    return await db.query.timesheets.findMany({
      where: eq(timesheets.userId, userId),
      with: {
        entries: {
          with: {
            project: true,
            task: true
          }
        },
        user: true,
        approver: true
      },
      orderBy: [desc(timesheets.weekStartDate)],
      limit
    });
  }

  async getTimesheetsByTenant(tenantId: number, status?: string): Promise<TimesheetWithEntries[]> {
    const timesheetsList = await db.query.timesheets.findMany({
      where: status ? eq(timesheets.status, status as any) : undefined,
      with: {
        entries: {
          with: {
            project: true,
            task: true
          }
        },
        user: {
          where: eq(users.tenantId, tenantId)
        },
        approver: true
      },
      orderBy: [desc(timesheets.weekStartDate)]
    });
    return timesheetsList.filter(t => t.user);
  }

  async getTimesheetForWeek(userId: number, weekStartDate: string): Promise<TimesheetWithEntries | undefined> {
    const timesheet = await db.query.timesheets.findFirst({
      where: and(
        eq(timesheets.userId, userId),
        eq(timesheets.weekStartDate, weekStartDate)
      ),
      with: {
        entries: {
          with: {
            project: true,
            task: true
          }
        },
        user: true,
        approver: true
      }
    });
    return timesheet || undefined;
  }

  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    const [timesheet] = await db.insert(timesheets).values(insertTimesheet).returning();
    return timesheet;
  }

  async updateTimesheet(id: number, insertTimesheet: Partial<InsertTimesheet>): Promise<Timesheet> {
    const [timesheet] = await db.update(timesheets).set({
      ...insertTimesheet,
      updatedAt: new Date()
    }).where(eq(timesheets.id, id)).returning();
    return timesheet;
  }

  async deleteTimesheet(id: number): Promise<boolean> {
    const result = await db.delete(timesheets).where(eq(timesheets.id, id));
    return result.rowCount > 0;
  }

  // Timesheet entry management
  async getTimesheetEntry(id: number): Promise<TimesheetEntry | undefined> {
    const [entry] = await db.select().from(timesheetEntries).where(eq(timesheetEntries.id, id));
    return entry || undefined;
  }

  async createTimesheetEntry(insertEntry: InsertTimesheetEntry): Promise<TimesheetEntry> {
    const [entry] = await db.insert(timesheetEntries).values(insertEntry).returning();
    return entry;
  }

  async updateTimesheetEntry(id: number, insertEntry: Partial<InsertTimesheetEntry>): Promise<TimesheetEntry> {
    const [entry] = await db.update(timesheetEntries).set({
      ...insertEntry,
      updatedAt: new Date()
    }).where(eq(timesheetEntries.id, id)).returning();
    return entry;
  }

  async deleteTimesheetEntry(id: number): Promise<boolean> {
    const result = await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
