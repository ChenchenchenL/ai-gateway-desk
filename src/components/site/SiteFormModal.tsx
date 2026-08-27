import React, { useState } from "react";
import { ProviderType, SaveSiteRequest, Site, SiteCapabilities } from "../../types";
import { siteService } from "../../services/siteService";
import { formatErrorMessage } from "../../utils/error";
import { X, CheckCircle2, AlertCircle, Loader2, KeyRound } from "lucide-react";

interface SiteFormModalProps {
  site?: Site | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Windows 11 Light Frosted Acrylic Modal for creating and editing monitored gateway sites.
 */
export const SiteFormModal: React.FC<SiteFormModalProps> = ({ site, onClose, onSaved }) => {
  const [name, setName] = useState(site?.name ?? "");
  const [provider] = useState<ProviderType>("new_api");
  const [baseUrl, setBaseUrl] = useState(site?.base_url ?? "https://");
  const [authToken, setAuthToken] = useState(() => {
    if (typeof window !== "undefined" && site?.id) {
      try {
        const stored = JSON.parse(localStorage.getItem("ai_gateway_desk_tokens") || "{}");
        return stored[site.id] || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window !== "undefined" && site?.id) {
      try {
        const stored = JSON.parse(localStorage.getItem("ai_gateway_desk_admin_tokens") || "{}");
        return stored[site.id] || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [enabled, setEnabled] = useState(site?.enabled ?? true);

  const [testing, setTesting] = useState(false);
  const [testedCaps, setTestedCaps] = useState<SiteCapabilities | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleTestConnection = async () => {
    if (!authToken.trim() && !adminToken.trim()) {
      setTestError("请先输入 API Token 或 管理 Token");
      return;
    }
    setTesting(true);
    setTestError(null);
    setTestedCaps(null);
    try {
      const caps = await siteService.testConnection({
        provider,
        base_url: baseUrl,
        auth_token: authToken,
        admin_token: adminToken.trim() || undefined,
      });
      setTestedCaps(caps);
    } catch (err) {
      setTestError(formatErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim()) return;
    setSaving(true);
    try {
      const payload: SaveSiteRequest = {
        id: site?.id,
        name,
        provider,
        base_url: baseUrl,
        auth_token: authToken,
        admin_token: adminToken.trim() || undefined,
        enabled,
      };
      await siteService.saveSite(payload);
      onSaved();
      onClose();
    } catch (err) {
      setTestError(formatErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/25 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="acrylic-widget rounded-2xl w-full max-w-[340px] max-h-[94vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-indigo-100/70 shrink-0">
          <span className="text-xs font-bold text-slate-800">
            {site ? "编辑监控站点配置" : "添加 New-API 监控站点"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3 flex flex-col gap-2 text-xs overflow-y-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">站点名称</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：主号 New-API / 个人中转站"
              className="glass-input w-full px-2.5 py-1.5 rounded-xl text-xs text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">协议类型</label>
            <div className="px-2.5 py-1.5 bg-white/75 border border-white/90 rounded-xl text-slate-700 text-xs font-semibold flex items-center justify-between shadow-xs">
              <span>New-API 统一中转网关</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-100">
                NEW-API
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-0.5">接口地址 (Base URL)</label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="例如：https://api.ikuncode.cc"
              className="glass-input w-full px-2.5 py-1.5 rounded-xl font-mono text-[11px] text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-0.5 flex items-center justify-between">
              <span>API Token / 访问密钥</span>
              <span className="text-[10px] text-slate-400 font-normal">用于余额与用量统计</span>
            </label>
            <input
              type="password"
              required={!site}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={site ? "留空则保持原密钥不变" : "sk-... 或 访问令牌"}
              className="glass-input w-full px-2.5 py-1.5 rounded-xl font-mono text-[11px] text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-0.5 flex items-center justify-between">
              <span>管理 Token (可选)</span>
              <span className="text-[10px] text-slate-400 font-normal">仅用于全局管理日志</span>
            </label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="可选填（Root Token）"
              className="glass-input w-full px-2.5 py-1.5 rounded-xl font-mono text-[11px] text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span className="text-[11px] font-bold text-slate-600">启用此站点监控</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-white border-slate-300 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Test connection error */}
          {testError && (
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-1.5 text-[11px] shadow-xs">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-500" />
              <span>{testError}</span>
            </div>
          )}

          {/* Test connection success */}
          {testedCaps && (
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex flex-col gap-1 text-[11px] shadow-xs">
              <div className="flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>连接测试成功！支持能力：</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5 text-[10px]">
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                  余额: {testedCaps.balance ? "支持" : "不支持"}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                  日志: {testedCaps.usage ? "支持" : "不支持"}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium">
                  Cache: {testedCaps.cache_usage ? "支持" : "不支持"}
                </span>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-indigo-100/60 mt-1 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-2.5 py-1.5 bg-white/80 hover:bg-white border border-white/90 text-indigo-700 rounded-xl font-bold transition flex items-center gap-1 text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin text-indigo-600" /> : <KeyRound className="w-3 h-3 text-indigo-600" />}
              <span>测试连接</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-white/60 transition font-bold text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl transition shadow-md shadow-indigo-500/25 text-xs disabled:opacity-50 cursor-pointer"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
