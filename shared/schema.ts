import { pgTable, text, serial, integer, boolean, timestamp, decimal, date, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Tenants table for multi-tenancy
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Users table with role-based access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().$type<'user' | 'manager' | 'admin'>(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  clientName: text("client_name"),
  color: text("color").default("#1976D2"),
  isActive: boolean("is_active").default(true),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Timesheets table
export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  weekStartDate: date("week_start_date").notNull(),
  status: text("status").notNull().$type<'draft' | 'submitted' | 'approved' | 'rejected'>().default('draft'),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }).default("0.00"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Timesheet entries table
export const timesheetEntries = pgTable("timesheet_entries", {
  id: serial("id").primaryKey(),
  timesheetId: integer("timesheet_id").references(() => timesheets.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  description: text("description"),
  monday: decimal("monday", { precision: 4, scale: 2 }).default("0.00"),
  tuesday: decimal("tuesday", { precision: 4, scale: 2 }).default("0.00"),
  wednesday: decimal("wednesday", { precision: 4, scale: 2 }).default("0.00"),
  thursday: decimal("thursday", { precision: 4, scale: 2 }).default("0.00"),
  friday: decimal("friday", { precision: 4, scale: 2 }).default("0.00"),
  saturday: decimal("saturday", { precision: 4, scale: 2 }).default("0.00"),
  sunday: decimal("sunday", { precision: 4, scale: 2 }).default("0.00"),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  projects: many(projects),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  timesheets: many(timesheets),
  approvedTimesheets: many(timesheets, {
    relationName: "approver",
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [projects.tenantId],
    references: [tenants.id],
  }),
  tasks: many(tasks),
  timesheetEntries: many(timesheetEntries),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  timesheetEntries: many(timesheetEntries),
}));

export const timesheetsRelations = relations(timesheets, ({ one, many }) => ({
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
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
}));

// Zod schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
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

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Timesheet = typeof timesheets.$inferSelect;
export type InsertTimesheet = z.infer<typeof insertTimesheetSchema>;

export type TimesheetEntry = typeof timesheetEntries.$inferSelect;
export type InsertTimesheetEntry = z.infer<typeof insertTimesheetEntrySchema>;

// Extended types for API responses
export type UserWithTenant = User & { tenant: Tenant };
export type ProjectWithTasks = Project & { tasks: Task[] };
export type TimesheetWithEntries = Timesheet & { 
  entries: (TimesheetEntry & { project: Project; task: Task })[];
  user: User;
  approver?: User;
};
