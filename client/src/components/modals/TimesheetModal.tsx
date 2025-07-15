import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth';

interface TimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheetId?: number;
}

interface TimesheetEntry {
  id?: number;
  projectId: number;
  taskId: number;
  projectName: string;
  taskName: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  total: number;
}

export const TimesheetModal = ({ isOpen, onClose, timesheetId }: TimesheetModalProps) => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [comments, setComments] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: isOpen,
  });

  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: isOpen,
  });

  const { data: timesheet } = useQuery({
    queryKey: ['/api/timesheets', timesheetId],
    enabled: isOpen && !!timesheetId,
  });

  const saveTimesheetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save timesheet');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Timesheet saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
      onClose();
    },
    onError: () => {
      toast({ title: 'Failed to save timesheet', variant: 'destructive' });
    },
  });

  const addEntry = () => {
    const newEntry: TimesheetEntry = {
      projectId: 0,
      taskId: 0,
      projectName: '',
      taskName: '',
      monday: '0',
      tuesday: '0',
      wednesday: '0',
      thursday: '0',
      friday: '0',
      saturday: '0',
      sunday: '0',
      total: 0,
    };
    setEntries([...entries, newEntry]);
  };

  const updateEntry = (index: number, field: keyof TimesheetEntry, value: string | number) => {
    const updatedEntries = [...entries];
    updatedEntries[index] = { ...updatedEntries[index], [field]: value };
    
    if (field !== 'total' && field !== 'projectName' && field !== 'taskName') {
      // Recalculate total for time entries
      const timeFields = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const total = timeFields.reduce((sum, day) => {
        return sum + parseFloat(updatedEntries[index][day as keyof TimesheetEntry] as string || '0');
      }, 0);
      updatedEntries[index].total = total;
    }
    
    setEntries(updatedEntries);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const calculateDayTotal = (day: string) => {
    return entries.reduce((sum, entry) => {
      return sum + parseFloat(entry[day as keyof TimesheetEntry] as string || '0');
    }, 0);
  };

  const calculateGrandTotal = () => {
    return entries.reduce((sum, entry) => sum + entry.total, 0);
  };

  const handleSubmit = () => {
    const timesheetData = {
      weekEnding: new Date().toISOString().split('T')[0], // Today's date, should be calculated properly
      status: 'submitted',
      totalHours: calculateGrandTotal(),
      comments,
      entries: entries.map(entry => ({
        projectId: entry.projectId,
        taskId: entry.taskId,
        monday: entry.monday,
        tuesday: entry.tuesday,
        wednesday: entry.wednesday,
        thursday: entry.thursday,
        friday: entry.friday,
        saturday: entry.saturday,
        sunday: entry.sunday,
        totalHours: entry.total,
      })),
    };
    
    saveTimesheetMutation.mutate(timesheetData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-6xl">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Weekly Timesheet</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-muted-foreground mt-2">
            Week ending: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="p-6">
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Time Entries</h3>
            <Button onClick={addEntry} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Entry
            </Button>
          </div>

          {/* Timesheet Grid */}
          <div className="overflow-x-auto">
            <table className="timesheet-grid w-full">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left font-semibold min-w-[200px]">Project/Task</th>
                  <th className="text-center font-semibold min-w-[80px]">Mon</th>
                  <th className="text-center font-semibold min-w-[80px]">Tue</th>
                  <th className="text-center font-semibold min-w-[80px]">Wed</th>
                  <th className="text-center font-semibold min-w-[80px]">Thu</th>
                  <th className="text-center font-semibold min-w-[80px]">Fri</th>
                  <th className="text-center font-semibold min-w-[80px]">Sat</th>
                  <th className="text-center font-semibold min-w-[80px]">Sun</th>
                  <th className="text-center font-semibold min-w-[80px]">Total</th>
                  <th className="text-center font-semibold min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="table-hover">
                    <td className="p-2">
                      <div className="space-y-2">
                        <select
                          value={entry.projectId}
                          onChange={(e) => {
                            const projectId = parseInt(e.target.value);
                            const project = projects?.find((p: any) => p.id === projectId);
                            updateEntry(index, 'projectId', projectId);
                            updateEntry(index, 'projectName', project?.name || '');
                          }}
                          className="form-select text-sm"
                        >
                          <option value={0}>Select Project</option>
                          {projects?.map((project: any) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={entry.taskId}
                          onChange={(e) => {
                            const taskId = parseInt(e.target.value);
                            const task = tasks?.find((t: any) => t.id === taskId);
                            updateEntry(index, 'taskId', taskId);
                            updateEntry(index, 'taskName', task?.name || '');
                          }}
                          className="form-select text-sm"
                        >
                          <option value={0}>Select Task</option>
                          {tasks?.filter((task: any) => task.projectId === entry.projectId).map((task: any) => (
                            <option key={task.id} value={task.id}>
                              {task.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                      <td key={day} className="p-2">
                        <Input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={entry[day as keyof TimesheetEntry] as string}
                          onChange={(e) => updateEntry(index, day as keyof TimesheetEntry, e.target.value)}
                          className="text-center"
                        />
                      </td>
                    ))}
                    <td className="text-center font-semibold">
                      {entry.total.toFixed(1)}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => removeEntry(index)}
                        className="action-button text-destructive hover:text-destructive/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                
                {/* Total Row */}
                <tr className="bg-muted font-bold">
                  <td>Total Hours</td>
                  <td className="text-center">{calculateDayTotal('monday').toFixed(1)}</td>
                  <td className="text-center">{calculateDayTotal('tuesday').toFixed(1)}</td>
                  <td className="text-center">{calculateDayTotal('wednesday').toFixed(1)}</td>
                  <td className="text-center">{calculateDayTotal('thursday').toFixed(1)}</td>
                  <td className="text-center">{calculateDayTotal('friday').toFixed(1)}</td>
                  <td className="text-center">{calculateDayTotal('saturday').toFixed(1)}</td>
                  <td className="text-center">{calculateDayTotal('sunday').toFixed(1)}</td>
                  <td className="text-center">{calculateGrandTotal().toFixed(1)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Comments Section */}
          <div className="mt-6">
            <label className="form-label mb-2">Comments</label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Add any comments about this week's work..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Save as draft logic
                handleSubmit();
              }}
              disabled={saveTimesheetMutation.isPending}
            >
              Save Draft
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={saveTimesheetMutation.isPending}
            >
              {saveTimesheetMutation.isPending ? 'Submitting...' : 'Submit Timesheet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
