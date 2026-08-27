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
 * Windows 11 Light Frosted Acrylic Site List View.
 */
export const SiteList: React.FC<SiteListProps> = ({
  sites,
  onSelectSite,
  onAddSite,
}) => {
  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto max-h-[480px]">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          已配置站点 ({sites.length})
        </span>
        <button
          type="button"
          onClick={onAddSite}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>添加</span>
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 gap-2">
          <p className="text-xs">暂无配置站点</p>
          <button
            type="button"
            onClick={onAddSite}
            className="text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold transition shadow-sm cursor-pointer"
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
