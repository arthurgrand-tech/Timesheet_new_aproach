import { Bell, Menu } from 'lucide-react';
import { User } from '@shared/schema';

interface HeaderProps {
  onMenuClick: () => void;
  user: User | null;
}

export const Header = ({ onMenuClick, user }: HeaderProps) => {
  return (
    <header className="page-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 rounded-lg hover:bg-accent text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Welcome back, manage your team's time efficiently</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            <span className="notification-badge"></span>
          </button>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Organization:</span>
            <span className="font-medium text-foreground">TechCorp Inc.</span>
          </div>
        </div>
      </div>
    </header>
  );
};
