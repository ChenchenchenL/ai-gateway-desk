import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level Error Boundary to catch render crashes and prevent white screen in desktop app.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React rendering error:", error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex items-center justify-center p-4 bg-transparent select-none">
          <div className="acrylic-widget rounded-2xl w-full max-w-[340px] p-5 shadow-2xl flex flex-col items-center text-center">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 mb-3 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 mb-1">
              挂件遇到轻微异常
            </h3>
            <p className="text-xs text-slate-500 mb-4 max-w-xs leading-relaxed font-mono text-[10px] break-all bg-white/60 p-2 rounded-xl border border-white/80">
              {this.state.error?.message || "组件状态解析异常"}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新加载挂件</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
