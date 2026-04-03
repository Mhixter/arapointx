import { useState, useEffect } from "react";
import { Code2, ArrowLeft, LayoutDashboard } from "lucide-react";
import gorillaImg from "@assets/gorilla-confused.png";

export default function DevNotFound() {
  const [shake, setShake] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);

  useEffect(() => {
    const shakeInterval = setInterval(() => {
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }, 3500);
    const questionInterval = setInterval(() => {
      setQuestionIdx(i => i + 1);
    }, 2000);
    return () => {
      clearInterval(shakeInterval);
      clearInterval(questionInterval);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0A0A0A", color: "#E5E7EB" }}
    >
      <style>{`
        @keyframes dev-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(-1.5deg); }
          66% { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes dev-head-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(-6px) rotate(-3deg); }
          30% { transform: translateX(6px) rotate(3deg); }
          45% { transform: translateX(-4px) rotate(-2deg); }
          60% { transform: translateX(4px) rotate(2deg); }
          75% { transform: translateX(-2px) rotate(-1deg); }
        }
        @keyframes dev-question-rise {
          0%   { opacity: 0; transform: translateY(8px) scale(0.6); }
          15%  { opacity: 1; transform: translateY(-4px) scale(1); }
          75%  { opacity: 0.7; transform: translateY(-52px) scale(1.05); }
          100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
        }
        @keyframes dev-bounce-in {
          0%   { transform: scale(0) rotate(-12deg); }
          55%  { transform: scale(1.12) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes dev-slide-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dev-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(11,95,255,0.3); }
          50%       { box-shadow: 0 0 0 14px rgba(11,95,255,0); }
        }
        .dev-gorilla-float { animation: dev-float 4s ease-in-out infinite; }
        .dev-gorilla-shake { animation: dev-head-shake 0.6s ease-in-out; }
        .dev-question-rise { animation: dev-question-rise 2s ease-out forwards; }
        .dev-bounce-in     { animation: dev-bounce-in 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .dev-slide-up      { animation: dev-slide-up 0.7s ease-out forwards; }
        .dev-ring-pulse    { animation: dev-ring-pulse 2.5s ease-in-out infinite; }
      `}</style>

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
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <div className="relative flex flex-col items-center gap-8 max-w-md w-full">

          {/* Floating question marks */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={`${questionIdx}-${i}`}
                className="dev-question-rise absolute font-black select-none"
                style={{
                  left: `${8 + i * 16}%`,
                  top: "30%",
                  fontSize: `${16 + (i % 3) * 7}px`,
                  color: i % 2 === 0 ? "#0B5FFF" : "#12B76A",
                  animationDelay: `${i * 0.28}s`,
                  opacity: 0,
                }}
              >
                ?
              </div>
            ))}
          </div>

          {/* Gorilla */}
          <div className={`relative ${shake ? "dev-gorilla-shake" : "dev-gorilla-float"}`}>
            <div className="dev-ring-pulse absolute inset-0 rounded-full" />
            <div
              className="relative w-44 h-44 rounded-full overflow-hidden"
              style={{
                border: "3px solid #1F2937",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 4px 16px rgba(11,95,255,0.15)",
              }}
            >
              <img
                src={gorillaImg}
                alt="Confused gorilla"
                className="w-full h-full object-cover object-top scale-110"
              />
              <div className="absolute inset-0 rounded-full ring-4 ring-inset ring-black/20" />
            </div>
            <div
              className="absolute -bottom-1 -right-1 rounded-full px-2.5 py-1 text-sm font-bold flex items-center gap-1"
              style={{ background: "#111827", border: "1px solid #1F2937", color: "#E5E7EB" }}
            >
              🤔 Huh?
            </div>
          </div>

          {/* 404 */}
          <div className="dev-slide-up text-center space-y-4" style={{ animationDelay: "0.15s", opacity: 0 }}>
            <div className="flex items-center justify-center gap-1">
              <span
                className="font-black leading-none select-none"
                style={{ fontSize: 80, color: "#E5E7EB", letterSpacing: -2 }}
              >
                4
              </span>
              <div
                className="dev-bounce-in w-14 h-14 rounded-full flex items-center justify-center font-black text-white flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#0B5FFF,#12B76A)",
                  fontSize: 36,
                  animationDelay: "0.3s",
                }}
              >
                0
              </div>
              <span
                className="font-black leading-none select-none"
                style={{ fontSize: 80, color: "#E5E7EB", letterSpacing: -2 }}
              >
                4
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-white">Page not found</h1>
              <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: "#6B7280" }}>
                This page doesn't exist in the Arapoint Developer Portal. It may have moved or the URL may be incorrect.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
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
                style={{ background: "#111827", color: "#9CA3AF", border: "1px solid #1F2937" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#E5E7EB")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>
            </div>
          </div>

          <p
            className="dev-slide-up text-xs"
            style={{ color: "#4B5563", animationDelay: "0.45s", opacity: 0 }}
          >
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
    </div>
  );
}
