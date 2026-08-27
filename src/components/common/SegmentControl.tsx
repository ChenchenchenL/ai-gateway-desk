import React from "react";

export interface SegmentOption<T extends string = string> {
  label: string;
  value: T;
  icon?: React.ReactNode;
}

export interface SegmentControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Windows 11 Light Frosted Acrylic Segment Control.
 */
export function SegmentControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  className = "",
}: SegmentControlProps<T>) {
  const sizeClasses = {
    sm: "p-0.5 text-[11px]",
    md: "p-1 text-xs",
  };

  const btnPaddings = {
    sm: "px-2.5 py-0.5",
    md: "px-3 py-1",
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-xl bg-white/50 border border-white/80 backdrop-blur-md shadow-xs ${sizeClasses[size]} ${className}`}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1 rounded-lg font-semibold transition cursor-pointer select-none ${
              btnPaddings[size]
            } ${isActive ? "fluent-pill-active" : "fluent-pill-inactive"}`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
