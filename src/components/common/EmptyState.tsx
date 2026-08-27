import React from "react";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Windows 11 Light Frosted Acrylic Empty State Container.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`acrylic-widget rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl select-none ${className}`}
    >
      <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 mb-3 shadow-[0_0_20px_rgba(99,102,241,0.12)]">
        {icon}
      </div>
      <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
        {description}
      </p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
};
