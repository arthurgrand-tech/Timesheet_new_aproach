import { 
  users, 
  tenants, 
  departments,
  projects, 
  projectAssignments,
  tasks, 
  timesheets, 
  timesheetEntries,
  timeTrackingSessions,
  approvalWorkflows,
  type User, 
  type InsertUser,
  type Tenant,
  type InsertTenant,
  type Department,
  type InsertDepartment,
  type Project,
  type InsertProject,
  type ProjectAssignment,
  type InsertProjectAssignment,
  type Task,
  type InsertTask,
  type Timesheet,
  type InsertTimesheet,
  type TimesheetEntry,
  type InsertTimesheetEntry,
  type TimeTrackingSession,
  type InsertTimeTrackingSession,
  type ApprovalWorkflow,
  type InsertApprovalWorkflow,
  type UserWithTenant,
  type ProjectWithTasks,
  type TimesheetWithEntries,
  type DepartmentWithUsers
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, isNull, sql } from "drizzle-orm";

export interface IStorage {
  // Tenant management
  getTenant(id: number): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getTenantByDomain(domain: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant>;
  
  // User management with tenant context
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByUsernameAndTenant(username: string, tenantId: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByEmailAndTenant(email: string, tenantId: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  getUsersByTenant(tenantId: number): Promise<User[]>;
  deactivateUser(id: number): Promise<boolean>;
  
  // Department management
  getDepartment(id: number): Promise<Department | undefined>;
  getDepartmentsByTenant(tenantId: number): Promise<DepartmentWithUsers[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<boolean>;
  
  // Project management with enhanced features
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByTenant(tenantId: number): Promise<ProjectWithTasks[]>;
  getProjectsByUser(userId: number, tenantId: number): Promise<ProjectWithTasks[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<boolean>;
  
  // Project assignment management
  assignUserToProject(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  removeUserFromProject(projectId: number, userId: number): Promise<boolean>;
  getProjectAssignments(projectId: number): Promise<(ProjectAssignment & { user: User })[]>;
  getUserProjectAssignments(userId: number): Promise<(ProjectAssignment & { project: Project })[]>;
  
  // Task management
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.name));
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assignedTo, userId)).orderBy(asc(tasks.name));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [result] = await db.insert(tasks).values(insertTask);
    return await this.getTask(result.insertId) as Task;
  }

  async updateTask(id: number, insertTask: Partial<InsertTask>): Promise<Task> {
    await db.update(tasks).set({
      ...insertTask,
      updatedAt: new Date()
    }).where(eq(tasks.id, id));
    return await this.getTask(id) as Task;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.affectedRows > 0;
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
        tenant: true,
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
        tenant: true,
        approver: true
      },
      orderBy: [desc(timesheets.weekStartDate)],
      limit
    });
  }

  async getTimesheetsByTenant(tenantId: number, status?: string): Promise<TimesheetWithEntries[]> {
    const whereCondition = status 
      ? and(eq(timesheets.tenantId, tenantId), eq(timesheets.status, status as any))
      : eq(timesheets.tenantId, tenantId);

    return await db.query.timesheets.findMany({
      where: whereCondition,
      with: {
        entries: {
          with: {
            project: true,
            task: true
          }
        },
        user: true,
        tenant: true,
        approver: true
      },
      orderBy: [desc(timesheets.weekStartDate)]
    });
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
        tenant: true,
        approver: true
      }
    });
    return timesheet || undefined;
  }

  async createTimesheet(insertTimesheet: InsertTimesheet): Promise<Timesheet> {
    // Calculate week end date
    const startDate = new Date(insertTimesheet.weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const [result] = await db.insert(timesheets).values({
      ...insertTimesheet,
      weekEndDate: endDate.toISOString().split('T')[0]
    });
    return await this.getTimesheet(result.insertId) as any;
  }

  async updateTimesheet(id: number, insertTimesheet: Partial<InsertTimesheet>): Promise<Timesheet> {
    await db.update(timesheets).set({
      ...insertTimesheet,
      updatedAt: new Date()
    }).where(eq(timesheets.id, id));
    return await this.getTimesheet(id) as any;
  }

  async deleteTimesheet(id: number): Promise<boolean> {
    const result = await db.delete(timesheets).where(eq(timesheets.id, id));
    return result.affectedRows > 0;
  }

  // Timesheet entry management
  async getTimesheetEntry(id: number): Promise<TimesheetEntry | undefined> {
    const [entry] = await db.select().from(timesheetEntries).where(eq(timesheetEntries.id, id));
    return entry || undefined;
  }

  async createTimesheetEntry(insertEntry: InsertTimesheetEntry): Promise<TimesheetEntry> {
    const [result] = await db.insert(timesheetEntries).values(insertEntry);
    return await this.getTimesheetEntry(result.insertId) as TimesheetEntry;
  }

  async updateTimesheetEntry(id: number, insertEntry: Partial<InsertTimesheetEntry>): Promise<TimesheetEntry> {
    await db.update(timesheetEntries).set({
      ...insertEntry,
      updatedAt: new Date()
    }).where(eq(timesheetEntries.id, id));
    return await this.getTimesheetEntry(id) as TimesheetEntry;
  }

  async deleteTimesheetEntry(id: number): Promise<boolean> {
    const result = await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id));
    return result.affectedRows > 0;
  }

  async getEntriesByDateRange(userId: number, startDate: string, endDate: string): Promise<TimesheetEntry[]> {
    return await db.select().from(timesheetEntries)
      .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
      .where(
        and(
          eq(timesheets.userId, userId),
          gte(timesheetEntries.entryDate, startDate),
          lte(timesheetEntries.entryDate, endDate)
        )
      );
  }

  // Time tracking sessions
  async getActiveSession(userId: number): Promise<TimeTrackingSession | undefined> {
    const [session] = await db.select().from(timeTrackingSessions).where(
      and(eq(timeTrackingSessions.userId, userId), eq(timeTrackingSessions.isActive, true))
    );
    return session || undefined;
  }

  async createTimeTrackingSession(insertSession: InsertTimeTrackingSession): Promise<TimeTrackingSession> {
    const [result] = await db.insert(timeTrackingSessions).values(insertSession);
    const [session] = await db.select().from(timeTrackingSessions).where(eq(timeTrackingSessions.id, result.insertId));
    return session;
  }

  async updateTimeTrackingSession(id: number, insertSession: Partial<InsertTimeTrackingSession>): Promise<TimeTrackingSession> {
    await db.update(timeTrackingSessions).set({
      ...insertSession,
      updatedAt: new Date()
    }).where(eq(timeTrackingSessions.id, id));
    const [session] = await db.select().from(timeTrackingSessions).where(eq(timeTrackingSessions.id, id));
    return session;
  }

  async endTimeTrackingSession(id: number): Promise<TimeTrackingSession> {
    const endTime = new Date();
    const [session] = await db.select().from(timeTrackingSessions).where(eq(timeTrackingSessions.id, id));
    
    if (session) {
      const duration = Math.floor((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);
      await db.update(timeTrackingSessions).set({
        endTime,
        duration,
        isActive: false,
        updatedAt: new Date()
      }).where(eq(timeTrackingSessions.id, id));
    }
    
    const [updatedSession] = await db.select().from(timeTrackingSessions).where(eq(timeTrackingSessions.id, id));
    return updatedSession;
  }

  // Approval workflows
  async getApprovalWorkflows(tenantId: number): Promise<ApprovalWorkflow[]> {
    return await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.tenantId, tenantId));
  }

  async createApprovalWorkflow(insertWorkflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow> {
    const [result] = await db.insert(approvalWorkflows).values(insertWorkflow);
    const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, result.insertId));
    return workflow;
  }

  async updateApprovalWorkflow(id: number, insertWorkflow: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow> {
    await db.update(approvalWorkflows).set({
      ...insertWorkflow,
      updatedAt: new Date()
    }).where(eq(approvalWorkflows.id, id));
    const [workflow] = await db.select().from(approvalWorkflows).where(eq(approvalWorkflows.id, id));
    return workflow;
  }

  // Analytics and reporting
  async getTenantStats(tenantId: number): Promise<any> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.tenantId, tenantId));
    const [projectCount] = await db.select({ count: sql<number>`count(*)` }).from(projects).where(eq(projects.tenantId, tenantId));
    const [timesheetCount] = await db.select({ count: sql<number>`count(*)` }).from(timesheets).where(eq(timesheets.tenantId, tenantId));
    
    const [totalHours] = await db.select({ 
      total: sql<number>`sum(${timesheetEntries.hours})` 
    }).from(timesheetEntries).where(eq(timesheetEntries.tenantId, tenantId));

    return {
      userCount: userCount.count,
      projectCount: projectCount.count,
      timesheetCount: timesheetCount.count,
      totalHours: totalHours.total || 0
    };
  }

  async getUserTimeStats(userId: number, startDate: string, endDate: string): Promise<any> {
    const entries = await db.select({
      totalHours: sql<number>`sum(${timesheetEntries.hours})`,
      billableHours: sql<number>`sum(case when ${timesheetEntries.isBillable} then ${timesheetEntries.hours} else 0 end)`,
      entryCount: sql<number>`count(*)`
    }).from(timesheetEntries)
    .innerJoin(timesheets, eq(timesheetEntries.timesheetId, timesheets.id))
    .where(
      and(
        eq(timesheets.userId, userId),
        gte(timesheetEntries.entryDate, startDate),
        lte(timesheetEntries.entryDate, endDate)
      )
    );

    return entries[0] || { totalHours: 0, billableHours: 0, entryCount: 0 };
  }

  async getProjectTimeStats(projectId: number, startDate: string, endDate: string): Promise<any> {
    const entries = await db.select({
      totalHours: sql<number>`sum(${timesheetEntries.hours})`,
      billableHours: sql<number>`sum(case when ${timesheetEntries.isBillable} then ${timesheetEntries.hours} else 0 end)`,
      entryCount: sql<number>`count(*)`
    }).from(timesheetEntries)
    .where(
      and(
        eq(timesheetEntries.projectId, projectId),
        gte(timesheetEntries.entryDate, startDate),
        lte(timesheetEntries.entryDate, endDate)
      )
    );

    return entries[0] || { totalHours: 0, billableHours: 0, entryCount: 0 };
  }
}

export const storage = new DatabaseStorage();
  getTask(id: number): Promise<Task | undefined>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByUser(userId: number): Promise<Task[]>;
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
  getEntriesByDateRange(userId: number, startDate: string, endDate: string): Promise<TimesheetEntry[]>;
  
  // Time tracking sessions
  getActiveSession(userId: number): Promise<TimeTrackingSession | undefined>;
  createTimeTrackingSession(session: InsertTimeTrackingSession): Promise<TimeTrackingSession>;
  updateTimeTrackingSession(id: number, session: Partial<InsertTimeTrackingSession>): Promise<TimeTrackingSession>;
  endTimeTrackingSession(id: number): Promise<TimeTrackingSession>;
  
  // Approval workflows
  getApprovalWorkflows(tenantId: number): Promise<ApprovalWorkflow[]>;
  createApprovalWorkflow(workflow: InsertApprovalWorkflow): Promise<ApprovalWorkflow>;
  updateApprovalWorkflow(id: number, workflow: Partial<InsertApprovalWorkflow>): Promise<ApprovalWorkflow>;
  
  // Analytics and reporting
  getTenantStats(tenantId: number): Promise<any>;
  getUserTimeStats(userId: number, startDate: string, endDate: string): Promise<any>;
  getProjectTimeStats(projectId: number, startDate: string, endDate: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Tenant management
  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant || undefined;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant || undefined;
  }

  async getTenantByDomain(domain: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(
      or(eq(tenants.domain, domain), eq(tenants.subdomain, domain.split('.')[0]))
    );
    return tenant || undefined;
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(insertTenant);
    return await this.getTenant(tenant.insertId) as Tenant;
  }

  async updateTenant(id: number, insertTenant: Partial<InsertTenant>): Promise<Tenant> {
    await db.update(tenants).set({
      ...insertTenant,
      updatedAt: new Date()
    }).where(eq(tenants.id, id));
    return await this.getTenant(id) as Tenant;
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

  async getUserByUsernameAndTenant(username: string, tenantId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.username, username), eq(users.tenantId, tenantId))
    );
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByEmailAndTenant(email: string, tenantId: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(eq(users.email, email), eq(users.tenantId, tenantId))
    );
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(insertUser);
    return await this.getUser(result.insertId) as User;
  }

  async updateUser(id: number, insertUser: Partial<InsertUser>): Promise<User> {
    await db.update(users).set({
      ...insertUser,
      updatedAt: new Date()
    }).where(eq(users.id, id));
    return await this.getUser(id) as User;
  }

  async getUsersByTenant(tenantId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(asc(users.firstName));
  }

  async deactivateUser(id: number): Promise<boolean> {
    const result = await db.update(users).set({ 
      isActive: false,
      updatedAt: new Date()
    }).where(eq(users.id, id));
    return result.affectedRows > 0;
  }

  // Department management
  async getDepartment(id: number): Promise<Department | undefined> {
    const [department] = await db.select().from(departments).where(eq(departments.id, id));
    return department || undefined;
  }

  async getDepartmentsByTenant(tenantId: number): Promise<DepartmentWithUsers[]> {
    const departmentsWithManager = await db.query.departments.findMany({
      where: eq(departments.tenantId, tenantId),
      with: {
        manager: true,
        projects: true
      },
      orderBy: [asc(departments.name)]
    });
    return departmentsWithManager;
  }

  async createDepartment(insertDepartment: InsertDepartment): Promise<Department> {
    const [result] = await db.insert(departments).values(insertDepartment);
    return await this.getDepartment(result.insertId) as Department;
  }

  async updateDepartment(id: number, insertDepartment: Partial<InsertDepartment>): Promise<Department> {
    await db.update(departments).set({
      ...insertDepartment,
      updatedAt: new Date()
    }).where(eq(departments.id, id));
    return await this.getDepartment(id) as Department;
  }

  async deleteDepartment(id: number): Promise<boolean> {
    const result = await db.delete(departments).where(eq(departments.id, id));
    return result.affectedRows > 0;
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
        tasks: true,
        department: true,
        manager: true,
        projectAssignments: {
          with: {
            user: true
          }
        }
      },
      orderBy: [asc(projects.name)]
    });
    return projectsWithTasks;
  }

  async getProjectsByUser(userId: number, tenantId: number): Promise<ProjectWithTasks[]> {
    const userProjects = await db.query.projectAssignments.findMany({
      where: eq(projectAssignments.userId, userId),
      with: {
        project: {
          with: {
            tasks: true,
            department: true,
            manager: true
          }
        }
      }
    });
    
    return userProjects
      .filter(assignment => assignment.project.tenantId === tenantId)
      .map(assignment => assignment.project);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [result] = await db.insert(projects).values(insertProject);
    return await this.getProject(result.insertId) as Project;
  }

  async updateProject(id: number, insertProject: Partial<InsertProject>): Promise<Project> {
    await db.update(projects).set({
      ...insertProject,
      updatedAt: new Date()
    }).where(eq(projects.id, id));
    return await this.getProject(id) as Project;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return result.affectedRows > 0;
  }

  // Project assignment management
  async assignUserToProject(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [result] = await db.insert(projectAssignments).values(assignment);
    const [newAssignment] = await db.select().from(projectAssignments).where(eq(projectAssignments.id, result.insertId));
    return newAssignment;
  }

  async removeUserFromProject(projectId: number, userId: number): Promise<boolean> {
    const result = await db.delete(projectAssignments).where(
      and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, userId))
    );
    return result.affectedRows > 0;
  }

  async getProjectAssignments(projectId: number): Promise<(ProjectAssignment & { user: User })[]> {
    return await db.query.projectAssignments.findMany({
      where: eq(projectAssignments.projectId, projectId),
      with: {
        user: true
      }
    });
  }

  async getUserProjectAssignments(userId: number): Promise<(ProjectAssignment & { project: Project })[]> {
    return await db.query.projectAssignments.findMany({
      where: eq(projectAssignments.userId, userId),
      with: {
        project: true
      }
    });
  }

  // Task management