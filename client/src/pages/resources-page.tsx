import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Folder, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema, insertTaskSchema } from "@shared/schema";
import { z } from "zod";

const projectFormSchema = insertProjectSchema.omit({ tenantId: true });
const taskFormSchema = insertTaskSchema;

type ProjectFormData = z.infer<typeof projectFormSchema>;
type TaskFormData = z.infer<typeof taskFormSchema>;

export default function ResourcesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: tasks } = useQuery({
    queryKey: ["/api/projects", selectedProject, "tasks"],
    enabled: !!selectedProject,
  });

  const projectForm = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      clientName: "",
      color: "#1976D2",
      isActive: true,
    },
  });

  const taskForm = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: "",
      description: "",
      projectId: selectedProject || 0,
      isActive: true,
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      const res = await apiRequest("POST", "/api/projects", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setProjectDialogOpen(false);
      projectForm.reset();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProject, "tasks"] });
      setTaskDialogOpen(false);
      taskForm.reset();
      toast({
        title: "Success",
        description: "Task created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = (data: ProjectFormData) => {
    createProjectMutation.mutate(data);
  };

  const handleCreateTask = (data: TaskFormData) => {
    createTaskMutation.mutate({ ...data, projectId: selectedProject! });
  };

  const canManageResources = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        <Header 
          title="Resources" 
          subtitle="Manage projects and tasks"
        >
          {canManageResources && (
            <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                </DialogHeader>
                <form onSubmit={projectForm.handleSubmit(handleCreateProject)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter project name"
                      {...projectForm.register("name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name</Label>
                    <Input
                      id="clientName"
                      placeholder="Enter client name"
                      {...projectForm.register("clientName")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Enter project description"
                      {...projectForm.register("description")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      {...projectForm.register("color")}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setProjectDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createProjectMutation.isPending}>
                      {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </Header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Folder className="w-5 h-5" />
                <span>Projects</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects?.map((project: any) => (
                    <div 
                      key={project.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedProject === project.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedProject(project.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: project.color }}
                          />
                          <div>
                            <h4 className="font-medium">{project.name}</h4>
                            {project.clientName && (
                              <p className="text-sm text-muted-foreground">{project.clientName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={project.isActive ? "default" : "secondary"}>
                            {project.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {project.tasks?.length || 0} tasks
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {projects?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No projects found. Create your first project to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Tasks</span>
                {selectedProject && canManageResources && (
                  <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={taskForm.handleSubmit(handleCreateTask)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="taskName">Task Name</Label>
                          <Input
                            id="taskName"
                            placeholder="Enter task name"
                            {...taskForm.register("name")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taskDescription">Description</Label>
                          <Textarea
                            id="taskDescription"
                            placeholder="Enter task description"
                            {...taskForm.register("description")}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createTaskMutation.isPending}>
                            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedProject ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a project to view its tasks
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks?.map((task: any) => (
                    <div key={task.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{task.name}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                        <Badge variant={task.isActive ? "default" : "secondary"}>
                          {task.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {tasks?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No tasks found for this project. Add tasks to get started.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
