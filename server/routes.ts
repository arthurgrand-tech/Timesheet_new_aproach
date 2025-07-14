import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertTaskSchema, 
  insertTimesheetSchema, 
  insertTimesheetEntrySchema,
  insertTenantSchema
} from "@shared/schema";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Middleware to check role permissions
  const requireRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    };
  };

  // Middleware to ensure tenant isolation
  const requireTenant = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    req.tenantId = req.user.tenantId;
    next();
  };

  // Tenant routes (Admin only)
  app.get("/api/tenants", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.user.tenantId);
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tenant" });
    }
  });

  app.post("/api/tenants", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const validatedData = insertTenantSchema.parse(req.body);
      const tenant = await storage.createTenant(validatedData);
      res.status(201).json(tenant);
    } catch (error) {
      res.status(400).json({ message: "Invalid tenant data" });
    }
  });

  // User management routes (Admin only)
  app.get("/api/users", requireAuth, requireRole(['admin']), requireTenant, async (req, res) => {
    try {
      const users = await storage.getUsersByTenant(req.tenantId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole(['admin']), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updatedUser = await storage.updateUser(userId, req.body);
      res.json(updatedUser);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  // Project routes
  app.get("/api/projects", requireAuth, requireTenant, async (req, res) => {
    try {
      const projects = await storage.getProjectsByTenant(req.tenantId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  app.post("/api/projects", requireAuth, requireRole(['manager', 'admin']), requireTenant, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse({ ...req.body, tenantId: req.tenantId });
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.put("/api/projects/:id", requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(400).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const deleted = await storage.deleteProject(projectId);
      if (deleted) {
        res.json({ message: "Project deleted successfully" });
      } else {
        res.status(404).json({ message: "Project not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Task routes
  app.get("/api/projects/:projectId/tasks", requireAuth, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getTasksByProject(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const updatedTask = await storage.updateTask(taskId, req.body);
      res.json(updatedTask);
    } catch (error) {
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const deleted = await storage.deleteTask(taskId);
      if (deleted) {
        res.json({ message: "Task deleted successfully" });
      } else {
        res.status(404).json({ message: "Task not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const timesheets = await storage.getTimesheetsByUser(req.user.id, 10);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get timesheets" });
    }
  });

  app.get("/api/timesheets/week/:date", requireAuth, async (req, res) => {
    try {
      const weekStartDate = req.params.date;
      let timesheet = await storage.getTimesheetForWeek(req.user.id, weekStartDate);
      
      if (!timesheet) {
        // Create a new timesheet for the week
        const newTimesheet = await storage.createTimesheet({
          userId: req.user.id,
          weekStartDate,
          status: 'draft',
          totalHours: "0.00"
        });
        timesheet = await storage.getTimesheet(newTimesheet.id);
      }
      
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to get timesheet" });
    }
  });

  app.post("/api/timesheets", requireAuth, async (req, res) => {
    try {
      const validatedData = insertTimesheetSchema.parse({ ...req.body, userId: req.user.id });
      const timesheet = await storage.createTimesheet(validatedData);
      res.status(201).json(timesheet);
    } catch (error) {
      res.status(400).json({ message: "Invalid timesheet data" });
    }
  });

  app.put("/api/timesheets/:id", requireAuth, async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, req.body);
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(400).json({ message: "Failed to update timesheet" });
    }
  });

  app.post("/api/timesheets/:id/submit", requireAuth, async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, {
        status: 'submitted',
        submittedAt: new Date()
      });
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(400).json({ message: "Failed to submit timesheet" });
    }
  });

  app.post("/api/timesheets/:id/approve", requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, {
        status: 'approved',
        approvedBy: req.user.id,
        approvedAt: new Date()
      });
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(400).json({ message: "Failed to approve timesheet" });
    }
  });

  app.post("/api/timesheets/:id/reject", requireAuth, requireRole(['manager', 'admin']), async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const updatedTimesheet = await storage.updateTimesheet(timesheetId, {
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date()
      });
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(400).json({ message: "Failed to reject timesheet" });
    }
  });

  // Timesheet entry routes
  app.post("/api/timesheet-entries", requireAuth, async (req, res) => {
    try {
      const validatedData = insertTimesheetEntrySchema.parse(req.body);
      const entry = await storage.createTimesheetEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid timesheet entry data" });
    }
  });

  app.put("/api/timesheet-entries/:id", requireAuth, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const updatedEntry = await storage.updateTimesheetEntry(entryId, req.body);
      res.json(updatedEntry);
    } catch (error) {
      res.status(400).json({ message: "Failed to update timesheet entry" });
    }
  });

  app.delete("/api/timesheet-entries/:id", requireAuth, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const deleted = await storage.deleteTimesheetEntry(entryId);
      if (deleted) {
        res.json({ message: "Timesheet entry deleted successfully" });
      } else {
        res.status(404).json({ message: "Timesheet entry not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete timesheet entry" });
    }
  });

  // Approval routes (Manager/Admin only)
  app.get("/api/approvals", requireAuth, requireRole(['manager', 'admin']), requireTenant, async (req, res) => {
    try {
      const pendingTimesheets = await storage.getTimesheetsByTenant(req.tenantId, 'submitted');
      res.json(pendingTimesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pending approvals" });
    }
  });

  // Reports routes (Manager/Admin only)
  app.get("/api/reports/timesheets", requireAuth, requireRole(['manager', 'admin']), requireTenant, async (req, res) => {
    try {
      const timesheets = await storage.getTimesheetsByTenant(req.tenantId);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get timesheet reports" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
