import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ScreeningReviewerLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/screening-reviewer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("reviewerToken", data.data.token);
      localStorage.setItem("reviewerAgent", JSON.stringify(data.data.agent));
      setLocation("/screening/reviewer/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reviewer Login</h1>
          <p className="text-slate-400 mt-1 text-sm">Manual verification agent portal</p>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">Email address</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="agent@arapoint.com.ng"
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-11 rounded-xl focus:border-orange-400 focus:ring-orange-400/30"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm mb-1.5 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-11 rounded-xl pr-10 focus:border-orange-400 focus:ring-orange-400/30"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading}
              className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Arapoint Employment Screening — Reviewer Portal
        </p>
      </div>
    </div>
  );
}
