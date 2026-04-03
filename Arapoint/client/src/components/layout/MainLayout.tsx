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
            <a href="https://developer.arapoint.com.ng" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">Developers</a>
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
                <a href="https://developer.arapoint.com.ng" target="_blank" rel="noopener noreferrer" className="text-lg font-medium text-primary">Developers</a>
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

      <footer className="border-t border-border/50 bg-muted/20">
        <div className="container py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 font-heading font-bold text-lg group w-fit">
                <img src={arapointLogo} alt="Arapoint" className="h-8 w-8 object-contain" />
                <span className="text-foreground group-hover:text-primary transition-colors">Arapoint</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Nigeria's trusted standard for identity verification and digital services. Secure, fast, and NDPA compliant.
              </p>
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  NDPA Compliant
                </span>
                <span className="inline-flex items-center gap-1 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">
                  99.9% Uptime
                </span>
              </div>
            </div>

            {/* Platform */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">Platform</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "Identity Verification", href: "#features" },
                  { label: "Education Checks", href: "#features" },
                  { label: "Business Lookup", href: "#features" },
                  { label: "VTU Services", href: "#features" },
                  { label: "Developer API", href: "https://developer.arapoint.com.ng", external: true },
                ].map(item => (
                  <li key={item.label}>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {item.label}
                      </a>
                    ) : (
                      <a href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">Company</h4>
              <ul className="space-y-2.5">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Careers", href: "/careers" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Service", href: "/terms" },
                ].map(item => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm">Contact</h4>
              <ul className="space-y-2.5">
                {settings.siteEmail && (
                  <li>
                    <a href={`mailto:${settings.siteEmail}`} className="text-sm text-muted-foreground hover:text-primary transition-colors break-all">
                      {settings.siteEmail}
                    </a>
                  </li>
                )}
                {settings.sitePhone && (
                  <li>
                    <a href={`tel:${settings.sitePhone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {settings.sitePhone}
                    </a>
                  </li>
                )}
                {settings.siteAddress && (
                  <li className="text-sm text-muted-foreground leading-relaxed">{settings.siteAddress}</li>
                )}
                <li>
                  <a href="mailto:support@arapoint.com.ng" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    support@arapoint.com.ng
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} {settings.siteName || "Arapoint"}. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <a href="mailto:legal@arapoint.com.ng" className="hover:text-primary transition-colors">Legal</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
