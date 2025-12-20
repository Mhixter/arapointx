import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Smartphone, Wifi, Zap, Tv, Building2, User, GraduationCap, CreditCard, Fingerprint, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ServicePricing {
  id: string;
  serviceType: string;
  serviceName: string;
  price: string;
  description: string | null;
  isActive: boolean;
}

interface CategorizedServices {
  identity: ServicePricing[];
  education: ServicePricing[];
  cac: ServicePricing[];
  vtu: ServicePricing[];
}

const serviceTypeToRoute: Record<string, string> = {
  nin_slip_information: "/dashboard/identity",
  nin_slip_regular: "/dashboard/identity",
  nin_slip_standard: "/dashboard/identity",
  nin_slip_premium: "/dashboard/identity",
  nin_phone: "/dashboard/identity",
  bvn_verification: "/dashboard/bvn",
  jamb_result: "/dashboard/education",
  waec_result: "/dashboard/education",
  waec_scratch_card: "/dashboard/education",
  neco_result: "/dashboard/education",
  neco_scratch_card: "/dashboard/education",
  nabteb_result: "/dashboard/education",
  nbais_result: "/dashboard/education",
  cac_business_name: "/dashboard/cac",
  cac_limited_company: "/dashboard/cac",
  cac_incorporated_trustees: "/dashboard/cac",
};

const getServiceIcon = (serviceType: string) => {
  if (serviceType.startsWith('nin_')) return Fingerprint;
  if (serviceType.startsWith('bvn_')) return CreditCard;
  if (serviceType.startsWith('jamb_') || serviceType.startsWith('waec_') || 
      serviceType.startsWith('neco_') || serviceType.startsWith('nabteb_') ||
      serviceType.startsWith('nbais_')) return GraduationCap;
  if (serviceType.startsWith('cac_')) return Building2;
  if (serviceType.startsWith('airtime_')) return Smartphone;
  if (serviceType.startsWith('data_')) return Wifi;
  if (serviceType.startsWith('electricity_')) return Zap;
  if (serviceType.startsWith('cable_')) return Tv;
  return User;
};

const getServiceColor = (serviceType: string) => {
  if (serviceType.startsWith('nin_')) return "text-green-600";
  if (serviceType.startsWith('bvn_')) return "text-blue-600";
  if (serviceType.startsWith('jamb_') || serviceType.startsWith('waec_') || 
      serviceType.startsWith('neco_') || serviceType.startsWith('nabteb_') ||
      serviceType.startsWith('nbais_')) return "text-purple-600";
  if (serviceType.startsWith('cac_')) return "text-orange-600";
  if (serviceType.startsWith('airtime_')) return "text-blue-600";
  if (serviceType.startsWith('data_')) return "text-purple-600";
  if (serviceType.startsWith('electricity_')) return "text-yellow-600";
  if (serviceType.startsWith('cable_')) return "text-red-600";
  return "text-gray-600";
};

export default function Services() {
  const { data, isLoading } = useQuery({
    queryKey: ['/api/public/services'],
    queryFn: async () => {
      const res = await fetch('/api/public/services');
      const json = await res.json();
      return json.data as { services: ServicePricing[]; categorizedServices: CategorizedServices };
    },
  });

  const vtuServices = [
    { icon: Smartphone, title: "Airtime Top-up", description: "MTN, Airtel, Glo, 9mobile", href: "/dashboard/airtime", color: "text-blue-600", price: null },
    { icon: Wifi, title: "Data Bundles", description: "Daily, Weekly, Monthly Plans", href: "/dashboard/data", color: "text-purple-600", price: null }
  ];

  const subscriptionServices = [
    { icon: Zap, title: "Electricity Bills", description: "EKEDC, IKEDC, AEDC, PHED", href: "/dashboard/electricity", color: "text-yellow-600", price: null },
    { icon: Tv, title: "Cable TV", description: "DSTV, GOtv, Startimes", href: "/dashboard/cable", color: "text-red-600", price: null }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const identityServices = data?.categorizedServices?.identity || [];
  const educationServices = data?.categorizedServices?.education || [];
  const cacServices = data?.categorizedServices?.cac || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">All Services</h2>
        <p className="text-muted-foreground">Browse available services on Arapoint</p>
      </div>

      {identityServices.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-green-600" /> Identity Services
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {identityServices.map((service) => {
              const Icon = getServiceIcon(service.serviceType);
              const color = getServiceColor(service.serviceType);
              const href = serviceTypeToRoute[service.serviceType] || "/dashboard/identity";
              return (
                <Link key={service.id} href={href}>
                  <Card className="h-full flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                    <CardHeader>
                      <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{service.serviceName}</CardTitle>
                      <CardDescription className="text-sm">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <p className="text-lg font-bold text-primary">₦{parseFloat(service.price).toLocaleString()}</p>
                      <p className="text-sm text-primary font-medium mt-2">Continue →</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {educationServices.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" /> Education Services
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {educationServices.map((service) => {
              const Icon = getServiceIcon(service.serviceType);
              const color = getServiceColor(service.serviceType);
              const href = serviceTypeToRoute[service.serviceType] || "/dashboard/education";
              return (
                <Link key={service.id} href={href}>
                  <Card className="h-full flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                    <CardHeader>
                      <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{service.serviceName}</CardTitle>
                      <CardDescription className="text-sm">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <p className="text-lg font-bold text-primary">₦{parseFloat(service.price).toLocaleString()}</p>
                      <p className="text-sm text-primary font-medium mt-2">Continue →</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" /> VTU Services
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {vtuServices.map((service) => (
            <Link key={service.href} href={service.href}>
              <Card className="h-full flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                <CardHeader>
                  <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 ${service.color}`}>
                    <service.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-primary font-medium">Continue →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-600" /> Bill Payments
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {subscriptionServices.map((service) => (
            <Link key={service.href} href={service.href}>
              <Card className="h-full flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                <CardHeader>
                  <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 ${service.color}`}>
                    <service.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{service.title}</CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-primary font-medium">Continue →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {cacServices.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-600" /> Business Services
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cacServices.map((service) => {
              const Icon = getServiceIcon(service.serviceType);
              const color = getServiceColor(service.serviceType);
              const href = serviceTypeToRoute[service.serviceType] || "/dashboard/cac";
              return (
                <Link key={service.id} href={href}>
                  <Card className="h-full flex flex-col cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
                    <CardHeader>
                      <div className={`h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{service.serviceName}</CardTitle>
                      <CardDescription className="text-sm">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between">
                      <p className="text-lg font-bold text-primary">₦{parseFloat(service.price).toLocaleString()}</p>
                      <p className="text-sm text-primary font-medium mt-2">Continue →</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
