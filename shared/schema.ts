import { 
  mysqlTable, 
  text, 
  int, 
  boolean, 
  timestamp, 
  decimal, 
  date, 
  json,
  varchar,
  index,
  uniqueIndex
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table for multi-tenancy with enhanced features
export const tenants = mysqlTable("tenants", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }), // Custom domain support
  subdomain: varchar("subdomain", { length: 100 }), // Subdomain support
  settings: json("settings").default({}),
  plan: varchar("plan", { length: 50 }).default("free"), // Subscription plan
  maxUsers: int("max_users").default(10),
  isActive: boolean("is_active").default(true),
  trialEndsAt: timestamp("trial_ends_at"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  slugIdx: uniqueIndex("slug_idx").on(table.slug),
  domainIdx: index("domain_idx").on(table.domain),
  subdomainIdx: index("subdomain_idx").on(table.subdomain),
}));

// Users table with enhanced role-based access and tenant isolation
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  password: text("password").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().$type<'user' | 'manager' | 'admin' | 'owner'>(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  permissions: json("permissions").default([]), // Custom permissions per user
  avatar: text("avatar"), // Profile picture URL
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  emailVerifiedAt: timestamp("email_verified_at"),
  invitedBy: int("invited_by").references(() => users.id),
  invitedAt: timestamp("invited_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  tenantUserIdx: uniqueIndex("tenant_user_idx").on(table.tenantId, table.username),
  tenantEmailIdx: uniqueIndex("tenant_email_idx").on(table.tenantId, table.email),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  roleIdx: index("role_idx").on(table.role),
}));

// Departments for better organization within tenants
export const departments = mysqlTable("departments", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  managerId: int("manager_id").references(() => users.id),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  managerIdx: index("manager_idx").on(table.managerId),
}));

// Enhanced projects table with better categorization
export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientName: varchar("client_name", { length: 255 }),
  clientEmail: varchar("client_email", { length: 255 }),
  color: varchar("color", { length: 7 }).default("#1976D2"),
  status: varchar("status", { length: 20 }).default("active").$type<'active' | 'on_hold' | 'completed' | 'cancelled'>(),
  priority: varchar("priority", { length: 20 }).default("medium").$type<'low' | 'medium' | 'high' | 'urgent'>(),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  departmentId: int("department_id").references(() => departments.id),
  managerId: int("manager_id").references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  isActive: boolean("is_active").default(true),
  isBillable: boolean("is_billable").default(true),
  requiresApproval: boolean("requires_approval").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  statusIdx: index("status_idx").on(table.status),
  managerIdx: index("manager_idx").on(table.managerId),
  departmentIdx: index("department_idx").on(table.departmentId),
}));

// Project assignments for team members
export const projectAssignments = mysqlTable("project_assignments", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).default("member"), // member, lead, viewer
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  canSubmitTime: boolean("can_submit_time").default(true),
  canViewReports: boolean("can_view_reports").default(false),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: int("assigned_by").references(() => users.id),
}, (table) => ({
  projectUserIdx: uniqueIndex("project_user_idx").on(table.projectId, table.userId),
  projectIdx: index("project_idx").on(table.projectId),
  userIdx: index("user_idx").on(table.userId),
}));

// Enhanced tasks table
export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  assignedTo: int("assigned_to").references(() => users.id),
  status: varchar("status", { length: 20 }).default("open").$type<'open' | 'in_progress' | 'completed' | 'cancelled'>(),
  priority: varchar("priority", { length: 20 }).default("medium").$type<'low' | 'medium' | 'high' | 'urgent'>(),
  estimatedHours: decimal("estimated_hours", { precision: 5, scale: 2 }),
  dueDate: date("due_date"),
  isBillable: boolean("is_billable").default(true),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
  assignedToIdx: index("assigned_to_idx").on(table.assignedTo),
  statusIdx: index("status_idx").on(table.status),
}));

// Enhanced timesheets table with better tracking
export const timesheets = mysqlTable("timesheets", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().$type<'draft' | 'submitted' | 'approved' | 'rejected' | 'locked'>().default('draft'),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }).default("0.00"),
  billableHours: decimal("billable_hours", { precision: 5, scale: 2 }).default("0.00"),
  overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0.00"),
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  submittedAt: timestamp("submitted_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  userWeekIdx: uniqueIndex("user_week_idx").on(table.userId, table.weekStartDate),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  statusIdx: index("status_idx").on(table.status),
  weekIdx: index("week_idx").on(table.weekStartDate),
}));

// Enhanced timesheet entries table
export const timesheetEntries = mysqlTable("timesheet_entries", {
  id: int("id").primaryKey().autoincrement(),
  timesheetId: int("timesheet_id").references(() => timesheets.id, { onDelete: "cascade" }).notNull(),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  taskId: int("task_id").references(() => tasks.id),
  description: text("description"),
  entryDate: date("entry_date").notNull(),
  startTime: varchar("start_time", { length: 8 }), // HH:MM:SS format
  endTime: varchar("end_time", { length: 8 }), // HH:MM:SS format
  breakDuration: decimal("break_duration", { precision: 4, scale: 2 }).default("0.00"), // Break time in hours
  hours: decimal("hours", { precision: 4, scale: 2 }).default("0.00"),
  isBillable: boolean("is_billable").default(true),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }),
  location: varchar("location", { length: 255 }), // Work location
  isRemote: boolean("is_remote").default(false),
  tags: json("tags").default([]), // Tags for categorization
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  timesheetIdx: index("timesheet_idx").on(table.timesheetId),
  projectIdx: index("project_idx").on(table.projectId),
  taskIdx: index("task_idx").on(table.taskId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  dateIdx: index("date_idx").on(table.entryDate),
}));

// Time tracking sessions for real-time tracking
export const timeTrackingSessions = mysqlTable("time_tracking_sessions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  projectId: int("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  taskId: int("task_id").references(() => tasks.id),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: int("duration"), // Duration in seconds
  isActive: boolean("is_active").default(true),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  projectIdx: index("project_idx").on(table.projectId),
  tenantIdx: index("tenant_idx").on(table.tenantId),
  activeIdx: index("active_idx").on(table.isActive),
}));

// Approval workflows
export const approvalWorkflows = mysqlTable("approval_workflows", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  steps: json("steps").default([]), // Array of approval steps
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
}));

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  departments: many(departments),
  timesheets: many(timesheets),
  timesheetEntries: many(timesheetEntries),
  timeTrackingSessions: many(timeTrackingSessions),
  approvalWorkflows: many(approvalWorkflows),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  invitedBy: one(users, {
    fields: [users.invitedBy],
    references: [users.id],
    relationName: "inviter",
  }),
  invitees: many(users, {
    relationName: "inviter",
  }),
  timesheets: many(timesheets),
  approvedTimesheets: many(timesheets, {
    relationName: "approver",
  }),
  projectAssignments: many(projectAssignments),
  managedProjects: many(projects, {
    relationName: "manager",
  }),
  managedDepartments: many(departments, {
    relationName: "manager",
  }),
  assignedTasks: many(tasks, {
    relationName: "assignee",
  }),
  timeTrackingSessions: many(timeTrackingSessions),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  manager: one(users, {
    fields: [departments.managerId],
    references: [users.id],
    relationName: "manager",
  }),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  department: one(departments, {
    fields: [projects.departmentId],
    references: [departments.id],
  }),
  manager: one(users, {
    fields: [projects.managerId],
    references: [users.id],
    relationName: "manager",
  }),
  tasks: many(tasks),
  timesheetEntries: many(timesheetEntries),
  projectAssignments: many(projectAssignments),
  timeTrackingSessions: many(timeTrackingSessions),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, {
    fields: [projectAssignments.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectAssignments.userId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [projectAssignments.assignedBy],
    references: [users.id],
    relationName: "assigner",
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignee",
  }),
  timesheetEntries: many(timesheetEntries),
  timeTrackingSessions: many(timeTrackingSessions),
}));

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [timesheets.tenantId],
    references: [tenants.id],
  }),
  approver: one(users, {
    fields: [timesheets.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
  entries: many(timesheetEntries),
}));

export const timesheetEntriesRelations = relations(timesheetEntries, ({ one }) => ({
  timesheet: one(timesheets, {
    fields: [timesheetEntries.timesheetId],
    references: [timesheets.id],
  }),
  project: one(projects, {
    fields: [timesheetEntries.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [timesheetEntries.taskId],
    references: [tasks.id],
  }),
  tenant: one(tenants, {
    fields: [timesheetEntries.tenantId],
    references: [tenants.id],
  }),
}));

export const timeTrackingSessionsRelations = relations(timeTrackingSessions, ({ one }) => ({
  user: one(users, {
    fields: [timeTrackingSessions.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [timeTrackingSessions.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [timeTrackingSessions.taskId],
    references: [tasks.id],
  }),
  tenant: one(tenants, {
    fields: [timeTrackingSessions.tenantId],
    references: [tenants.id],
  }),
}));

export const approvalWorkflowsRelations = relations(approvalWorkflows, ({ one }) => ({
  tenant: one(tenants, {
    fields: [approvalWorkflows.tenantId],
    references: [tenants.id],
  }),
}));

// Zod schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
  assignedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimesheetSchema = createInsertSchema(timesheets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimesheetEntrySchema = createInsertSchema(timesheetEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimeTrackingSessionSchema = createInsertSchema(timeTrackingSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type InsertTimesheetEntry = z.infer<typeof insertTimesheetEntrySchema>;

export type TimeTrackingSession = typeof timeTrackingSessions.$inferSelect;
export type InsertTimeTrackingSession = z.infer<typeof insertTimeTrackingSessionSchema>;

export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;

// Extended types for API responses
export type UserWithTenant = User & { tenant: Tenant };
export type ProjectWithTasks = Project & { 
  tasks: Task[];
  department?: Department;
  manager?: User;
  projectAssignments?: (ProjectAssignment & { user: User })[];
};
export type TimesheetWithEntries = Timesheet & { 
  entries: (TimesheetEntry & { project: Project; task?: Task })[];
  user: User;
  tenant: Tenant;
  approver?: User;
};
export type DepartmentWithUsers = Department & {
  manager?: User;
  projects: Project[];
};

// Multi-tenant context type
export type TenantContext = {
  tenantId: number;
  tenant: Tenant;
  user: User;
};