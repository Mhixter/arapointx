import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const [blink, setBlink] = useState(false);
  const [scratch, setScratch] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000);

    const scratchInterval = setInterval(() => {
      setScratch(true);
      setTimeout(() => setScratch(false), 1200);
    }, 2800);

    const questionInterval = setInterval(() => {
      setQuestionIdx(i => i + 1);
    }, 1800);

    return () => {
      clearInterval(blinkInterval);
      clearInterval(scratchInterval);
      clearInterval(questionInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center px-4 overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes sway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes scratch-arm {
          0%, 100% { transform: rotate(0deg) translateX(0px); }
          25% { transform: rotate(-18deg) translateX(4px); }
          50% { transform: rotate(-25deg) translateX(8px); }
          75% { transform: rotate(-18deg) translateX(4px); }
        }
        @keyframes idle-arm {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes question-rise {
          0% { opacity: 0; transform: translateY(0px) scale(0.5); }
          20% { opacity: 1; transform: translateY(-10px) scale(1); }
          80% { opacity: 0.8; transform: translateY(-40px) scale(1); }
          100% { opacity: 0; transform: translateY(-65px) scale(0.8); }
        }
        @keyframes eyebrow-furrow {
          0%, 100% { transform: scaleX(1) rotate(0deg); }
          50% { transform: scaleX(0.9) rotate(-4deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px rgba(99,102,241,0.15); }
          50% { box-shadow: 0 0 60px rgba(99,102,241,0.35); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0) rotate(-10deg); }
          60% { transform: scale(1.08) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .gorilla-float { animation: float 3.5s ease-in-out infinite; }
        .gorilla-sway { animation: sway 4s ease-in-out infinite; }
        .arm-scratch { animation: scratch-arm 0.3s ease-in-out 4; }
        .arm-idle { animation: idle-arm 3.5s ease-in-out infinite; }
        .question-rise { animation: question-rise 1.8s ease-out forwards; }
        .bounce-in { animation: bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .slide-up { animation: slide-up 0.7s ease-out forwards; }
        .card-glow { animation: pulse-glow 3s ease-in-out infinite; }
      `}</style>

      <div className="relative flex flex-col items-center gap-8 max-w-lg w-full">

        {/* Floating question marks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={`${questionIdx}-${i}`}
              className="question-rise absolute text-indigo-400 font-bold select-none"
              style={{
                left: `${15 + i * 17}%`,
                top: "45%",
                fontSize: `${14 + (i % 3) * 6}px`,
                animationDelay: `${i * 0.3}s`,
                opacity: 0,
              }}
            >
              ?
            </div>
          ))}
        </div>

        {/* Gorilla character */}
        <div className="gorilla-float relative">
          <svg
            width="220"
            height="220"
            viewBox="0 0 220 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-2xl"
          >
            {/* Body */}
            <ellipse cx="110" cy="155" rx="52" ry="46" fill="#2d2d2d" />
            <ellipse cx="110" cy="148" rx="36" ry="34" fill="#3d3d3d" />

            {/* Left Arm */}
            <g
              style={{ transformOrigin: "70px 140px" }}
              className={scratch ? "arm-scratch" : "arm-idle"}
            >
              <ellipse cx="68" cy="155" rx="14" ry="36" fill="#2d2d2d" transform="rotate(-12 68 155)" />
              <ellipse cx="58" cy="185" rx="12" ry="9" fill="#1a1a1a" />
              {/* scratch fingers */}
              {scratch && (
                <>
                  <line x1="50" y1="180" x2="42" y2="170" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
                  <line x1="55" y1="183" x2="46" y2="174" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
                  <line x1="60" y1="186" x2="52" y2="178" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
                </>
              )}
            </g>

            {/* Right Arm */}
            <g style={{ transformOrigin: "150px 140px", animation: "idle-arm 3.5s ease-in-out infinite" }}>
              <ellipse cx="152" cy="155" rx="14" ry="36" fill="#2d2d2d" transform="rotate(12 152 155)" />
              <ellipse cx="162" cy="185" rx="12" ry="9" fill="#1a1a1a" />
            </g>

            {/* Head */}
            <ellipse cx="110" cy="100" rx="52" ry="50" fill="#2d2d2d" />

            {/* Ear bumps */}
            <ellipse cx="60" cy="98" rx="12" ry="14" fill="#2d2d2d" />
            <ellipse cx="160" cy="98" rx="12" ry="14" fill="#2d2d2d" />
            <ellipse cx="60" cy="98" rx="7" ry="8" fill="#3d3d3d" />
            <ellipse cx="160" cy="98" rx="7" ry="8" fill="#3d3d3d" />

            {/* Face / muzzle */}
            <ellipse cx="110" cy="112" rx="33" ry="28" fill="#5c4033" />
            <ellipse cx="110" cy="116" rx="26" ry="20" fill="#6d4c41" />

            {/* Forehead crease (confused look) */}
            <path d="M90 80 Q110 74 130 80" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M94 84 Q110 78 126 84" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />

            {/* Eyebrows (furrowed) */}
            <path
              d="M83 88 Q92 82 101 87"
              stroke="#1a1a1a"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              style={{ transformOrigin: "92px 85px", animation: "eyebrow-furrow 2s ease-in-out infinite" }}
            />
            <path
              d="M119 87 Q128 82 137 88"
              stroke="#1a1a1a"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              style={{ transformOrigin: "128px 85px", animation: "eyebrow-furrow 2s ease-in-out infinite reverse" }}
            />

            {/* Eyes */}
            <ellipse cx="92" cy="97" rx="10" ry={blink ? 1.5 : 10} fill="#f5f5f5" style={{ transition: "ry 0.06s" }} />
            <ellipse cx="128" cy="97" rx="10" ry={blink ? 1.5 : 10} fill="#f5f5f5" style={{ transition: "ry 0.06s" }} />
            <ellipse cx="93" cy="98" rx="6" ry={blink ? 1 : 6} fill="#4a2e00" style={{ transition: "ry 0.06s" }} />
            <ellipse cx="129" cy="98" rx="6" ry={blink ? 1 : 6} fill="#4a2e00" style={{ transition: "ry 0.06s" }} />
            <ellipse cx="94" cy="96" rx="3" ry={blink ? 0.5 : 3} fill="#1a1a1a" style={{ transition: "ry 0.06s" }} />
            <ellipse cx="130" cy="96" rx="3" ry={blink ? 0.5 : 3} fill="#1a1a1a" style={{ transition: "ry 0.06s" }} />
            {/* Eye shine */}
            <ellipse cx="96" cy="93" rx="1.5" ry="1.5" fill="white" opacity="0.9" />
            <ellipse cx="132" cy="93" rx="1.5" ry="1.5" fill="white" opacity="0.9" />

            {/* Nose */}
            <ellipse cx="101" cy="108" rx="5" ry="4" fill="#3e2723" />
            <ellipse cx="119" cy="108" rx="5" ry="4" fill="#3e2723" />
            <path d="M101 108 Q110 112 119 108" stroke="#3e2723" strokeWidth="2" fill="none" />

            {/* Mouth — confused/puzzled curve */}
            <path d="M96 122 Q104 119 110 121 Q116 119 124 122" stroke="#3e2723" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Head scratch hand on top */}
            {scratch && (
              <g style={{ transformOrigin: "110px 60px", animation: "scratch-arm 0.3s ease-in-out 4" }}>
                <ellipse cx="85" cy="63" rx="14" ry="9" fill="#1a1a1a" transform="rotate(-30 85 63)" />
                <line x1="74" y1="56" x2="68" y2="46" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
                <line x1="79" y1="52" x2="75" y2="41" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
                <line x1="85" y1="50" x2="83" y2="39" stroke="#1a1a1a" strokeWidth="4" strokeLinecap="round" />
              </g>
            )}

            {/* Feet */}
            <ellipse cx="90" cy="198" rx="18" ry="10" fill="#1a1a1a" />
            <ellipse cx="130" cy="198" rx="18" ry="10" fill="#1a1a1a" />
          </svg>
        </div>

        {/* 404 text + message */}
        <div className="text-center space-y-4 slide-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-8xl font-black text-white tracking-tighter leading-none">4</span>
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-4xl font-black text-white bounce-in">0</div>
            <span className="text-8xl font-black text-white tracking-tighter leading-none">4</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Hmm, this page doesn't exist</h1>
            <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
              Even our gorilla can't figure out where this page went. It may have moved, been deleted, or never existed.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/">
              <Button size="lg" className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 gap-2">
                <Home className="w-4 h-4" /> Go Home
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white gap-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
          </div>
        </div>

        {/* Bottom hint */}
        <p className="text-slate-600 text-xs slide-up" style={{ animationDelay: "0.5s", opacity: 0 }}>
          Lost? Try the <Link href="/"><span className="text-indigo-400 hover:underline cursor-pointer">homepage</span></Link> or contact support.
        </p>
      </div>
    </div>
  );
}
