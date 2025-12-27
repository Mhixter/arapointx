import React from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import arapointLogo from "@assets/generated_images/arapoint_solution_logo.png";
import { useSettings } from "@/contexts/SettingsContext";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { settings } = useSettings();
  const isAuthPage = location.startsWith("/auth");
  const isDashboardPage = location.startsWith("/dashboard");

  if (isAuthPage || isDashboardPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-heading font-bold text-xl text-primary tracking-tight hover:opacity-90 transition-opacity cursor-pointer">
              <div className="h-12 w-12 logo-cycle">
                <img src={arapointLogo} alt="Arapoint" className="h-11 w-11 object-contain" />
              </div>
              <span className="text-foreground hidden sm:inline">Arapoint</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
            <a href="#services" className="text-muted-foreground hover:text-primary transition-colors">Services</a>
            <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
            <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/auth/login">
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer">
                Sign In
              </span>
            </Link>
            <Link href="/auth/signup">
              <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm hover:shadow-md cursor-pointer">
                Get Started
              </span>
            </Link>
          </div>

          {/* Mobile Nav */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-6 mt-8">
                <a href="#features" className="text-lg font-medium">Features</a>
                <a href="#services" className="text-lg font-medium">Services</a>
                <a href="#pricing" className="text-lg font-medium">Pricing</a>
                <Link href="/auth/login">
                  <span className="inline-flex w-full items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer">
                    Sign In
                  </span>
                </Link>
                <Link href="/auth/signup">
                  <span className="inline-flex w-full items-center justify-start gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer">
                    Get Started
                  </span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t bg-muted/30 py-12">
        <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-heading font-bold text-lg text-primary">
              <img src={arapointLogo} alt="Arapoint" className="h-8 w-8 object-contain" />
              <span className="text-foreground">Arapoint</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              The trusted standard for identity verification and digital services in Nigeria. Secure, fast, and compliant.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">Identity Verification</a></li>
              <li><a href="#" className="hover:text-primary">Education Checks</a></li>
              <li><a href="#" className="hover:text-primary">Business Lookup</a></li>
              <li><a href="#" className="hover:text-primary">VTU Services</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary">About Us</a></li>
              <li><a href="#" className="hover:text-primary">Careers</a></li>
              <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{settings.siteEmail}</li>
              <li>{settings.sitePhone}</li>
              <li>{settings.siteAddress}</li>
            </ul>
          </div>
        </div>
        <div className="container mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {settings.siteName}. All rights reserved. NDPA Compliant.
        </div>
      </footer>
    </div>
  );
}
