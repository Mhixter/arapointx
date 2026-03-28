import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api/services";
import {
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  FileCheck,
  UserCog,
  Baby,
  History,
  ListChecks,
  Activity,
  ChevronRight,
  Shield,
  Hash,
  RefreshCw,
  Lock,
  Fingerprint,
} from "lucide-react";

export const SERVICES = [
  { id: "nin-verification", name: "NIN Verification", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", desc: "Verify using 11-digit NIN", category: "Verification", badge: "Popular" },
  { id: "nin-phone", name: "NIN With Phone", icon: Smartphone, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", desc: "Search NIN using Phone Number", category: "Verification" },
  { id: "nin-tracking", name: "NIN With Tracking ID", icon: Hash, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/20", desc: "Verify using NIMC Tracking ID", category: "Verification" },
  { id: "ipe-clearance", name: "IPE Clearance", icon: RefreshCw, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/20", desc: "Clear IPE errors and enrollment issues", category: "Management" },
  { id: "validation", name: "Validation", icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/20", desc: "Record validation and corrections", category: "Management" },
  { id: "personalization", name: "Personalization", icon: UserCog, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/20", desc: "Customize Identity Data", category: "Management" },
  { id: "birth-attestation", name: "Birth Attestation", icon: Baby, color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/20", desc: "NPC Birth Certificate", category: "Records" },
  { id: "transactions", name: "Transaction History", icon: History, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800", desc: "View all verification logs", category: "Records" },
  { id: "verifications", name: "Verifications", icon: ListChecks, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800", desc: "Manage saved verifications", category: "Records" },
];

const CATEGORIES = ["Verification", "Management", "Records"] as const;

export default function IdentityVerification() {
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: servicesApi.dashboard.getStats,
    staleTime: 30000,
  });

  const totalTransactions = dashboardData?.stats?.totalTransactions || 0;
  const totalVerifications = dashboardData?.stats?.ninVerifications || 0;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 p-7 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white translate-y-1/3 -translate-x-1/3" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-6 w-6 opacity-90" />
              <span className="text-sm font-semibold uppercase tracking-wider opacity-80">NIN Services</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Identity Services</h1>
            <p className="text-green-100 text-sm max-w-md">
              Securely verify, manage, and update your National Identity Number through our trusted agent platform.
            </p>
          </div>
          <div className="hidden md:flex gap-6 text-center">
            <div className="bg-white/15 rounded-xl px-6 py-4">
              <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
              <p className="text-xs text-green-100 mt-1">Total Transactions</p>
            </div>
            <div className="bg-white/15 rounded-xl px-6 py-4">
              <p className="text-2xl font-bold">{totalVerifications.toLocaleString()}</p>
              <p className="text-xs text-green-100 mt-1">Verifications Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats (mobile) */}
      <div className="grid grid-cols-2 gap-4 md:hidden">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold">{totalTransactions.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verifications</p>
              <p className="text-xl font-bold">{totalVerifications.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legal Disclaimer */}
      <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Shield className="h-4 w-4 text-amber-600" />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Legal Disclaimer</p>
          <p className="text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
            Arapoint is an independent service provider and is <strong>NOT</strong> an official partner or affiliate of the National Identity Management Commission (NIMC).
            We act as authorized agents to assist you with NIN services. Your data is handled in compliance with Nigerian data protection regulations (NDPR).
          </p>
        </div>
      </div>

      {/* Services by Category */}
      {CATEGORIES.map((category) => {
        const categoryServices = SERVICES.filter(s => s.category === category);
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">{category}</h3>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryServices.map((service) => (
                <Link key={service.id} href={`/dashboard/identity/${service.id}`}>
                  <div className="group relative flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                    {service.badge && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        {service.badge}
                      </span>
                    )}
                    <div className={`h-11 w-11 rounded-xl flex-shrink-0 flex items-center justify-center ${service.bg} ${service.color} group-hover:scale-110 transition-transform`}>
                      <service.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-semibold text-sm leading-tight">{service.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{service.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {/* Security note */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
        <Lock className="h-5 w-5 text-slate-500 flex-shrink-0" />
        <p className="text-xs text-slate-600 dark:text-slate-400">
          All identity data is encrypted in transit and at rest. Arapoint does not store sensitive NIN data beyond what is needed to deliver your service.
        </p>
      </div>
    </div>
  );
}
