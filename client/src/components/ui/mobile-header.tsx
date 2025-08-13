import { LogOut } from "lucide-react";
import { Button } from "./button";
import { ReactNode } from "react";

interface MobileHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onLogout?: () => void;
}

export function MobileHeader({ title, subtitle, icon, onLogout }: MobileHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <div className="text-white">{icon}</div>
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-xs text-slate-600">{subtitle}</p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogout}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <LogOut className="h-5 w-5 text-slate-600" />
          </Button>
        </div>
      </div>
    </header>
  );
}
