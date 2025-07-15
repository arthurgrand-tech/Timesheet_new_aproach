import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Search, Edit, Trash2, CheckSquare, FolderOpen, User, Clock } from 'lucide-react';

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/tasks'],
  });

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    enabled: user?.role === 'supervisor' || user?.role === 'super_admin',
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(taskData),
      });
      if (!response.ok) throw new Error('Failed to create task');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Task created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setShowCreateModal(false);
    },
    onError: () => {
      toast({ title: 'Failed to create task', variant: 'destructive' });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Task updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setEditingTask(null);
    },
    onError: () => {
      toast({ title: 'Failed to update task', variant: 'destructive' });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete task');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Task deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
    onError: () => {
      toast({ title: 'Failed to delete task', variant: 'destructive' });
    },
  });

  const filteredTasks = tasks?.filter((task: any) => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed': return 'badge success';
      case 'in_progress': return 'badge primary';
      case 'pending': return 'badge warning';
      default: return 'badge';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high': return 'badge error';
      case 'medium': return 'badge warning';
      case 'low': return 'badge';
      default: return 'badge';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const canManageTasks = user?.role === 'supervisor' || user?.role === 'super_admin';

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex-between">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">Manage project tasks and assignments</p>
        </div>
        {canManageTasks && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Task Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="responsive-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th className="mobile-hidden">Project</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th className="mobile-hidden">Assigned To</th>
                  <th className="mobile-hidden">Est. Hours</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No tasks found
                    </td>
                  </tr>
                ) : (
                  filteredTasks?.map((task: any) => {
                    const project = projects?.find((p: any) => p.id === task.projectId);
                    const assignedUser = users?.find((u: any) => u.id === task.assignedTo);
                    
                    return (
                      <tr key={task.id}>
                        <td>
                          <div className="flex items-center space-x-3">
                            <CheckSquare className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium text-foreground">{task.name}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="mobile-hidden">
                          <div className="flex items-center space-x-2">
                            <FolderOpen className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{project?.name || 'No Project'}</span>
                          </div>
                        </td>
                        <td>
                          <Badge className={getStatusBadgeClass(task.status)}>
                            {formatStatus(task.status)}
                          </Badge>
                        </td>
                        <td>
                          <Badge className={getPriorityBadgeClass(task.priority)}>
                            {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
                          </Badge>
                        </td>
                        <td className="mobile-hidden">
                          {assignedUser ? (
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {assignedUser.firstName} {assignedUser.lastName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          )}
                        </td>
                        <td className="mobile-hidden">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {task.estimatedHours ? `${task.estimatedHours}h` : 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {canManageTasks && (
                              <>
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="action-button text-primary hover:text-primary/80"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteTaskMutation.mutate(task.id)}
                                  className="action-button text-destructive hover:text-destructive/80"
                                  disabled={deleteTaskMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold text-foreground">
                  {tasks?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-foreground">
                  {tasks?.filter((t: any) => t.status === 'in_progress').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {tasks?.filter((t: any) => t.status === 'completed').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-foreground">
                  {tasks?.filter((t: any) => t.priority === 'high').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Task Modal */}
      {(showCreateModal || editingTask) && (
        <TaskModal
          task={editingTask}
          projects={projects}
          users={users}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTask(null);
          }}
          onSave={(data) => {
            if (editingTask) {
              updateTaskMutation.mutate({ id: editingTask.id, data });
            } else {
              createTaskMutation.mutate(data);
            }
          }}
          isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
        />
      )}
    </div>
  );
}

// Task Modal Component
function TaskModal({ 
  task, 
  projects, 
  users, 
  onClose, 
  onSave, 
  isLoading 
}: { 
  task?: any;
  projects?: any[];
  users?: any[];
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    projectId: task?.projectId || '',
    assignedTo: task?.assignedTo || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'pending',
    estimatedHours: task?.estimatedHours || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      projectId: formData.projectId ? parseInt(formData.projectId) : null,
      assignedTo: formData.assignedTo ? parseInt(formData.assignedTo) : null,
      estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
    };
    onSave(data);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="form-group">
            <label className="form-label">Task Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter task name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                className="form-select"
              >
                <option value="">Select Project</option>
                {projects?.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned To</label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="form-select"
              >
                <option value="">Unassigned</option>
                {users?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="form-select"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="form-select"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Hours</label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedHours: e.target.value }))}
                placeholder="0.0"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
