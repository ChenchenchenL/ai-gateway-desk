import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  title: string;
  variant?: "neutral" | "primary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

/**
 * Windows 11 Light Frosted Acrylic Icon Button.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  title,
  variant = "neutral",
  size = "md",
  className = "",
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: "p-1 rounded-lg text-xs",
    md: "p-1.5 rounded-xl text-sm",
    lg: "p-2 rounded-xl text-base",
  };

  const variantClasses = {
    neutral: "text-slate-500 hover:text-slate-900 hover:bg-white/70 border border-transparent hover:border-white/90",
    primary: "text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200/60 shadow-xs",
    danger: "text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100",
    ghost: "text-slate-400 hover:text-slate-700 hover:bg-black/[0.04]",
  };

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`inline-flex items-center justify-center transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
};
