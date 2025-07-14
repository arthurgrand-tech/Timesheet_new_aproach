import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Home, 
  Calendar, 
  Folder, 
  CheckCircle, 
  BarChart3, 
  Users, 
  Settings,
  LogOut,
  User
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const navigationItems = [
    { path: "/", label: "Dashboard", icon: Home, roles: ['user', 'manager', 'admin'] },
    { path: "/timesheet", label: "Timesheet", icon: Calendar, roles: ['user', 'manager', 'admin'] },
    { path: "/resources", label: "Resources", icon: Folder, roles: ['user', 'manager', 'admin'] },
    { path: "/approvals", label: "Approvals", icon: CheckCircle, roles: ['manager', 'admin'] },
    { path: "/reports", label: "Reports", icon: BarChart3, roles: ['manager', 'admin'] },
    { path: "/users", label: "User Management", icon: Users, roles: ['admin'] },
    { path: "/settings", label: "Settings", icon: Settings, roles: ['admin'] },
  ];

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const visibleItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || 'user')
  );

  return (
    <aside className="w-64 bg-card sidebar-shadow fixed h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">TimeTracker Pro</h1>
            <p className="text-sm text-muted-foreground">Team Time Management</p>
          </div>
        </div>

        <nav className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <Link key={item.path} href={item.path}>
                <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user?.role}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
