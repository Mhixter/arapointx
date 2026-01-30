import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import arapointLogo from "@assets/generated_images/arapoint_logo_-_security_shield_with_checkmark.png";
import axios from "axios";

export default function AdminLogin() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await axios.post('/api/auth/admin/login', { email, password });
      const { accessToken, refreshToken, admin } = response.data.data;
      
      localStorage.setItem('adminToken', accessToken);
      localStorage.setItem('adminRefreshToken', refreshToken);
      localStorage.setItem('adminUser', JSON.stringify(admin));
      
      toast({
        title: "Welcome Admin!",
        description: `Successfully logged in as ${admin.name}.`,
      });
      setLocation("/admin");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.response?.data?.message || "Invalid admin credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <Card className="w-full max-w-md border-2 border-indigo-200 shadow-xl">
        <CardHeader className="space-y-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-lg">
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
              <Lock className="h-8 w-8" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-heading font-bold text-white">Admin Portal</CardTitle>
            <CardDescription className="text-indigo-100 mt-2">
              Authorized administrators only
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertDescription className="text-sm text-amber-800">
              This is the admin login portal. If you're a regular user, please{" "}
              <Link href="/auth/login" className="font-semibold text-amber-900 hover:underline">
                sign in here
              </Link>.
            </AlertDescription>
          </Alert>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input 
                id="admin-email" 
                type="email" 
                placeholder="admin@arapoint.com" 
                required 
                className="h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password">Password</Label>
                <Link href="/auth/reset" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input 
                  id="admin-password" 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="h-11 pr-10" 
                  data-testid="input-admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-toggle-admin-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base bg-indigo-600 hover:bg-indigo-700" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center border-t pt-6 text-sm text-muted-foreground">
          Arapoint Admin Panel v2.0
        </CardFooter>
      </Card>
    </div>
  );
}
