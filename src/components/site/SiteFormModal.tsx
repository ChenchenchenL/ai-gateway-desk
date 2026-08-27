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

const PROVIDERS: { label: string; value: ProviderType; defaultUrl: string }[] = [
  { label: "New-API 中转站 (推荐)", value: "new_api", defaultUrl: "https://api.new-api.com" },
  { label: "One-API 中转站", value: "one_api", defaultUrl: "https://api.one-api.com" },
  { label: "OpenAI 兼容网关", value: "openai_compatible", defaultUrl: "https://api.openai.com" },
  { label: "Anthropic 兼容网关", value: "anthropic_compatible", defaultUrl: "https://api.anthropic.com" },
];

/**
 * Windows 11 Fluent Acrylic Modal for creating and editing monitored gateway sites.
 */
export const SiteFormModal: React.FC<SiteFormModalProps> = ({ site, onClose, onSaved }) => {
  const [name, setName] = useState(site?.name ?? "");
  const [provider, setProvider] = useState<ProviderType>(site?.provider ?? "new_api");
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

  const handleProviderChange = (p: ProviderType) => {
    setProvider(p);
    const found = PROVIDERS.find((item) => item.value === p);
    if (found && (!baseUrl || baseUrl === "https://" || baseUrl.includes("api."))) {
      setBaseUrl(found.defaultUrl);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="acrylic-widget rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08]">
          <span className="text-sm font-bold text-slate-800">
            {site ? "编辑站点配置" : "添加中转网关站点"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-black/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-3.5 flex flex-col gap-2.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">站点名称</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：主号 New-API / 个人中转站"
              className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">协议类型</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
              className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value} className="bg-slate-900 text-slate-100">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">接口地址 (Base URL)</label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="例如：https://api.ikuncode.cc"
              className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
              <span>API Token / 访问密钥</span>
              <span className="text-[10px] text-slate-500 font-normal">用于余额与个人用量</span>
            </label>
            <input
              type="password"
              required={!site}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={site ? "留空则保持原密钥不变" : "sk-... 或 访问令牌"}
              className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-[11px] shadow-sm"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center justify-between">
              <span>管理 Token (可选)</span>
              <span className="text-[10px] text-slate-500 font-normal">仅用于全局管理日志</span>
            </label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="可选填（Root Token）"
              className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-[11px] shadow-sm"
            />
          </div>

          <div className="flex items-center justify-between py-0.5">
            <span className="text-slate-700 font-semibold">启用此站点监控</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-white/20 accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Test connection error section */}
          {testError && (
            <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 flex items-start gap-1.5 text-[11px] shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{testError}</span>
            </div>
          )}

          {/* Test connection success section */}
          {testedCaps && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 flex flex-col gap-1 text-[11px] shadow-sm">
              <div className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>连接测试成功！支持能力：</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded-md ${testedCaps.balance ? "bg-emerald-900/60 text-emerald-200 border border-emerald-700/50" : "bg-slate-800 text-slate-500"}`}>
                  余额: {testedCaps.balance ? "支持" : "不支持"}
                </span>
                <span className={`px-1.5 py-0.5 rounded-md ${testedCaps.usage ? "bg-emerald-900/60 text-emerald-200 border border-emerald-700/50" : "bg-slate-800 text-slate-500"}`}>
                  日志: {testedCaps.usage ? "支持" : "不支持"}
                </span>
                <span className={`px-1.5 py-0.5 rounded-md ${testedCaps.cache_usage ? "bg-emerald-900/60 text-emerald-200 border border-emerald-700/50" : "bg-slate-800 text-slate-500"}`}>
                  Cache: {testedCaps.cache_usage ? "支持" : "不支持"}
                </span>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-black/[0.08] mt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 border border-white/15 text-slate-200 rounded-xl font-medium transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin text-indigo-400" /> : <KeyRound className="w-3 h-3" />}
              <span>测试连接</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-black/[0.05] transition font-semibold cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-md shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
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
