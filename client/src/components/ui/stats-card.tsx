import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: ReactNode;
  icon: ReactNode;
  bgColor: string;
}

export function StatsCard({ title, value, icon, bgColor }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${bgColor} rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-600">{title}</p>
          <div className="text-2xl font-bold text-slate-900">{value}</div>
        </div>
      </div>
    </div>
  );
}
