import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
import arapointLogo from "@assets/generated_images/arapoint_solution_logo.png";

export default function Signup() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiClient.post('/otp/send', {
        email: formData.email,
        purpose: 'registration',
      });
      
      setStep("otp");
      startCooldown();
      toast({
        title: "Verification Code Sent",
        description: "Please check your email for the OTP.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send OTP",
        description: error.response?.data?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setIsResending(true);
    try {
      await apiClient.post('/otp/send', {
        email: formData.email,
        purpose: 'registration',
      });
      
      startCooldown();
      toast({
        title: "OTP Resent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend OTP",
        description: error.response?.data?.message || "Please wait before requesting another code",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (formData.password.length < 8) {
        toast({
          title: "Password Too Short",
          description: "Password must be at least 8 characters long.",
          variant: "destructive",
        });
        setStep("details");
        setIsLoading(false);
        return;
      }

      if (otp.length !== 6) {
        toast({
          title: "Invalid OTP",
          description: "Please enter the 6-digit code sent to your email.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await apiClient.post('/otp/register', {
        email: formData.email,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone || undefined,
        password: formData.password,
        otp: otp,
      });
      
      const data = response.data.data;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      toast({
        title: "Account Created",
        description: "Welcome to Arapoint!",
      });
      setLocation("/dashboard");
    } catch (error: any) {
      const errorData = error.response?.data;
      let errorMsg = "Invalid OTP. Please try again.";
      
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        errorMsg = errorData.errors.map((e: any) => e.message).join('. ');
      } else if (errorData?.message) {
        errorMsg = errorData.message;
      }

      toast({
        title: "Registration Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <Link href="/">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                <ArrowLeft className="h-4 w-4" />
                Back
              </span>
            </Link>
            <div className="flex-1" />
          </div>
          <div className="flex justify-center mb-4">
            <div className="logo-cycle" style={{width: "128px", height: "128px"}}>
              <img src={arapointLogo} alt="Arapoint" className="h-24 w-24 object-contain" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-heading font-bold">Create an Account</CardTitle>
            <CardDescription>
              {step === "details" ? "Get started with secure identity verification" : "Enter the code sent to your email"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step === "details" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="Ade" 
                    required 
                    className="h-11"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Ojo" 
                    required 
                    className="h-11"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  className="h-11"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="+2348012345678" 
                  className="h-11"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="h-11 pr-10" 
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                {isLoading ? "Sending Code..." : "Sign Up"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">One-Time Password (OTP)</Label>
                <Input 
                  id="otp" 
                  placeholder="123456" 
                  className="h-11 text-center text-lg tracking-widest" 
                  maxLength={6} 
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Code sent to {formData.email}
                </p>
              </div>
              <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify & Create Account"}
              </Button>
              
              <div className="flex flex-col gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={handleResendOtp}
                  disabled={isResending || resendCooldown > 0}
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Resending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend OTP in ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend OTP
                    </>
                  )}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep("details")}>
                  Back to details
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center border-t pt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
