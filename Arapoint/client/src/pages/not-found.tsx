import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";
import gorillaImg from "@assets/gorilla-confused.png";

export default function NotFound() {
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 overflow-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(-1.5deg); }
          66% { transform: translateY(-5px) rotate(1deg); }
        }
        @keyframes head-shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(-6px) rotate(-3deg); }
          30% { transform: translateX(6px) rotate(3deg); }
          45% { transform: translateX(-4px) rotate(-2deg); }
          60% { transform: translateX(4px) rotate(2deg); }
          75% { transform: translateX(-2px) rotate(-1deg); }
        }
        @keyframes question-rise {
          0%   { opacity: 0; transform: translateY(8px) scale(0.6); }
          15%  { opacity: 1; transform: translateY(-4px) scale(1); }
          75%  { opacity: 0.7; transform: translateY(-52px) scale(1.05); }
          100% { opacity: 0; transform: translateY(-80px) scale(0.8); }
        }
        @keyframes bounce-in {
          0%   { transform: scale(0) rotate(-12deg); }
          55%  { transform: scale(1.12) rotate(3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.25); }
          50%       { box-shadow: 0 0 0 14px rgba(99,102,241,0); }
        }
        .gorilla-float { animation: float 4s ease-in-out infinite; }
        .gorilla-shake { animation: head-shake 0.6s ease-in-out; }
        .question-rise { animation: question-rise 2s ease-out forwards; }
        .bounce-in     { animation: bounce-in 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .slide-up      { animation: slide-up 0.7s ease-out forwards; }
        .ring-pulse    { animation: ring-pulse 2.5s ease-in-out infinite; }
      `}</style>

      <div className="relative flex flex-col items-center gap-10 max-w-md w-full">

        {/* Floating question marks */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={`${questionIdx}-${i}`}
              className="question-rise absolute font-black select-none"
              style={{
                left: `${8 + i * 16}%`,
                top: "30%",
                fontSize: `${16 + (i % 3) * 7}px`,
                color: i % 2 === 0 ? "#6366f1" : "#22c55e",
                animationDelay: `${i * 0.28}s`,
                opacity: 0,
              }}
            >
              ?
            </div>
          ))}
        </div>

        {/* Gorilla photo */}
        <div
          className={`relative ${shake ? "gorilla-shake" : "gorilla-float"}`}
        >
          {/* Glow ring behind the image */}
          <div className="ring-pulse absolute inset-0 rounded-full" />

          {/* Circular clipped photo */}
          <div
            className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-white shadow-2xl"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)" }}
          >
            <img
              src={gorillaImg}
              alt="Confused gorilla"
              className="w-full h-full object-cover object-top scale-110"
            />
            {/* Subtle vignette */}
            <div className="absolute inset-0 rounded-full ring-4 ring-inset ring-black/10" />
          </div>

          {/* Confused badge */}
          <div className="absolute -bottom-1 -right-1 bg-white border border-gray-100 shadow-lg rounded-full px-2.5 py-1 text-sm font-bold text-gray-700 flex items-center gap-1">
            🤔 Huh?
          </div>
        </div>

        {/* 404 display */}
        <div className="text-center space-y-5 slide-up" style={{ animationDelay: "0.15s", opacity: 0 }}>
          <div className="flex items-center justify-center gap-1">
            <span className="text-8xl sm:text-9xl font-black text-gray-900 tracking-tighter leading-none select-none">4</span>
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary flex items-center justify-center text-4xl sm:text-5xl font-black text-white bounce-in flex-shrink-0"
              style={{ animationDelay: "0.3s" }}
            >
              0
            </div>
            <span className="text-8xl sm:text-9xl font-black text-gray-900 tracking-tighter leading-none select-none">4</span>
          </div>

          <div className="space-y-2 px-4">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              This page doesn't exist
            </h1>
            <p className="text-gray-500 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
              Even our gorilla is confused. The page you're looking for may have moved, been deleted, or never existed at all.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-1">
            <Link href="/">
              <Button size="lg" className="h-11 px-7 gap-2 shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all">
                <Home className="w-4 h-4" /> Go Home
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-7 gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Button>
          </div>
        </div>

        {/* Bottom hint */}
        <p
          className="text-gray-400 text-xs slide-up"
          style={{ animationDelay: "0.45s", opacity: 0 }}
        >
          Lost? Visit the{" "}
          <Link href="/">
            <span className="text-primary hover:underline cursor-pointer font-medium">homepage</span>
          </Link>{" "}
          or contact support.
        </p>
      </div>
    </div>
  );
}
