import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { adminApi } from "@/lib/api/admin";

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

export default function AdminAnalytics() {
  const [, navigate] = useLocation();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load analytics data</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const serviceDistribution = [
    { name: 'Identity', value: stats?.bvnServices || 0, fill: COLORS[0] },
    { name: 'Education', value: stats?.educationServices || 0, fill: COLORS[1] },
    { name: 'VTU', value: stats?.vtuServices || 0, fill: COLORS[2] },
  ].filter(item => item.value > 0);

  const jobsData = [
    { name: 'Completed', value: stats?.completedJobs || 0, fill: COLORS[0] },
    { name: 'Pending', value: stats?.pendingJobs || 0, fill: COLORS[3] },
  ];

  const chartData = stats?.chartData || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Platform performance and metrics</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin")} size="sm" className="w-fit h-8 sm:h-9 text-xs sm:text-sm">
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">
              ₦{(stats?.totalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5 sm:mt-1">
              From all transactions
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate">Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">
              {(stats?.totalTransactions || 0).toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5 sm:mt-1">
              Total processed
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate">Total Users</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">
              {(stats?.totalUsers || 0).toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mt-0.5 sm:mt-1">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
            <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium truncate">RPA Jobs</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-xl lg:text-2xl font-bold">
              {((stats?.completedJobs || 0) + (stats?.pendingJobs || 0)).toLocaleString()}
            </div>
            <p className="text-[10px] sm:text-xs text-green-600 flex items-center gap-1 mt-0.5 sm:mt-1">
              {stats?.pendingJobs || 0} pending
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Service Distribution</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Usage by service type</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] sm:h-[250px] lg:h-[300px] p-2 sm:p-4 lg:p-6 pt-0">
            {serviceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius="70%"
                    fill="#8884d8"
                    dataKey="value"
                    fontSize={10}
                  >
                    {serviceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No service data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">RPA Job Status</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Completed vs Pending jobs</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] sm:h-[250px] lg:h-[300px] p-2 sm:p-4 lg:p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={35} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Jobs">
                  {jobsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">Service Usage Trend</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Services over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] sm:h-[250px] lg:h-[300px] p-2 sm:p-4 lg:p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="services" stroke="hsl(var(--primary))" strokeWidth={2} name="Services" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
