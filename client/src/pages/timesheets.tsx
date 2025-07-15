import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TimesheetModal } from '@/components/modals/TimesheetModal';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { 
  Calendar, 
  Plus, 
  Search, 
  Eye, 
  Check, 
  X, 
  Clock,
  User,
  FileText
} from 'lucide-react';

export default function Timesheets() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | undefined>();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: timesheets, isLoading } = useQuery({
    queryKey: ['/api/timesheets'],
  });

  const approveTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const response = await fetch(`/api/timesheets/${timesheetId}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to approve timesheet');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Timesheet approved successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
    },
    onError: () => {
      toast({ title: 'Failed to approve timesheet', variant: 'destructive' });
    },
  });

  const rejectTimesheetMutation = useMutation({
    mutationFn: async (timesheetId: number) => {
      const response = await fetch(`/api/timesheets/${timesheetId}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to reject timesheet');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Timesheet rejected' });
      queryClient.invalidateQueries({ queryKey: ['/api/timesheets'] });
    },
    onError: () => {
      toast({ title: 'Failed to reject timesheet', variant: 'destructive' });
    },
  });

  const filteredTimesheets = timesheets?.filter((timesheet: any) => {
    const matchesSearch = timesheet.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timesheet.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         timesheet.comments?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || timesheet.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved': return 'timesheet-status approved';
      case 'submitted': return 'timesheet-status submitted';
      case 'rejected': return 'timesheet-status rejected';
      case 'draft': return 'timesheet-status draft';
      default: return 'timesheet-status';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const canApproveTimesheets = user?.role === 'supervisor' || user?.role === 'super_admin';
  const isEmployee = user?.role === 'employee';

  if (isLoading) {
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
          <h1 className="page-title">Timesheets</h1>
          <p className="page-subtitle">
            {isEmployee 
              ? 'Submit and track your weekly timesheets'
              : 'Review and approve team timesheets'
            }
          </p>
        </div>
        <Button 
          onClick={() => setTimesheetModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Timesheet
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Timesheet Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search timesheets..."
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
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Timesheets Table */}
          <div className="responsive-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Week Ending</th>
                  <th>Total Hours</th>
                  <th>Status</th>
                  <th className="mobile-hidden">Submitted</th>
                  <th className="mobile-hidden">Approved By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTimesheets?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No timesheets found
                    </td>
                  </tr>
                ) : (
                  filteredTimesheets?.map((timesheet: any) => (
                    <tr key={timesheet.id}>
                      <td>
                        <div className="flex items-center space-x-3">
                          <div className="user-avatar">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {timesheet.user?.firstName} {timesheet.user?.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {timesheet.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(timesheet.weekEnding).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {parseFloat(timesheet.totalHours).toFixed(1)}h
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge className={getStatusBadgeClass(timesheet.status)}>
                          {formatStatus(timesheet.status)}
                        </Badge>
                      </td>
                      <td className="mobile-hidden">
                        {timesheet.submittedAt ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(timesheet.submittedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not submitted</span>
                        )}
                      </td>
                      <td className="mobile-hidden">
                        {timesheet.approver ? (
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">
                              {timesheet.approver.firstName} {timesheet.approver.lastName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              setSelectedTimesheetId(timesheet.id);
                              setTimesheetModalOpen(true);
                            }}
                            className="action-button text-primary hover:text-primary/80"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {canApproveTimesheets && timesheet.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => approveTimesheetMutation.mutate(timesheet.id)}
                                className="action-button text-green-600 hover:text-green-700"
                                disabled={approveTimesheetMutation.isPending}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => rejectTimesheetMutation.mutate(timesheet.id)}
                                className="action-button text-red-600 hover:text-red-700"
                                disabled={rejectTimesheetMutation.isPending}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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
                <p className="text-sm text-muted-foreground">Total Timesheets</p>
                <p className="text-2xl font-bold text-foreground">
                  {timesheets?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold text-foreground">
                  {timesheets?.filter((t: any) => t.status === 'submitted').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-foreground">
                  {timesheets?.filter((t: any) => t.status === 'approved').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold text-foreground">
                  {timesheets?.reduce((sum: number, t: any) => sum + parseFloat(t.totalHours || 0), 0).toFixed(1)}h
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheet Modal */}
      <TimesheetModal
        isOpen={timesheetModalOpen}
        onClose={() => {
          setTimesheetModalOpen(false);
          setSelectedTimesheetId(undefined);
        }}
        timesheetId={selectedTimesheetId}
      />
    </div>
  );
}
