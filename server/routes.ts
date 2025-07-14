import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertTaskSchema, 
  insertTimesheetSchema, 
  insertTimesheetEntrySchema,
  insertTenantSchema,
  insertDepartmentSchema,
  insertProjectAssignmentSchema,
  insertTimeTrackingSessionSchema
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

  // Enhanced middleware to ensure tenant isolation and context
  const requireTenant = (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    // Ensure user belongs to the tenant context
    if (req.tenantId && req.user.tenantId !== req.tenantId) {
      return res.status(403).json({ message: "Tenant access denied" });
    }
    
    req.tenantId = req.user.tenantId;
    next();
  };

  // Middleware to check project access
  const requireProjectAccess = async (req: any, res: any, next: any) => {
    try {
      const projectId = parseInt(req.params.projectId || req.body.projectId);
      if (!projectId) {
        return res.status(400).json({ message: "Project ID required" });
      }

      const project = await storage.getProject(projectId);
      if (!project || project.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if user has access to the project
      if (!['admin', 'owner', 'manager'].includes(req.user.role)) {
        const assignments = await storage.getUserProjectAssignments(req.user.id);
        const hasAccess = assignments.some(a => a.projectId === projectId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Project access denied" });
        }
      }

      req.project = project;
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify project access" });
    }
  };

  // Tenant routes
  app.get("/api/tenant", requireAuth, requireTenant, async (req, res) => {
    try {
      const tenant = await storage.getTenant(req.tenantId);
      const stats = await storage.getTenantStats(req.tenantId);
      
      res.json({
        ...tenant,
        stats
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get tenant information" });
    }
  });

  app.put("/api/tenant", requireAuth, requireRole(['admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const { name, settings, plan, maxUsers } = req.body;
      const updatedTenant = await storage.updateTenant(req.tenantId, {
        name,
        settings,
        plan,
        maxUsers
      });
      res.json(updatedTenant);
    } catch (error) {
      res.status(400).json({ message: "Failed to update tenant" });
    }
  });

  // Department routes
  app.get("/api/departments", requireAuth, requireTenant, async (req, res) => {
    try {
      const departments = await storage.getDepartmentsByTenant(req.tenantId);
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get departments" });
    }
  });

  app.post("/api/departments", requireAuth, requireRole(['admin', 'owner', 'manager']), requireTenant, async (req, res) => {
    try {
      const validatedData = insertDepartmentSchema.parse({ ...req.body, tenantId: req.tenantId });
      const department = await storage.createDepartment(validatedData);
      res.status(201).json(department);
    } catch (error) {
      res.status(400).json({ message: "Invalid department data" });
    }
  });

  app.put("/api/departments/:id", requireAuth, requireRole(['admin', 'owner', 'manager']), requireTenant, async (req, res) => {
    try {
      const departmentId = parseInt(req.params.id);
      const department = await storage.getDepartment(departmentId);
      
      if (!department || department.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Department not found" });
      }

      const updatedDepartment = await storage.updateDepartment(departmentId, req.body);
      res.json(updatedDepartment);
    } catch (error) {
      res.status(400).json({ message: "Failed to update department" });
    }
  });

  // User management routes
  app.get("/api/users", requireAuth, requireRole(['admin', 'owner', 'manager']), requireTenant, async (req, res) => {
    try {
      const users = await storage.getUsersByTenant(req.tenantId);
      // Remove passwords from response
      const sanitizedUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.put("/api/users/:id", requireAuth, requireRole(['admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user || user.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent changing owner role unless you're an owner
      if (user.role === 'owner' && req.user.role !== 'owner') {
        return res.status(403).json({ message: "Cannot modify owner account" });
      }

      const { password, tenantId, ...updateData } = req.body;
      const updatedUser = await storage.updateUser(userId, updateData);
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requireRole(['admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user || user.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role === 'owner') {
        return res.status(403).json({ message: "Cannot delete owner account" });
      }

      if (user.id === req.user.id) {
        return res.status(403).json({ message: "Cannot delete your own account" });
      }

      const deactivated = await storage.deactivateUser(userId);
      if (deactivated) {
        res.json({ message: "User deactivated successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate user" });
    }
  });

  // Project routes with enhanced access control
  app.get("/api/projects", requireAuth, requireTenant, async (req, res) => {
    try {
      let projects;
      
      if (['admin', 'owner', 'manager'].includes(req.user.role)) {
        // Managers and above can see all tenant projects
        projects = await storage.getProjectsByTenant(req.tenantId);
      } else {
        // Regular users only see projects they're assigned to
        projects = await storage.getProjectsByUser(req.user.id, req.tenantId);
      }
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to get projects" });
    }
  });

  app.post("/api/projects", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse({ ...req.body, tenantId: req.tenantId });
      const project = await storage.createProject(validatedData);
      
      // Auto-assign creator to the project
      await storage.assignUserToProject({
        projectId: project.id,
        userId: req.user.id,
        role: 'lead',
        canSubmitTime: true,
        canViewReports: true,
        assignedBy: req.user.id
      });
      
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.get("/api/projects/:id", requireAuth, requireTenant, requireProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      const assignments = await storage.getProjectAssignments(projectId);
      
      res.json({
        ...project,
        assignments
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get project" });
    }
  });

  app.put("/api/projects/:id", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project || project.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(400).json({ message: "Failed to update project" });
    }
  });

  // Project assignment routes
  app.post("/api/projects/:projectId/assignments", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, requireProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const { userId, role = 'member', hourlyRate, canSubmitTime = true, canViewReports = false } = req.body;
      
      // Verify user belongs to same tenant
      const user = await storage.getUser(userId);
      if (!user || user.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "User not found" });
      }

      const assignment = await storage.assignUserToProject({
        projectId,
        userId,
        role,
        hourlyRate,
        canSubmitTime,
        canViewReports,
        assignedBy: req.user.id
      });
      
      res.status(201).json(assignment);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign user to project" });
    }
  });

  app.delete("/api/projects/:projectId/assignments/:userId", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, requireProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      
      const removed = await storage.removeUserFromProject(projectId, userId);
      if (removed) {
        res.json({ message: "User removed from project successfully" });
      } else {
        res.status(404).json({ message: "Assignment not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user from project" });
    }
  });

  // Task routes
  app.get("/api/projects/:projectId/tasks", requireAuth, requireTenant, requireProjectAccess, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tasks = await storage.getTasksByProject(projectId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tasks" });
    }
  });

  app.get("/api/tasks/assigned", requireAuth, requireTenant, async (req, res) => {
    try {
      const tasks = await storage.getTasksByUser(req.user.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assigned tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      
      // Verify project belongs to tenant
      const project = await storage.getProject(validatedData.projectId);
      if (!project || project.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  // Timesheet routes with enhanced tenant isolation
  app.get("/api/timesheets", requireAuth, requireTenant, async (req, res) => {
    try {
      const timesheets = await storage.getTimesheetsByUser(req.user.id, 10);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get timesheets" });
    }
  });

  app.get("/api/timesheets/week/:date", requireAuth, requireTenant, async (req, res) => {
    try {
      const weekStartDate = req.params.date;
      let timesheet = await storage.getTimesheetForWeek(req.user.id, weekStartDate);
      
      if (!timesheet) {
        // Create a new timesheet for the week
        const startDate = new Date(weekStartDate);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        const newTimesheet = await storage.createTimesheet({
          userId: req.user.id,
          weekStartDate,
          weekEndDate: endDate.toISOString().split('T')[0],
          status: 'draft',
          totalHours: "0.00",
          billableHours: "0.00",
          overtimeHours: "0.00",
          tenantId: req.tenantId
        });
        timesheet = await storage.getTimesheet(newTimesheet.id);
      }
      
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: "Failed to get timesheet" });
    }
  });

  // Time tracking sessions
  app.get("/api/time-tracking/active", requireAuth, requireTenant, async (req, res) => {
    try {
      const activeSession = await storage.getActiveSession(req.user.id);
      res.json(activeSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active session" });
    }
  });

  app.post("/api/time-tracking/start", requireAuth, requireTenant, async (req, res) => {
    try {
      // End any existing active session
      const existingSession = await storage.getActiveSession(req.user.id);
      if (existingSession) {
        await storage.endTimeTrackingSession(existingSession.id);
      }

      const { projectId, taskId, description } = req.body;
      
      // Verify project access
      const project = await storage.getProject(projectId);
      if (!project || project.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const session = await storage.createTimeTrackingSession({
        userId: req.user.id,
        projectId,
        taskId,
        description,
        startTime: new Date(),
        tenantId: req.tenantId
      });
      
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ message: "Failed to start time tracking" });
    }
  });

  app.post("/api/time-tracking/:id/stop", requireAuth, requireTenant, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.id);
      const session = await storage.endTimeTrackingSession(sessionId);
      res.json(session);
    } catch (error) {
      res.status(400).json({ message: "Failed to stop time tracking" });
    }
  });

  // Timesheet entry routes with tenant isolation
  app.post("/api/timesheet-entries", requireAuth, requireTenant, async (req, res) => {
    try {
      const validatedData = insertTimesheetEntrySchema.parse({ 
        ...req.body, 
        tenantId: req.tenantId 
      });
      
      // Verify timesheet belongs to user and tenant
      const timesheet = await storage.getTimesheet(validatedData.timesheetId);
      if (!timesheet || timesheet.userId !== req.user.id || timesheet.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      // Verify project belongs to tenant
      const project = await storage.getProject(validatedData.projectId);
      if (!project || project.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const entry = await storage.createTimesheetEntry(validatedData);
      res.status(201).json(entry);
    } catch (error) {
      res.status(400).json({ message: "Invalid timesheet entry data" });
    }
  });

  app.put("/api/timesheet-entries/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const entry = await storage.getTimesheetEntry(entryId);
      
      if (!entry || entry.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      // Verify entry belongs to user's timesheet
      const timesheet = await storage.getTimesheet(entry.timesheetId);
      if (!timesheet || timesheet.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedEntry = await storage.updateTimesheetEntry(entryId, req.body);
      res.json(updatedEntry);
    } catch (error) {
      res.status(400).json({ message: "Failed to update timesheet entry" });
    }
  });

  app.delete("/api/timesheet-entries/:id", requireAuth, requireTenant, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const entry = await storage.getTimesheetEntry(entryId);
      
      if (!entry || entry.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Entry not found" });
      }

      // Verify entry belongs to user's timesheet
      const timesheet = await storage.getTimesheet(entry.timesheetId);
      if (!timesheet || timesheet.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteTimesheetEntry(entryId);
      if (deleted) {
        res.json({ message: "Timesheet entry deleted successfully" });
      } else {
        res.status(404).json({ message: "Entry not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete timesheet entry" });
    }
  });

  // Timesheet submission and approval
  app.post("/api/timesheets/:id/submit", requireAuth, requireTenant, async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet || timesheet.userId !== req.user.id || timesheet.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      if (timesheet.status !== 'draft') {
        return res.status(400).json({ message: "Only draft timesheets can be submitted" });
      }

      const updatedTimesheet = await storage.updateTimesheet(timesheetId, {
        status: 'submitted',
        submittedAt: new Date()
      });
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(400).json({ message: "Failed to submit timesheet" });
    }
  });

  app.post("/api/timesheets/:id/approve", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet || timesheet.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      if (timesheet.status !== 'submitted') {
        return res.status(400).json({ message: "Only submitted timesheets can be approved" });
      }

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

  app.post("/api/timesheets/:id/reject", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const timesheetId = parseInt(req.params.id);
      const { rejectionReason } = req.body;
      const timesheet = await storage.getTimesheet(timesheetId);
      
      if (!timesheet || timesheet.tenantId !== req.tenantId) {
        return res.status(404).json({ message: "Timesheet not found" });
      }

      if (timesheet.status !== 'submitted') {
        return res.status(400).json({ message: "Only submitted timesheets can be rejected" });
      }

      const updatedTimesheet = await storage.updateTimesheet(timesheetId, {
        status: 'rejected',
        approvedBy: req.user.id,
        approvedAt: new Date(),
        rejectionReason: rejectionReason || 'No reason provided'
      });
      res.json(updatedTimesheet);
    } catch (error) {
      res.status(400).json({ message: "Failed to reject timesheet" });
    }
  });

  // Approval routes (Manager/Admin only) with tenant isolation
  app.get("/api/approvals", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const pendingTimesheets = await storage.getTimesheetsByTenant(req.tenantId, 'submitted');
      res.json(pendingTimesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pending approvals" });
    }
  });

  // Reports routes (Manager/Admin only) with enhanced tenant analytics
  app.get("/api/reports/timesheets", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const { status, startDate, endDate, userId, projectId } = req.query;
      let timesheets = await storage.getTimesheetsByTenant(req.tenantId, status as string);
      
      // Apply additional filters if provided
      if (startDate || endDate || userId || projectId) {
        timesheets = timesheets.filter(timesheet => {
          if (startDate && timesheet.weekStartDate < startDate) return false;
          if (endDate && timesheet.weekStartDate > endDate) return false;
          if (userId && timesheet.userId !== parseInt(userId as string)) return false;
          if (projectId) {
            const hasProject = timesheet.entries.some(entry => entry.projectId === parseInt(projectId as string));
            if (!hasProject) return false;
          }
          return true;
        });
      }
      
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get timesheet reports" });
    }
  });

  app.get("/api/reports/analytics", requireAuth, requireRole(['manager', 'admin', 'owner']), requireTenant, async (req, res) => {
    try {
      const { startDate, endDate, userId, projectId } = req.query;
      
      if (userId) {
        const userStats = await storage.getUserTimeStats(
          parseInt(userId as string),
          startDate as string || '1970-01-01',
          endDate as string || new Date().toISOString().split('T')[0]
        );
        res.json({ type: 'user', stats: userStats });
      } else if (projectId) {
        const projectStats = await storage.getProjectTimeStats(
          parseInt(projectId as string),
          startDate as string || '1970-01-01',
          endDate as string || new Date().toISOString().split('T')[0]
        );
        res.json({ type: 'project', stats: projectStats });
      } else {
        const tenantStats = await storage.getTenantStats(req.tenantId);
        res.json({ type: 'tenant', stats: tenantStats });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Dashboard routes with tenant-specific data
  app.get("/api/dashboard/stats", requireAuth, requireTenant, async (req, res) => {
    try {
      const currentDate = new Date();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      const monthEndStr = currentDate.toISOString().split('T')[0];

      const weekStats = await storage.getUserTimeStats(req.user.id, weekStartStr, monthEndStr);
      const monthStats = await storage.getUserTimeStats(req.user.id, monthStartStr, monthEndStr);
      
      const userProjects = ['admin', 'owner', 'manager'].includes(req.user.role) 
        ? await storage.getProjectsByTenant(req.tenantId)
        : await storage.getProjectsByUser(req.user.id, req.tenantId);
      
      const recentTimesheets = await storage.getTimesheetsByUser(req.user.id, 5);

      res.json({
        weekStats,
        monthStats,
        projectCount: userProjects.length,
        recentTimesheets: recentTimesheets.slice(0, 3)
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      tenant: req.tenantSlug || 'none'
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}