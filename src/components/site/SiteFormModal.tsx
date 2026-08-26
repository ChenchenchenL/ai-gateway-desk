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
  { label: "One-API 中转站", value: "one_api", defaultUrl: "https://api.one-api.com" },
  { label: "New-API 中转站", value: "new_api", defaultUrl: "https://api.new-api.com" },
  { label: "Sub2API 订阅网关", value: "sub2_api", defaultUrl: "https://sub.sub2api.com" },
  { label: "OpenAI Compatible", value: "openai_compatible", defaultUrl: "https://api.openai.com" },
  { label: "Anthropic Compatible", value: "anthropic_compatible", defaultUrl: "https://api.anthropic.com" },
];

/**
 * Modal form for creating and editing monitored gateway sites.
 */
export const SiteFormModal: React.FC<SiteFormModalProps> = ({ site, onClose, onSaved }) => {
  const [name, setName] = useState(site?.name ?? "");
  const [provider, setProvider] = useState<ProviderType>(site?.provider ?? "one_api");
  const [baseUrl, setBaseUrl] = useState(site?.base_url ?? "https://");
  const [authToken, setAuthToken] = useState("");
  const [adminToken, setAdminToken] = useState("");
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
    if (!authToken.trim()) {
      setTestError("请先输入 API Token");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-sm font-semibold text-slate-100">
            {site ? "编辑站点配置" : "添加中转与网关站点"}
          </span>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">站点名称</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：主号 One-API / Claude 网关"
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">协议类型</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">接口地址 (Base URL)</label>
            <input
              type="url"
              required
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>API Token / 访问密钥</span>
              <span className="text-[10px] text-slate-500">本地加密保存</span>
            </label>
            <input
              type="password"
              required={!site}
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder={site ? "留空则保持原密钥不变" : "sk-..."}
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1 flex items-center justify-between">
              <span>管理 Token (可选)</span>
              <span className="text-[10px] text-slate-500">仅用于查询额度/日志</span>
            </label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="可选填"
              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-300 font-medium">启用此站点监控</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-700"
            />
          </div>

          {/* Test connection result section */}
          {testError && (
            <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 flex items-start gap-1.5 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{testError}</span>
            </div>
          )}

          {testedCaps && (
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-900/60 text-emerald-300 flex flex-col gap-1 text-[11px]">
              <div className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>连接测试成功！支持能力如下：</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded ${testedCaps.balance ? "bg-emerald-900/60 text-emerald-200" : "bg-slate-800 text-slate-500"}`}>
                  余额: {testedCaps.balance ? "支持" : "不支持"}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${testedCaps.usage ? "bg-emerald-900/60 text-emerald-200" : "bg-slate-800 text-slate-500"}`}>
                  日志: {testedCaps.usage ? "支持" : "不支持"}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${testedCaps.cache_usage ? "bg-emerald-900/60 text-emerald-200" : "bg-slate-800 text-slate-500"}`}>
                  Cache: {testedCaps.cache_usage ? "支持" : "不支持"}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${testedCaps.window_quota ? "bg-emerald-900/60 text-emerald-200" : "bg-slate-800 text-slate-500"}`}>
                  窗口配额: {testedCaps.window_quota ? "支持" : "不支持"}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium transition flex items-center gap-1"
            >
              {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
              <span>测试连接</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded transition disabled:opacity-50"
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
