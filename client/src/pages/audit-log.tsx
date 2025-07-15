import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, History, User, Calendar, Activity, Database } from 'lucide-react';

export default function AuditLog() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['/api/audit-logs'],
  });

  const filteredLogs = auditLogs?.filter((log: any) => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === 'all' || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const getActionBadgeClass = (action: string) => {
    if (action.includes('create')) return 'badge success';
    if (action.includes('update')) return 'badge warning';
    if (action.includes('delete')) return 'badge error';
    return 'badge primary';
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatEntityType = (entityType: string) => {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1);
  };

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
      <div>
        <h1 className="page-title">Audit Log</h1>
        <p className="page-subtitle">Track all system activities and changes</p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search audit logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Entities</option>
                <option value="user">User</option>
                <option value="project">Project</option>
                <option value="task">Task</option>
                <option value="timesheet">Timesheet</option>
                <option value="organization">Organization</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="responsive-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>User</th>
                  <th className="mobile-hidden">Date & Time</th>
                  <th className="mobile-hidden">IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  filteredLogs?.map((log: any) => (
                    <tr key={log.id}>
                      <td>
                        <div className="flex items-center space-x-3">
                          <Activity className="w-4 h-4 text-primary" />
                          <div>
                            <Badge className={getActionBadgeClass(log.action)}>
                              {formatAction(log.action)}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <Database className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{formatEntityType(log.entityType)}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.user?.email || 'system@system.com'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="mobile-hidden">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="mobile-hidden">
                        <span className="text-sm text-muted-foreground font-mono">
                          {log.ipAddress || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div className="max-w-xs">
                          {log.newValues && (
                            <details className="cursor-pointer">
                              <summary className="text-sm text-primary hover:text-primary/80">
                                View Changes
                              </summary>
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(JSON.parse(log.newValues), null, 2)}
                                </pre>
                              </div>
                            </details>
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
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold text-foreground">
                  {auditLogs?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <History className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Create Actions</p>
                <p className="text-2xl font-bold text-foreground">
                  {auditLogs?.filter((log: any) => log.action.includes('create')).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Update Actions</p>
                <p className="text-2xl font-bold text-foreground">
                  {auditLogs?.filter((log: any) => log.action.includes('update')).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delete Actions</p>
                <p className="text-2xl font-bold text-foreground">
                  {auditLogs?.filter((log: any) => log.action.includes('delete')).length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditLogs?.slice(0, 10).map((log: any) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 bg-muted rounded-lg">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'} 
                      <span className="text-muted-foreground"> {formatAction(log.action).toLowerCase()} </span>
                      <span className="text-foreground">{formatEntityType(log.entityType)}</span>
                      {log.entityId && <span className="text-muted-foreground"> #{log.entityId}</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {log.newValues && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Made changes to {formatEntityType(log.entityType).toLowerCase()} data
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
