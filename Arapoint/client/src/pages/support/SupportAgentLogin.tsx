import { tokenStorage } from '@/lib/tokenStorage';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye, EyeOff, Headset } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";

export default function SupportAgentLogin() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await axios.post('/api/auth/admin/login', { email, password });
      const { accessToken, refreshToken, admin } = response.data.data;

      if (admin.role !== 'support_agent') {
        setError("This login is for support agents only. Please use the admin login if you are an administrator.");
        return;
      }

      tokenStorage.setItem('adminToken', accessToken);
      tokenStorage.setItem('adminRefreshToken', refreshToken);
      tokenStorage.setItem('adminUser', JSON.stringify(admin));

      toast({
        title: "Welcome!",
        description: `Logged in as ${admin.name}`,
      });
      setLocation("/support/agent/dashboard");
    } catch (error: any) {
      setError(error.response?.data?.message || "Invalid credentials. Please check your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 p-4">
      <Card className="w-full max-w-md border-2 border-emerald-200 dark:border-emerald-800 shadow-xl">
        <CardHeader className="space-y-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
                Back
              </span>
            </Link>
            <div className="flex-1" />
          </div>
          <div className="flex justify-center mb-2">
            <div className="bg-white/20 p-3 rounded-lg">
              <Headset className="h-8 w-8" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-heading font-bold text-white">Support Agent Portal</CardTitle>
            <CardDescription className="text-emerald-100 mt-2">
              Sign in to manage support tickets
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          {error && (
            <Alert className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <AlertDescription className="text-sm text-red-800 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-email">Email</Label>
              <Input
                id="agent-email"
                type="email"
                placeholder="agent@arapoint.com"
                required
                className="h-11"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-password">Password</Label>
              <div className="relative">
                <Input
                  id="agent-password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="h-11 pr-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-6 text-sm text-muted-foreground">
          Arapoint Support Agent Portal
        </CardFooter>
      </Card>
    </div>
  );
}
