import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/MainLayout";

import Home from "@/pages/Home";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";

// Dashboard Imports
import DashboardLayout from "@/components/layout/DashboardLayout";
import AdminDashboardLayout from "@/components/layout/AdminDashboardLayout";
import Overview from "@/pages/dashboard/Overview";
import IdentityVerification from "@/pages/dashboard/IdentityVerification";
import IdentityServiceRouter from "@/pages/dashboard/identity/IdentityServiceRouter";
import BVNRetrieval from "@/pages/dashboard/BVNRetrieval";
import EducationServices from "@/pages/dashboard/EducationServices";
import VerificationHistory from "@/pages/dashboard/VerificationHistory";
import Services from "@/pages/dashboard/Services";
import VTUServices from "@/pages/dashboard/VTUServices";
import SubscriptionServices from "@/pages/dashboard/SubscriptionServices";
import AirtimeServices from "@/pages/dashboard/AirtimeServices";
import DataServices from "@/pages/dashboard/DataServices";
import ElectricityServices from "@/pages/dashboard/ElectricityServices";
import CableServices from "@/pages/dashboard/CableServices";
import CACServices from "@/pages/dashboard/CACServices";
import FundWallet from "@/pages/dashboard/FundWallet";

// CAC Agent Imports
import CACAgentLogin from "@/pages/agent/CACAgentLogin";
import CACAgentDashboard from "@/pages/agent/CACAgentDashboard";
import BuyPINs from "@/pages/dashboard/BuyPINs";
import Profile from "@/pages/dashboard/Profile";
import Settings from "@/pages/dashboard/Settings";
import Notifications from "@/pages/dashboard/Notifications";
import Chat from "@/pages/dashboard/Chat";

// Admin Imports
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminBVNServices from "@/pages/admin/AdminBVNServices";
import AdminEducationServices from "@/pages/admin/AdminEducationServices";
import AdminVTUServices from "@/pages/admin/AdminVTUServices";
import AdminIdentityServices from "@/pages/admin/AdminIdentityServices";
import AdminUserManagement from "@/pages/admin/AdminUserManagement";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminPricing from "@/pages/admin/AdminPricing";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminCACServices from "@/pages/admin/AdminCACServices";
import AdminCRUDLayout from "@/components/layout/AdminCRUDLayout";

function Router() {
  return (
    <Switch>
      {/* CAC Agent Routes - outside MainLayout */}
      <Route path="/agent/login" component={CACAgentLogin} />
      <Route path="/agent/dashboard" component={CACAgentDashboard} />
      
      {/* Admin Routes - outside MainLayout */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <AdminCRUDLayout>
          <AdminDashboard />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/identity">
        <AdminCRUDLayout>
          <AdminIdentityServices />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/bvn">
        <AdminCRUDLayout>
          <AdminBVNServices />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/education">
        <AdminCRUDLayout>
          <AdminEducationServices />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/vtu">
        <AdminCRUDLayout>
          <AdminVTUServices />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/users">
        <AdminCRUDLayout>
          <AdminUserManagement />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/analytics">
        <AdminCRUDLayout>
          <AdminAnalytics />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/pricing">
        <AdminCRUDLayout>
          <AdminPricing />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/roles">
        <AdminCRUDLayout>
          <AdminRoles />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/settings">
        <AdminCRUDLayout>
          <AdminSettings />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/cac">
        <AdminCRUDLayout>
          <AdminCACServices />
        </AdminCRUDLayout>
      </Route>
      
      {/* Main routes with header/footer */}
      <Route>
        <MainLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/signup" component={Signup} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard">
          <DashboardLayout>
            <Overview />
          </DashboardLayout>
        </Route>
        
        {/* Identity Hub */}
        <Route path="/dashboard/identity">
          <DashboardLayout>
            <IdentityVerification />
          </DashboardLayout>
        </Route>

        {/* Identity Services Dynamic Route */}
        <Route path="/dashboard/identity/:service">
          <DashboardLayout>
            <IdentityServiceRouter />
          </DashboardLayout>
        </Route>

        {/* BVN Retrieval */}
        <Route path="/dashboard/bvn-retrieval">
          <DashboardLayout>
            <BVNRetrieval />
          </DashboardLayout>
        </Route>

        <Route path="/dashboard/education">
          <DashboardLayout>
            <EducationServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/education/history">
          <DashboardLayout>
            <VerificationHistory />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/services">
          <DashboardLayout>
            <Services />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/vtu">
          <DashboardLayout>
            <VTUServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/subscriptions">
          <DashboardLayout>
            <SubscriptionServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/airtime">
          <DashboardLayout>
            <AirtimeServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/data">
          <DashboardLayout>
            <DataServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/electricity">
          <DashboardLayout>
            <ElectricityServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/cable">
          <DashboardLayout>
            <CableServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/cac">
          <DashboardLayout>
            <CACServices />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/fund-wallet">
          <DashboardLayout>
            <FundWallet />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/buy-pins">
          <DashboardLayout>
            <BuyPINs />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/profile">
          <DashboardLayout>
            <Profile />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/settings">
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/notifications">
          <DashboardLayout>
            <Notifications />
          </DashboardLayout>
        </Route>
        <Route path="/dashboard/chat">
          <DashboardLayout>
            <Chat />
          </DashboardLayout>
        </Route>

            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
