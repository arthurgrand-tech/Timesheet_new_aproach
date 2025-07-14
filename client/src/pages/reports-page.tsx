import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Users, Clock, TrendingUp, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function ReportsPage() {
  const { user } = useAuth();

  const { data: timesheetReports, isLoading } = useQuery({
    queryKey: ["/api/reports/timesheets"],
    enabled: user?.role === 'manager' || user?.role === 'admin',
  });

  const formatWeekRange = (weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Calculate summary statistics
  const totalHours = timesheetReports?.reduce((sum: number, timesheet: any) => {
    return sum + parseFloat(timesheet.totalHours || 0);
  }, 0) || 0;

  const approvedTimesheets = timesheetReports?.filter((t: any) => t.status === 'approved').length || 0;
  const pendingTimesheets = timesheetReports?.filter((t: any) => t.status === 'submitted').length || 0;
  const totalTimesheets = timesheetReports?.length || 0;

  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <Header title="Reports" subtitle="Analytics and insights" />
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">
                  You don't have permission to access this page. Only managers and admins can view reports.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        <Header title="Reports" subtitle="Analytics and insights" />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Total Hours</h4>
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-2xl font-semibold text-gray-900 mb-1">
                {totalHours.toFixed(1)}
              </div>
              <p className="text-sm text-gray-500">Hours logged</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Timesheets</h4>
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div className="text-2xl font-semibold text-gray-900 mb-1">
                {totalTimesheets}
              </div>
              <p className="text-sm text-gray-500">Total submitted</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Approved</h4>
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
              <div className="text-2xl font-semibold text-gray-900 mb-1">
                {approvedTimesheets}
              </div>
              <p className="text-sm text-gray-500">Approved timesheets</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">Pending</h4>
                <BarChart3 className="w-5 h-5 text-warning" />
              </div>
              <div className="text-2xl font-semibold text-gray-900 mb-1">
                {pendingTimesheets}
              </div>
              <p className="text-sm text-gray-500">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Timesheet Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Timesheet Reports</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Approved By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timesheetReports?.map((timesheet: any) => (
                      <TableRow key={timesheet.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {timesheet.user?.firstName} {timesheet.user?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatWeekRange(timesheet.weekStartDate)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{timesheet.totalHours}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            timesheet.status === 'approved' ? 'default' :
                            timesheet.status === 'submitted' ? 'default' :
                            timesheet.status === 'rejected' ? 'destructive' : 'secondary'
                          }>
                            {timesheet.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {timesheet.submittedAt ? 
                            new Date(timesheet.submittedAt).toLocaleDateString() : 
                            'Not submitted'
                          }
                        </TableCell>
                        <TableCell>
                          {timesheet.approver ? 
                            `${timesheet.approver.firstName} ${timesheet.approver.lastName}` : 
                            '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {timesheetReports?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No timesheet data available. Timesheets will appear here once submitted.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
