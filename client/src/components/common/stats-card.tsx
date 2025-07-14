import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
  valueColor?: string;
}

export function StatsCard({ title, value, subtitle, icon, valueColor = "text-foreground" }: StatsCardProps) {
  return (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-foreground">{title}</h4>
          {icon}
        </div>
        <div className={`text-2xl font-semibold mb-1 ${valueColor}`}>
          {value}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
