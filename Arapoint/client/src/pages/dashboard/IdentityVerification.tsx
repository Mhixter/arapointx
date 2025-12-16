import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { servicesApi } from "@/lib/api/services";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  User,
  Smartphone,
  Landmark,
  CreditCard,
  CheckCircle,
  FileCheck,
  Unlink,
  FileSearch,
  UserCog,
  Edit,
  Baby,
  FilePenLine,
  History,
  ListChecks,
  Activity,
  ChevronRight,
  Shield,
  Download,
  FileText
} from "lucide-react";

export const SERVICES = [
  { id: "nin-verification", name: "NIN Verification", icon: ShieldCheck, color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", desc: "Verify using 11-digit NIN", price: 150 },
  { id: "nin-phone", name: "NIN With Phone", icon: Smartphone, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/20", desc: "Search NIN using Phone Number", price: 200 },
  { id: "ipe-clearance", name: "Lost NIN Recovery", icon: CheckCircle, color: "text-teal-600", bg: "bg-teal-100 dark:bg-teal-900/20", desc: "Recover lost NIN using NIMC tracking ID", price: 2500 },
  { id: "validation", name: "Validation", icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/20", desc: "General Identity Validation", price: 1500 },
  { id: "personalization", name: "Personalization", icon: UserCog, color: "text-pink-600", bg: "bg-pink-100 dark:bg-pink-900/20", desc: "Customize Identity Data", price: 3000 },
  { id: "birth-attestation", name: "Birth Attestation", icon: Baby, color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/20", desc: "NPC Birth Certificate", price: 5000 },
  { id: "transactions", name: "Transactions", icon: History, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800", desc: "View verification logs" },
  { id: "verifications", name: "Verifications", icon: ListChecks, color: "text-slate-600", bg: "bg-slate-100 dark:bg-slate-800", desc: "Manage saved verifications" },
];

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
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Identity Services</h2>
        <p className="text-muted-foreground">Select a service to proceed with verification or management.</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Legal Disclaimer</p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Arapoint is an independent service provider and is <strong>NOT</strong> an official partner or affiliate of the National Identity Management Commission (NIMC). 
              We act as authorized agents to assist you with NIN verification and retrieval services. Your personal data is protected and handled in compliance with Nigerian data protection regulations (NDPR). 
              By using this service, you agree to our terms and conditions.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Total Transactions</p>
              <h3 className="text-3xl font-bold mt-1">{totalTransactions.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
              <Activity className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
             <div>
              <p className="text-sm font-medium text-muted-foreground">Total Verifications</p>
              <h3 className="text-3xl font-bold mt-1">{totalVerifications.toLocaleString()}</h3>
            </div>
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SERVICES.map((service) => (
          <Link key={service.id} href={`/dashboard/identity/${service.id}`}>
            <Card className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-1 group h-full">
              <CardContent className="p-5 flex items-start gap-4 h-full">
                <div className={`h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center ${service.bg} ${service.color}`}>
                  <service.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold leading-tight truncate pr-2">{service.name}</h4>
                    {service.price && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">₦{service.price.toLocaleString()}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{service.desc}</p>
                </div>
                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -ml-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* NIN Slip Tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            NIN Slip Types & Samples
          </CardTitle>
          <CardDescription>
            After successful NIN verification, you can download your slip in different formats. View sample slips below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Information Slip", price: 200, desc: "Basic info with photo and NIN", tier: "information", features: ["Full Name", "Date of Birth", "Gender", "Photo"] },
              { name: "Regular Slip", price: 250, desc: "Standard slip with more details", tier: "regular", features: ["All Basic Info", "Phone Number", "State of Origin", "LGA"] },
              { name: "Standard Slip", price: 300, desc: "Complete information slip", tier: "standard", features: ["All Regular Info", "Address", "Signature", "QR Code"] },
              { name: "Premium Slip", price: 300, desc: "Full detailed verification slip", tier: "premium", features: ["All Standard Info", "Biometrics", "Next of Kin", "Employment"] },
            ].map((slip) => (
              <Card key={slip.tier} className="relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">{slip.name}</h4>
                    <Badge variant="secondary" className="text-xs">₦{slip.price}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{slip.desc}</p>
                  <ul className="text-xs space-y-1 mb-4">
                    {slip.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => window.open(`/api/identity/sample-slip/${slip.tier}`, '_blank')}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    View Sample
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
