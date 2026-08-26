import React from "react";
import { Site } from "../../types";
import { SiteCard } from "./SiteCard";
import { Plus } from "lucide-react";

interface SiteListProps {
  sites: Site[];
  onSelectSite: (site: Site) => void;
  onAddSite: () => void;
}

/**
 * List view of all registered AI gateway endpoints.
 */
export const SiteList: React.FC<SiteListProps> = ({
  sites,
  onSelectSite,
  onAddSite,
}) => {
  return (
    <div className="flex flex-col gap-2.5 p-3 overflow-y-auto max-h-[480px]">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          已配置站点 ({sites.length})
        </span>
        <button
          onClick={onAddSite}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加</span>
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 gap-2">
          <p className="text-xs">暂无配置站点</p>
          <button
            onClick={onAddSite}
            className="text-xs px-3 py-1.5 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white transition"
          >
            添加第一个中转站
          </button>
        </div>
      ) : (
        sites.map((site) => (
          <SiteCard key={site.id} site={site} onSelect={onSelectSite} />
        ))
      )}
    </div>
  );
};
