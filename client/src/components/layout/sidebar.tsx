import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { 
  Clock, 
  LayoutDashboard, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  Calendar, 
  History, 
  CreditCard, 
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Resources', href: '/resources', icon: Users },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Timesheets', href: '/timesheets', icon: Calendar },
  { name: 'Audit Log', href: '/audit-log', icon: History },
  { name: 'Subscription', href: '/subscription', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar = ({ isOpen, onClose, isMobile }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const handleLinkClick = () => {
    if (isMobile) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}
      
      <div className={cn(
        "w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col transition-transform duration-300 ease-in-out",
        isMobile ? "fixed inset-y-0 left-0 z-50" : "relative",
        isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
      )}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-sidebar-foreground">TimeTracker Pro</span>
            </div>
            {isMobile && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleLinkClick}
                className={cn(
                  "nav-item",
                  isActive && "active"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="sidebar-footer">
          <div className="flex items-center space-x-3">
            <div className="user-avatar">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-sidebar-foreground">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-sidebar-foreground/60">
                {user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            </div>
            <div className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
              Standard
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full mt-4 px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
};
