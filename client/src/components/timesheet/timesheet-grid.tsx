import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddEntryModal } from "./add-entry-modal";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TimesheetGridProps {
  timesheet: any;
  weekStartDate: string;
  onUpdate: () => void;
}

export function TimesheetGrid({ timesheet, weekStartDate, onUpdate }: TimesheetGridProps) {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ entryId, data }: { entryId: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/timesheet-entries/${entryId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/week", weekStartDate] });
      onUpdate();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: number) => {
      const res = await apiRequest("DELETE", `/api/timesheet-entries/${entryId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets/week", weekStartDate] });
      onUpdate();
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    },
  });

  const handleHoursChange = (entryId: number, day: string, value: string) => {
    const numValue = Math.max(0, Math.min(24, parseFloat(value) || 0));
    updateEntryMutation.mutate({
      entryId,
      data: { [day]: numValue.toString() }
    });
  };

  const handleDeleteEntry = (entryId: number) => {
    deleteEntryMutation.mutate(entryId);
  };

  const getWeekDates = () => {
    const start = new Date(weekStartDate);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const calculateDailyTotals = () => {
    const dailyTotals = days.map(() => 0);
    timesheet?.entries?.forEach((entry: any) => {
      days.forEach((day, index) => {
        dailyTotals[index] += parseFloat(entry[day] || 0);
      });
    });
    return dailyTotals;
  };

  const dailyTotals = calculateDailyTotals();
  const weeklyTotal = dailyTotals.reduce((sum, total) => sum + total, 0);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-foreground w-1/4">Project / Task</th>
              {dayNames.map((dayName, index) => (
                <th key={dayName} className="text-center py-3 px-2 font-medium text-foreground">
                  {dayName}
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {weekDates[index].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </th>
              ))}
              <th className="text-center py-3 px-2 font-medium text-foreground">Total</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {timesheet?.entries?.map((entry: any) => (
              <tr key={entry.id} className="border-b border-border hover:bg-muted/50">
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: entry.project?.color || '#1976D2' }}
                    />
                    <div>
                      <p className="font-medium text-sm text-foreground">{entry.project?.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.task?.name}</p>
                    </div>
                  </div>
                </td>
                {days.map((day) => (
                  <td key={day} className="py-3 px-2">
                    <Input
                      type="number"
                      className="w-16 h-8 text-center"
                      value={entry[day] || "0"}
                      onChange={(e) => handleHoursChange(entry.id, day, e.target.value)}
                      step="0.5"
                      min="0"
                      max="24"
                    />
                  </td>
                ))}
                <td className="py-3 px-2 text-center font-medium text-foreground">
                  {days.reduce((sum, day) => sum + parseFloat(entry[day] || 0), 0).toFixed(1)}
                </td>
                <td className="py-3 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1 h-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            
            {/* Add new entry row */}
            <tr className="border-b border-border">
              <td className="py-3 px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center space-x-2 text-primary hover:text-primary"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Entry</span>
                </Button>
              </td>
              <td colSpan={8}></td>
            </tr>
            
            {/* Total row */}
            <tr className="bg-muted/50 font-medium">
              <td className="py-3 px-4 text-foreground">Daily Totals</td>
              {dailyTotals.map((total, index) => (
                <td key={index} className="py-3 px-2 text-center text-foreground">
                  {total.toFixed(1)}
                </td>
              ))}
              <td className="py-3 px-2 text-center text-lg text-foreground">
                {weeklyTotal.toFixed(1)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <AddEntryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        timesheetId={timesheet?.id}
        projects={projects || []}
        onSuccess={() => {
          setIsAddModalOpen(false);
          onUpdate();
        }}
      />
    </>
  );
}
