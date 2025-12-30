import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Users, DollarSign, AlertTriangle, FileCheck, ShieldCheck, BookOpen, Smartphone, Loader2, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

export default function AdminDashboard() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.getStats,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(1, 100),
  });

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(1)}K`;
    }
    return `₦${amount.toFixed(0)}`;
  };

  const adminStats = [
    { 
      name: 'Total Services', 
      value: statsLoading ? '...' : ((stats?.bvnServices || 0) + (stats?.educationServices || 0) + (stats?.vtuServices || 0)).toLocaleString(),
      icon: FileCheck, 
      color: 'text-indigo-600' 
    },
    { 
      name: 'Active Users', 
      value: statsLoading ? '...' : (stats?.totalUsers || 0).toLocaleString(),
      icon: Users, 
      color: 'text-blue-600' 
    },
    { 
      name: 'Total Revenue', 
      value: statsLoading ? '...' : formatCurrency(stats?.totalRevenue || 0),
      icon: DollarSign, 
      color: 'text-green-600' 
    },
    { 
      name: 'Pending', 
      value: statsLoading ? '...' : (stats?.pendingJobs || 0).toLocaleString(),
      icon: AlertTriangle, 
      color: 'text-red-600' 
    },
  ];

  const adminServices = [
    { 
      title: "Identity Verification", 
      icon: ShieldCheck, 
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
      desc: "Manage NIN, Phone, IPE verification",
      href: "/admin/identity",
      count: 0
    },
    { 
      title: "BVN Services", 
      icon: ShieldCheck, 
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/20",
      desc: "Retrieval, Card, Modification requests",
      href: "/admin/bvn",
      count: stats?.bvnServices || 0
    },
    { 
      title: "Education Services", 
      icon: BookOpen, 
      color: "text-purple-600",
      bg: "bg-purple-100 dark:bg-purple-900/20",
      desc: "JAMB, WAEC, NECO, NABTEB, NBAIS",
      href: "/admin/education",
      count: stats?.educationServices || 0
    },
    { 
      title: "VTU Services", 
      icon: Smartphone, 
      color: "text-orange-600",
      bg: "bg-orange-100 dark:bg-orange-900/20",
      desc: "Airtime, Data, Electricity, Cable",
      href: "/admin/vtu",
      count: stats?.vtuServices || 0
    },
    { 
      title: "Pricing Management", 
      icon: DollarSign, 
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
      desc: "Edit all service prices",
      href: "/admin/pricing",
      count: 11
    },
    { 
      title: "User Management", 
      icon: Users, 
      color: "text-blue-600",
      bg: "bg-blue-100 dark:bg-blue-900/20",
      desc: "Manage user accounts & status",
      href: "/admin/users",
      count: usersData?.users?.length || 0
    },
    { 
      title: "WhatsApp Notifications", 
      icon: MessageSquare, 
      color: "text-green-600",
      bg: "bg-green-100 dark:bg-green-900/20",
      desc: "Configure agent WhatsApp alerts",
      href: "/admin/whatsapp",
      count: 0
    },
  ];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Manage all platform services, users, and settings.</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">Logged in as: Administrator</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        {adminStats.map((stat) => (
          <Card key={stat.name} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-muted-foreground truncate pr-2">{stat.name}</CardTitle>
              <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${stat.color} flex-shrink-0`} />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4">Service Management</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {adminServices.map((service) => (
            <Card 
              key={service.href}
              className="cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 group active:scale-[0.98] touch-manipulation"
              onClick={() => navigate(service.href)}
              data-testid={`card-admin-${service.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <CardContent className="p-4 sm:p-5 lg:p-6 flex flex-col items-start gap-3 sm:gap-4 h-full">
                <div className={`p-2 sm:p-2.5 lg:p-3 rounded-lg ${service.bg}`}>
                  <service.icon className={`h-5 w-5 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${service.color}`} />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <h3 className="font-bold text-sm sm:text-base lg:text-lg truncate">{service.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{service.desc}</p>
                </div>
                <div className="w-full flex justify-between items-center pt-2 border-t">
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Requests</span>
                  <span className="text-base sm:text-lg font-bold text-primary">{service.count}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Services Volume</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Daily service requests over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] sm:h-[250px] lg:h-[300px] p-2 sm:p-4 lg:p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="services" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Service Breakdown</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Current services by type</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b text-sm sm:text-base">
                <span className="truncate pr-2">Identity Services</span>
                <span className="font-bold flex-shrink-0">0</span>
              </div>
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b text-sm sm:text-base">
                <span className="truncate pr-2">BVN Services</span>
                <span className="font-bold flex-shrink-0">{stats?.bvnServices || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b text-sm sm:text-base">
                <span className="truncate pr-2">Education Services</span>
                <span className="font-bold flex-shrink-0">{stats?.educationServices || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-2 sm:pb-3 border-b text-sm sm:text-base">
                <span className="truncate pr-2">VTU Services</span>
                <span className="font-bold flex-shrink-0">{stats?.vtuServices || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-1 sm:pt-2 text-sm sm:text-base">
                <span className="font-semibold truncate pr-2">Total Active Users</span>
                <span className="font-bold text-base sm:text-lg flex-shrink-0">{stats?.totalUsers || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
