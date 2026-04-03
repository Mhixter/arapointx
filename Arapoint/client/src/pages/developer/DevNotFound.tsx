import { Code2, ArrowLeft, LayoutDashboard } from "lucide-react";

export default function DevNotFound() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0A0A0A", color: "#E5E7EB" }}
    >
      {/* Minimal dev portal header */}
      <header
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid #1F2937" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#0B5FFF,#12B76A)" }}
        >
          <Code2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-none">Arapoint</p>
          <p className="text-xs" style={{ color: "#0B5FFF" }}>Developer Portal</p>
        </div>
      </header>

      {/* 404 body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Big 404 */}
        <div className="mb-8 select-none">
          <p
            className="font-black leading-none"
            style={{ fontSize: 120, color: "#111827", letterSpacing: -4 }}
          >
            404
          </p>
          <div
            className="h-1 rounded-full mx-auto mt-2"
            style={{ width: 80, background: "linear-gradient(90deg,#0B5FFF,#12B76A)" }}
          />
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Page not found
        </h1>
        <p className="text-sm mb-8 max-w-sm leading-relaxed" style={{ color: "#6B7280" }}>
          This page doesn't exist in the Arapoint Developer Portal. It may have moved or the URL may be incorrect.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/developer/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#0B5FFF" }}
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </a>
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{
              background: "#111827",
              color: "#9CA3AF",
              border: "1px solid #1F2937",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#E5E7EB")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        {/* Help link */}
        <p className="mt-10 text-xs" style={{ color: "#4B5563" }}>
          Need help?{" "}
          <a
            href="mailto:developers@arapoint.com.ng"
            className="hover:underline"
            style={{ color: "#0B5FFF" }}
          >
            developers@arapoint.com.ng
          </a>
        </p>
      </div>
    </div>
  );
}
