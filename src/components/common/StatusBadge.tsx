import React from "react";

export interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "purple" | "neutral" | "info";
  size?: "sm" | "md";
  className?: string;
  dot?: boolean;
}

/**
 * Windows 11 Light Frosted Acrylic Status Badge.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  className = "",
  dot = false,
}) => {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  const variantClasses = {
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/80 font-bold",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80 font-bold",
    danger: "bg-rose-50 text-rose-800 border-rose-200/80 font-bold",
    purple: "bg-indigo-50 text-indigo-800 border-indigo-200/80 font-bold",
    info: "bg-sky-50 text-sky-800 border-sky-200/80 font-bold",
    neutral: "bg-white/80 text-slate-700 border-white/90 font-semibold shadow-xs",
  };

  const dotColors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    purple: "bg-indigo-500",
    info: "bg-sky-500",
    neutral: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border leading-none select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      <span>{children}</span>
    </span>
  );
};
