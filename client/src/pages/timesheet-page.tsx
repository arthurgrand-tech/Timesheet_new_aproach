import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TimesheetGrid } from "@/components/timesheet/timesheet-grid";
import { StatsCard } from "@/components/common/stats-card";
import { Button } from "@/components/ui/button";
import { Clock, Folder, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, Download, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Helper function to get week start date (Monday)
function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// Helper function to format date range
function formatWeekRange(startDate: string): string {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function TimesheetPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStartDate = getWeekStartDate(currentDate);
  
  const { data: timesheet, isLoading, refetch } = useQuery({
    queryKey: ["/api/timesheets/week", weekStartDate],
  });

  const handlePreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleSubmitTimesheet = async () => {
    if (!timesheet) return;
    
    try {
      // Submit timesheet
      await fetch(`/api/timesheets/${timesheet.id}/submit`, {
        method: 'POST',
        credentials: 'include',
      });
      
      toast({
        title: "Success",
        description: "Timesheet submitted for approval",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit timesheet",
        variant: "destructive",
      });
    }
  };

  const handleExportTimesheet = () => {
    toast({
      title: "Export",
      description: "Timesheet export feature coming soon",
    });
  };

  // Calculate stats
  const totalHours = timesheet?.entries?.reduce((sum, entry) => {
    const entryTotal = parseFloat(entry.monday) + parseFloat(entry.tuesday) + 
                     parseFloat(entry.wednesday) + parseFloat(entry.thursday) + 
                     parseFloat(entry.friday) + parseFloat(entry.saturday) + 
                     parseFloat(entry.sunday);
    return sum + entryTotal;
  }, 0) || 0;

  const projectCount = timesheet?.entries?.reduce((projects, entry) => {
    projects.add(entry.projectId);
    return projects;
  }, new Set()).size || 0;

  const overtimeHours = Math.max(0, totalHours - 40);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        <Header 
          title="Weekly Timesheet" 
          subtitle={`Week of ${formatWeekRange(weekStartDate)}`}
        >
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTimesheet}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
            <Button
              onClick={handleSubmitTimesheet}
              disabled={!timesheet || timesheet.status !== 'draft'}
              className="flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Week</span>
            </Button>
          </div>
        </Header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatsCard
            title="This Week"
            value={totalHours.toFixed(1)}
            subtitle="Hours logged"
            icon={<Clock className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Projects"
            value={projectCount.toString()}
            subtitle="Active projects"
            icon={<Folder className="w-5 h-5 text-accent" />}
          />
          <StatsCard
            title="Status"
            value={timesheet?.status || "Draft"}
            subtitle={timesheet?.status === 'submitted' ? "Awaiting approval" : "In progress"}
            icon={<CheckCircle className="w-5 h-5 text-accent" />}
            valueColor={timesheet?.status === 'approved' ? "text-accent" : timesheet?.status === 'submitted' ? "text-warning" : "text-muted-foreground"}
          />
          <StatsCard
            title="Overtime"
            value={overtimeHours.toFixed(1)}
            subtitle="Hours over 40"
            icon={<AlertTriangle className="w-5 h-5 text-warning" />}
          />
        </div>

        <div className="bg-card rounded-lg card-shadow overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Time Entry</h3>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousWeek}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextWeek}
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading timesheet...</p>
                </div>
              </div>
            ) : (
              <TimesheetGrid 
                timesheet={timesheet}
                weekStartDate={weekStartDate}
                onUpdate={refetch}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
