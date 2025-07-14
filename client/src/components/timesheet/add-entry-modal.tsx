import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X } from "lucide-react";

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheetId: number;
  projects: any[];
  onSuccess: () => void;
}

export function AddEntryModal({ isOpen, onClose, timesheetId, projects, onSuccess }: AddEntryModalProps) {
  const { toast } = useToast();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [description, setDescription] = useState("");

  const { data: tasks } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "tasks"],
    enabled: !!selectedProjectId,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/timesheet-entries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/week"] });
      toast({
        title: "Success",
        description: "Entry added successfully",
      });
      handleClose();
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setSelectedProjectId("");
    setSelectedTaskId("");
    setDescription("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId || !selectedTaskId) {
      toast({
        title: "Error",
        description: "Please select a project and task",
        variant: "destructive",
      });
      return;
    }

    createEntryMutation.mutate({
      timesheetId,
      projectId: parseInt(selectedProjectId),
      taskId: parseInt(selectedTaskId),
      description,
      monday: "0.00",
      tuesday: "0.00",
      wednesday: "0.00",
      thursday: "0.00",
      friday: "0.00",
      saturday: "0.00",
      sunday: "0.00",
      totalHours: "0.00",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add Time Entry</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-auto p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      <span>{project.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="task">Task</Label>
            <Select 
              value={selectedTaskId} 
              onValueChange={setSelectedTaskId}
              disabled={!selectedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks?.map((task: any) => (
                  <SelectItem key={task.id} value={task.id.toString()}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of work done..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createEntryMutation.isPending || !selectedProjectId || !selectedTaskId}
            >
              {createEntryMutation.isPending ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
