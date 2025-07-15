import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertProjectSchema, 
  insertTaskSchema, 
  insertTimesheetSchema, 
  insertTimesheetEntrySchema,
  insertOrganizationSchema,
  loginSchema
} from "@shared/schema";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    organizationId: number;
    role: string;
  };
}

// Middleware to verify JWT token
const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to check organization access
const checkOrganizationAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const organizationId = parseInt(req.params.organizationId) || req.user?.organizationId;
  
  if (!organizationId || req.user?.organizationId !== organizationId) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  next();
};

// Middleware to check role permissions
const checkRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, organizationId: user.organizationId, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      res.status(400).json({ message: 'Invalid request data' });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const organizationData = insertOrganizationSchema.parse(req.body.organization);
      const userData = insertUserSchema.parse(req.body.user);
      
      // Create organization first
      const organization = await storage.createOrganization(organizationData);
      
      // Create super admin user
      const user = await storage.createUser({
        ...userData,
        organizationId: organization.id,
        role: 'super_admin'
      });

      const token = jwt.sign(
        { id: user.id, organizationId: user.organizationId, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { ...user, password: undefined }, organization });
    } catch (error) {
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const stats = await storage.getDashboardStats(req.user!.organizationId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  app.get("/api/dashboard/recent-timesheets", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const timesheets = await storage.getTimesheetsByOrganization(req.user!.organizationId);
      res.json(timesheets.slice(0, 5)); // Get recent 5 timesheets
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch recent timesheets' });
    }
  });

  app.get("/api/dashboard/active-projects", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projects = await storage.getProjectsByOrganization(req.user!.organizationId);
      res.json(projects.filter(p => p.status === 'active').slice(0, 5));
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch active projects' });
    }
  });

  // User routes
  app.get("/api/users", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await storage.getUsersByOrganization(req.user!.organizationId);
      res.json(users.map(u => ({ ...u, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post("/api/users", authenticateToken, checkRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser({
        ...userData,
        organizationId: req.user!.organizationId
      });
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: 'Failed to create user' });
    }
  });

  app.put("/api/users/:id", authenticateToken, checkRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, userData);
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(400).json({ message: 'Failed to update user' });
    }
  });

  app.delete("/api/users/:id", authenticateToken, checkRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteUser(id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Project routes
  app.get("/api/projects", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projects = await storage.getProjectsByOrganization(req.user!.organizationId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch projects' });
    }
  });

  app.post("/api/projects", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...projectData,
        organizationId: req.user!.organizationId
      });
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create project' });
    }
  });

  app.put("/api/projects/:id", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const projectData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, projectData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update project' });
    }
  });

  app.delete("/api/projects/:id", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  // Task routes
  app.get("/api/tasks", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tasks = await storage.getTasksByOrganization(req.user!.organizationId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  });

  app.post("/api/tasks", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask({
        ...taskData,
        organizationId: req.user!.organizationId
      });
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create task' });
    }
  });

  app.put("/api/tasks/:id", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update task' });
    }
  });

  app.delete("/api/tasks/:id", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete task' });
    }
  });

  // Timesheet routes
  app.get("/api/timesheets", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const timesheets = req.user?.role === 'employee' 
        ? await storage.getTimesheetsByUser(req.user.id)
        : await storage.getTimesheetsByOrganization(req.user!.organizationId);
      res.json(timesheets);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch timesheets' });
    }
  });

  app.get("/api/timesheets/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const timesheet = await storage.getTimesheetWithEntries(id);
      res.json(timesheet);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch timesheet' });
    }
  });

  app.post("/api/timesheets", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const timesheetData = insertTimesheetSchema.parse(req.body);
      const timesheet = await storage.createTimesheet({
        ...timesheetData,
        organizationId: req.user!.organizationId,
        userId: req.user!.id
      });
      res.json(timesheet);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create timesheet' });
    }
  });

  app.put("/api/timesheets/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const timesheetData = insertTimesheetSchema.partial().parse(req.body);
      const timesheet = await storage.updateTimesheet(id, timesheetData);
      res.json(timesheet);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update timesheet' });
    }
  });

  app.put("/api/timesheets/:id/approve", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const timesheet = await storage.updateTimesheet(id, {
        status: 'approved',
        approvedBy: req.user!.id,
        approvedAt: new Date()
      });
      res.json(timesheet);
    } catch (error) {
      res.status(400).json({ message: 'Failed to approve timesheet' });
    }
  });

  app.put("/api/timesheets/:id/reject", authenticateToken, checkRole(['supervisor', 'super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const timesheet = await storage.updateTimesheet(id, {
        status: 'rejected',
        approvedBy: req.user!.id,
        approvedAt: new Date()
      });
      res.json(timesheet);
    } catch (error) {
      res.status(400).json({ message: 'Failed to reject timesheet' });
    }
  });

  // Timesheet Entry routes
  app.post("/api/timesheet-entries", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const entryData = insertTimesheetEntrySchema.parse(req.body);
      const entry = await storage.createTimesheetEntry({
        ...entryData,
        organizationId: req.user!.organizationId
      });
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: 'Failed to create timesheet entry' });
    }
  });

  app.put("/api/timesheet-entries/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const entryData = insertTimesheetEntrySchema.partial().parse(req.body);
      const entry = await storage.updateTimesheetEntry(id, entryData);
      res.json(entry);
    } catch (error) {
      res.status(400).json({ message: 'Failed to update timesheet entry' });
    }
  });

  // Audit Log routes
  app.get("/api/audit-logs", authenticateToken, checkRole(['super_admin']), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const auditLogs = await storage.getAuditLogsByOrganization(req.user!.organizationId);
      res.json(auditLogs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
