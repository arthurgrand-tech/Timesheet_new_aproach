import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/common/stats-card";
import { ActivityFeed } from "@/components/common/activity-feed";
import { Clock, Folder, CheckCircle, AlertTriangle } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        <Header 
          title="Dashboard" 
          subtitle={`Welcome back, ${user?.firstName || 'User'}`}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatsCard
            title="This Week"
            value="40.0"
            subtitle="Hours logged"
            icon={<Clock className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Projects"
            value="3"
            subtitle="Active projects"
            icon={<Folder className="w-5 h-5 text-accent" />}
          />
          <StatsCard
            title="Status"
            value="Submitted"
            subtitle="Awaiting approval"
            icon={<CheckCircle className="w-5 h-5 text-accent" />}
            valueColor="text-accent"
          />
          <StatsCard
            title="Overtime"
            value="0.0"
            subtitle="Hours over 40"
            icon={<AlertTriangle className="w-5 h-5 text-warning" />}
          />
        </div>

        <ActivityFeed />
      </main>
    </div>
  );
}
