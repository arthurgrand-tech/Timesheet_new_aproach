import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TimesheetModal } from '@/components/modals/TimesheetModal';
import { SubscriptionModal } from '@/components/modals/SubscriptionModal';
import { UserManagementModal } from '@/components/modals/UserManagementModal';
import { 
  Clock, 
  FolderOpen, 
  Users, 
  TrendingUp, 
  Plus, 
  CreditCard, 
  UserPlus 
} from 'lucide-react';

export default function Dashboard() {
  const [timesheetModalOpen, setTimesheetModalOpen] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: recentTimesheets } = useQuery({
    queryKey: ['/api/dashboard/recent-timesheets'],
  });

  const { data: activeProjects } = useQuery({
    queryKey: ['/api/dashboard/active-projects'],
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved': return 'badge success';
      case 'pending': return 'badge warning';
      case 'rejected': return 'badge error';
      case 'submitted': return 'badge primary';
      default: return 'badge';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="dashboard-stats">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours This Week</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.totalHours?.toFixed(1) || '0.0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-green-600">+12% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.activeProjects || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">3 projects due this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.teamMembers || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-muted-foreground">5 pending approvals</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilization Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.utilizationRate || 0}%
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-green-600">+5% from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Projects */}
      <div className="dashboard-section">
        {/* Recent Timesheets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Timesheets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTimesheets?.length === 0 ? (
                <div className="empty-state">
                  <p>No recent timesheets</p>
                </div>
              ) : (
                recentTimesheets?.map((timesheet: any) => (
                  <div key={timesheet.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="user-avatar">
                        <Users className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {timesheet.user?.firstName} {timesheet.user?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Week ending {new Date(timesheet.weekEnding).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {parseFloat(timesheet.totalHours).toFixed(1)} hrs
                      </p>
                      <Badge className={getStatusBadgeClass(timesheet.status)}>
                        {formatStatus(timesheet.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeProjects?.length === 0 ? (
                <div className="empty-state">
                  <p>No active projects</p>
                </div>
              ) : (
                activeProjects?.map((project: any) => (
                  <div key={project.id} className="project-card">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">{project.name}</h4>
                      <span className="text-sm text-muted-foreground">75%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: '75%' }}></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-muted-foreground">5 members</span>
                      <span className="text-sm text-muted-foreground">
                        Due {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'No due date'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setTimesheetModalOpen(true)}
        className="floating-action-button"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3 className="text-sm font-medium text-foreground mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <button
            onClick={() => setTimesheetModalOpen(true)}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Clock className="w-4 h-4 mr-2 inline" />
            New Timesheet
          </button>
          <button
            onClick={() => setSubscriptionModalOpen(true)}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <CreditCard className="w-4 h-4 mr-2 inline" />
            View Plans
          </button>
          <button
            onClick={() => setUserModalOpen(true)}
            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2 inline" />
            Manage Users
          </button>
        </div>
      </div>

      {/* Modals */}
      <TimesheetModal
        isOpen={timesheetModalOpen}
        onClose={() => setTimesheetModalOpen(false)}
      />
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
      />
      <UserManagementModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
      />
    </div>
  );
}
