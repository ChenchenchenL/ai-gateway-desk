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
 * Windows 11 Fluent Glass Time Preset Selector.
 */
export const TimePresetBar: React.FC<TimePresetBarProps> = ({
  preset,
  onSelectPreset,
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-medium text-slate-400">统计周期</span>
      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/25 border border-white/[0.06] backdrop-blur-md">
        {PRESETS.map((p) => {
          const isActive = preset === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onSelectPreset(p.value)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
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
