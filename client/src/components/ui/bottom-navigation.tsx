import { Home, PlusCircle, History, User, Scale, Users, Settings, ClipboardList } from "lucide-react";
import { Button } from "./button";

interface BottomNavigationProps {
  activeTab: "home" | "weight" | "allweights" | "users" | "profile" | "register" | "history" | "settings";
  onTabChange?: (tab: string) => void;
  isAdmin?: boolean;
}

export function BottomNavigation({ activeTab, onTabChange, isAdmin = false }: BottomNavigationProps) {
  const adminNavItems = [
    { id: "home", icon: Home, label: "Início" },
    { id: "weight", icon: Scale, label: "Pesos" },
    { id: "allweights", icon: ClipboardList, label: "Todos" },
    { id: "users", icon: Users, label: "Usuários" },
    { id: "settings", icon: Settings, label: "Config" },
  ];

  const userNavItems = [
    { id: "home", icon: Home, label: "Início" },
    { id: "weight", icon: Scale, label: "Pesos" },
  ];

  const items = isAdmin ? adminNavItems : userNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onTabChange?.(item.id)}
              className={`flex flex-col items-center gap-1 p-2 ${
                isActive ? "text-primary" : "text-slate-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
