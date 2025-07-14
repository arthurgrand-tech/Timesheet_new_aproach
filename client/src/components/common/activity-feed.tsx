import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, Folder, User } from "lucide-react";

interface ActivityItem {
  id: string;
  type: 'timesheet' | 'approval' | 'project' | 'user';
  description: string;
  timestamp: string;
}

// Mock data for demonstration - in a real app this would come from an API
const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "timesheet",
    description: "Timesheet for current week updated",
    timestamp: "2 hours ago"
  },
  {
    id: "2",
    type: "approval",
    description: "Week Dec 4-10 timesheet submitted for approval",
    timestamp: "1 day ago"
  },
  {
    id: "3",
    type: "project",
    description: "Added to new project: Website Redesign",
    timestamp: "2 days ago"
  }
];

export function ActivityFeed() {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'timesheet':
        return <Clock className="w-4 h-4 text-white" />;
      case 'approval':
        return <CheckCircle className="w-4 h-4 text-white" />;
      case 'project':
        return <Folder className="w-4 h-4 text-white" />;
      case 'user':
        return <User className="w-4 h-4 text-white" />;
      default:
        return <Clock className="w-4 h-4 text-white" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'timesheet':
        return 'bg-primary';
      case 'approval':
        return 'bg-accent';
      case 'project':
        return 'bg-blue-500';
      case 'user':
        return 'bg-purple-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.timestamp}
                </p>
              </div>
            </div>
          ))}
          
          {mockActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity to display
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
