import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Smartphone, Wifi } from "lucide-react";

export default function VTUServices() {
  const services = [
    { icon: Smartphone, title: "Buy Airtime", description: "MTN, Airtel, Glo, 9mobile", href: "/dashboard/airtime", color: "text-blue-600" },
    { icon: Wifi, title: "Data Bundles", description: "Daily, Weekly, Monthly Plans", href: "/dashboard/data", color: "text-blue-600" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">VTU Services</h2>
        <p className="text-muted-foreground">Purchase airtime and data bundles instantly.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {services.map((service) => (
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
  );
}
