import React from "react";

export type StatAccent = "primary" | "cyan" | "purple" | "emerald" | "amber" | "rose" | "neutral";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: StatAccent;
  badge?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Clean Neutral Desktop KPI Card (Section 6 & 15).
 */
export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subtitle,
  accent = "neutral",
  badge,
  className = "",
  onClick,
}) => {
  const iconColors: Record<StatAccent, string> = {
    primary: "text-white/80",
    cyan: "text-cyan-400",
    purple: "text-white/80",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    rose: "text-rose-400",
    neutral: "text-white/70",
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card metric-kpi-card select-none ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Top Header: Icon & Label (Left) + Badge (Right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`metric-icon ${iconColors[accent]}`}>
            {icon}
          </div>
          <span className="metric-label truncate">
            {label}
          </span>
        </div>
        {badge && <div className="shrink-0">{badge}</div>}
      </div>

      {/* Center & Bottom: Value & Secondary Text */}
      <div className="mt-1 flex flex-col">
        <div className="metric-value leading-tight">
          {value}
        </div>
        {subtitle && (
          <div className="metric-secondary mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
