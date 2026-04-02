import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Code2, Loader2 } from "lucide-react";

export default function DevLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ email: "", name: "", company: "", password: "", confirmPassword: "" });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("dev_token", data.data.token);
        localStorage.setItem("dev_user", JSON.stringify(data.data.developer));
        toast({ title: "Welcome back!", description: `Logged in as ${data.data.developer.name}` });
        setLocation("/developer/dashboard");
      } else {
        toast({ title: "Login failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/developer/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerForm.email,
          name: registerForm.name,
          company: registerForm.company,
          password: registerForm.password,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("dev_token", data.data.token);
        localStorage.setItem("dev_user", JSON.stringify(data.data.developer));
        toast({ title: "Account created!", description: "Welcome to Arapoint Developer Portal" });
        setLocation("/developer/dashboard");
      } else {
        toast({ title: "Registration failed", description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Arapoint Developer Portal</h1>
          <p className="text-gray-400 text-sm mt-1">Build with Nigeria's verification infrastructure</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800 mb-6">
            <TabsTrigger value="login" className="data-[state=active]:bg-indigo-600 text-white">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-indigo-600 text-white">Create Account</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Welcome back</CardTitle>
                <CardDescription className="text-gray-400">Sign in to your developer account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Email</Label>
                    <Input
                      type="email" required
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="dev@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Password</Label>
                    <Input
                      type="password" required
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Create developer account</CardTitle>
                <CardDescription className="text-gray-400">Start integrating Arapoint APIs</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Full Name</Label>
                    <Input
                      required
                      value={registerForm.name}
                      onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Email</Label>
                    <Input
                      type="email" required
                      value={registerForm.email}
                      onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="dev@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Company (optional)</Label>
                    <Input
                      value={registerForm.company}
                      onChange={e => setRegisterForm(f => ({ ...f, company: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="Acme Ltd"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Password</Label>
                    <Input
                      type="password" required minLength={8}
                      value={registerForm.password}
                      onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Confirm Password</Label>
                    <Input
                      type="password" required minLength={8}
                      value={registerForm.confirmPassword}
                      onChange={e => setRegisterForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-gray-600 mt-4">
          <a href="/" className="text-indigo-400 hover:underline">← Back to Arapoint</a>
        </p>
      </div>
    </div>
  );
}
