import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle, Clock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: pendingTimesheets, isLoading } = useQuery({
    queryKey: ["/api/approvals"],
    enabled: user?.role === 'manager' || user?.role === 'admin',
  });

  const approveMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const res = await apiRequest("POST", `/api/timesheets/${timesheetId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      toast({
        title: "Success",
        description: "Timesheet approved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve timesheet",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const res = await apiRequest("POST", `/api/timesheets/${timesheetId}/reject`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      toast({
        title: "Success",
        description: "Timesheet rejected",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject timesheet",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (timesheetId: number) => {
    approveMutation.mutate(timesheetId);
  };

  const handleReject = (timesheetId: number) => {
    rejectMutation.mutate(timesheetId);
  };

  const formatWeekRange = (weekStartDate: string) => {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (user?.role !== 'manager' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex bg-background">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <Header title="Approvals" subtitle="Review and approve timesheets" />
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
                <p className="text-muted-foreground">
                  You don't have permission to access this page. Only managers and admins can approve timesheets.
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
        <Header title="Approvals" subtitle="Review and approve timesheets" />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Pending Approvals</span>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTimesheets?.map((timesheet: any) => (
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
                            timesheet.status === 'submitted' ? 'default' :
                            timesheet.status === 'approved' ? 'default' :
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
                          {timesheet.status === 'submitted' && (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(timesheet.id)}
                                disabled={approveMutation.isPending}
                                className="flex items-center space-x-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(timesheet.id)}
                                disabled={rejectMutation.isPending}
                                className="flex items-center space-x-1"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {pendingTimesheets?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending approvals. All timesheets are up to date.
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
