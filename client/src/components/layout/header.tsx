import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {children && (
          <div className="flex items-center space-x-3">
            {children}
          </div>
        )}
      </div>
    </header>
  );
}
