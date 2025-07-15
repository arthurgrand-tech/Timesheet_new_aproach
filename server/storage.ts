import { 
  organizations, 
  users, 
  projects, 
  tasks, 
  timesheets, 
  timesheetEntries, 
  auditLogs,
  type Organization,
  type User, 
  type Project, 
  type Task, 
  type Timesheet, 
  type TimesheetEntry, 
  type AuditLog,
  type InsertOrganization,
  type InsertUser, 
  type InsertProject, 
  type InsertTask, 
  type InsertTimesheet, 
  type InsertTimesheetEntry, 
  type InsertAuditLog 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Organizations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationByDomain(domain: string): Promise<Organization | undefined>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization>;
  
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByOrganization(organizationId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  authenticateUser(email: string, password: string): Promise<User | null>;
  
  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByOrganization(organizationId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByOrganization(organizationId: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Timesheets
  getTimesheet(id: number): Promise<Timesheet | undefined>;
  getTimesheetsByUser(userId: number): Promise<Timesheet[]>;
  getTimesheetsByOrganization(organizationId: number): Promise<Timesheet[]>;
  getTimesheetWithEntries(id: number): Promise<(Timesheet & { entries: TimesheetEntry[] }) | undefined>;
  createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet>;
  updateTimesheet(id: number, timesheet: Partial<InsertTimesheet>): Promise<Timesheet>;
  deleteTimesheet(id: number): Promise<void>;
  
  // Timesheet Entries
  getTimesheetEntry(id: number): Promise<TimesheetEntry | undefined>;
  getTimesheetEntriesByTimesheet(timesheetId: number): Promise<TimesheetEntry[]>;
  createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry>;
  updateTimesheetEntry(id: number, entry: Partial<InsertTimesheetEntry>): Promise<TimesheetEntry>;
  deleteTimesheetEntry(id: number): Promise<void>;
  
  // Audit Logs
  getAuditLogsByOrganization(organizationId: number): Promise<AuditLog[]>;
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  
  // Dashboard Stats
  getDashboardStats(organizationId: number): Promise<{
    totalHours: number;
    activeProjects: number;
    teamMembers: number;
    utilizationRate: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Organizations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, id));
    return organization || undefined;
  }

  async getOrganizationByDomain(domain: string): Promise<Organization | undefined> {
    const [organization] = await db.select().from(organizations).where(eq(organizations.domain, domain));
    return organization || undefined;
  }

  async createOrganization(organization: InsertOrganization): Promise<Organization> {
    const [newOrganization] = await db.insert(organizations).values(organization).returning();
    return newOrganization;
  }

  async updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization> {
    const [updatedOrganization] = await db
      .update(organizations)
      .set({ ...organization, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updatedOrganization;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const [newUser] = await db
      .insert(users)
      .values({ ...user, password: hashedPassword })
      .returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const updateData: any = { ...user, updatedAt: new Date() };
    if (user.password) {
      updateData.password = await bcrypt.hash(user.password, 10);
    }
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Projects
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByOrganization(organizationId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.organizationId, organizationId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Tasks
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTasksByOrganization(organizationId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.organizationId, organizationId));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Timesheets
  async getTimesheet(id: number): Promise<Timesheet | undefined> {
    const [timesheet] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return timesheet || undefined;
  }

  async getTimesheetsByUser(userId: number): Promise<Timesheet[]> {
    return await db.select().from(timesheets).where(eq(timesheets.userId, userId)).orderBy(desc(timesheets.weekEnding));
  }

  async getTimesheetsByOrganization(organizationId: number): Promise<Timesheet[]> {
    return await db.select().from(timesheets).where(eq(timesheets.organizationId, organizationId)).orderBy(desc(timesheets.weekEnding));
  }

  async getTimesheetWithEntries(id: number): Promise<(Timesheet & { entries: TimesheetEntry[] }) | undefined> {
    const timesheet = await this.getTimesheet(id);
    if (!timesheet) return undefined;
    
    const entries = await this.getTimesheetEntriesByTimesheet(id);
    return { ...timesheet, entries };
  }

  async createTimesheet(timesheet: InsertTimesheet): Promise<Timesheet> {
    const [newTimesheet] = await db.insert(timesheets).values(timesheet).returning();
    return newTimesheet;
  }

  async updateTimesheet(id: number, timesheet: Partial<InsertTimesheet>): Promise<Timesheet> {
    const [updatedTimesheet] = await db
      .update(timesheets)
      .set({ ...timesheet, updatedAt: new Date() })
      .where(eq(timesheets.id, id))
      .returning();
    return updatedTimesheet;
  }

  async deleteTimesheet(id: number): Promise<void> {
    await db.delete(timesheets).where(eq(timesheets.id, id));
  }

  // Timesheet Entries
  async getTimesheetEntry(id: number): Promise<TimesheetEntry | undefined> {
    const [entry] = await db.select().from(timesheetEntries).where(eq(timesheetEntries.id, id));
    return entry || undefined;
  }

  async getTimesheetEntriesByTimesheet(timesheetId: number): Promise<TimesheetEntry[]> {
    return await db.select().from(timesheetEntries).where(eq(timesheetEntries.timesheetId, timesheetId));
  }

  async createTimesheetEntry(entry: InsertTimesheetEntry): Promise<TimesheetEntry> {
    const [newEntry] = await db.insert(timesheetEntries).values(entry).returning();
    return newEntry;
  }

  async updateTimesheetEntry(id: number, entry: Partial<InsertTimesheetEntry>): Promise<TimesheetEntry> {
    const [updatedEntry] = await db
      .update(timesheetEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(timesheetEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async deleteTimesheetEntry(id: number): Promise<void> {
    await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id));
  }

  // Audit Logs
  async getAuditLogsByOrganization(organizationId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.organizationId, organizationId)).orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog> {
    const [newAuditLog] = await db.insert(auditLogs).values(auditLog).returning();
    return newAuditLog;
  }

  // Dashboard Stats
  async getDashboardStats(organizationId: number): Promise<{
    totalHours: number;
    activeProjects: number;
    teamMembers: number;
    utilizationRate: number;
  }> {
    const [totalHoursResult] = await db
      .select({ total: sql<number>`sum(${timesheets.totalHours})` })
      .from(timesheets)
      .where(and(
        eq(timesheets.organizationId, organizationId),
        eq(timesheets.status, "approved")
      ));

    const [activeProjectsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(projects)
      .where(and(
        eq(projects.organizationId, organizationId),
        eq(projects.status, "active")
      ));

    const [teamMembersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(and(
        eq(users.organizationId, organizationId),
        eq(users.isActive, true)
      ));

    return {
      totalHours: totalHoursResult.total || 0,
      activeProjects: activeProjectsResult.count || 0,
      teamMembers: teamMembersResult.count || 0,
      utilizationRate: 87, // This would be calculated based on business logic
    };
  }
}

export const storage = new DatabaseStorage();
