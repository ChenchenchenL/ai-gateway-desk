import React from "react";
import { TimePreset } from "../../types";

interface TimePresetBarProps {
  preset: TimePreset;
  onSelectPreset: (preset: TimePreset) => void;
}

const PRESETS: { label: string; value: TimePreset }[] = [
  { label: "今日", value: "today" },
  { label: "24小时", value: "24h" },
  { label: "7天", value: "7d" },
  { label: "30天", value: "30d" },
];

/**
 * Windows 11 Light Frosted Acrylic Time Preset Switcher (Compact).
 */
export const TimePresetBar: React.FC<TimePresetBarProps> = ({
  preset,
  onSelectPreset,
}) => {
  return (
    <div className="flex items-center justify-between select-none shrink-0 py-0.5">
      <span className="text-[10.5px] font-bold text-slate-600">统计周期</span>
      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-white/50 border border-white/80 backdrop-blur-md shadow-xs">
        {PRESETS.map((p) => {
          const isActive = preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onSelectPreset(p.value)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer leading-tight ${
                isActive ? "fluent-pill-active" : "fluent-pill-inactive"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
