import React from "react";

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  intensity?: "low" | "medium" | "high";
}

/**
 * Reusable Glassmorphism Panel Container.
 */
export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = "",
  intensity = "medium",
  ...props
}) => {
  const intensityClass = {
    low: "bg-slate-900/40 backdrop-blur-md border border-white/[0.06]",
    medium: "glass-panel",
    high: "bg-slate-950/85 backdrop-blur-2xl border border-white/[0.10]",
  }[intensity];

  return (
    <div className={`${intensityClass} ${className}`} {...props}>
      {children}
    </div>
  );
};
