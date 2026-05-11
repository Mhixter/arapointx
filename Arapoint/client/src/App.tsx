import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import SuspendedPage from "@/pages/Suspended";
import { MainLayout } from "@/components/layout/MainLayout";

import Home from "@/pages/Home";
import DevLanding from "@/pages/developer/DevLanding";
import Login from "@/pages/auth/Login";
import Signup from "@/pages/auth/Signup";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import AboutUs from "@/pages/AboutUs";
import Careers from "@/pages/Careers";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import FeaturesPage from "@/pages/Features";
import ServicesPage from "@/pages/Services";
import PricingPage from "@/pages/Pricing";
import ContactPage from "@/pages/Contact";

import IdentityVerificationPage from "@/pages/seo/IdentityVerificationPage";
import NINVerificationPage from "@/pages/seo/NINVerificationPage";
import BVNVerificationPage from "@/pages/seo/BVNVerificationPage";
import EducationVerificationPage from "@/pages/seo/EducationVerificationPage";
import EmploymentScreeningPage from "@/pages/seo/EmploymentScreeningPage";
import KYCApiPage from "@/pages/seo/KYCApiPage";
import BackgroundChecksPage from "@/pages/seo/BackgroundChecksPage";
import BestIdentityPlatformPage from "@/pages/seo/BestIdentityPlatformPage";
import CompareVerifyMePage from "@/pages/seo/CompareVerifyMePage";

// Dashboard Imports
import DashboardLayout from "@/components/layout/DashboardLayout";
import AdminDashboardLayout from "@/components/layout/AdminDashboardLayout";
import Overview from "@/pages/dashboard/Overview";
import IdentityVerification from "@/pages/dashboard/IdentityVerification";
import IdentityServiceRouter from "@/pages/dashboard/identity/IdentityServiceRouter";
import IdentityAgentServices from "@/pages/dashboard/identity/IdentityAgentServices";
import BVNRetrieval from "@/pages/dashboard/BVNRetrieval";
import EducationServices from "@/pages/dashboard/EducationServices";
import JAMBServices from "@/pages/dashboard/JAMBServices";
import VerificationHistory from "@/pages/dashboard/VerificationHistory";
import IdentityHistory from "@/pages/dashboard/IdentityHistory";
import Services from "@/pages/dashboard/Services";
import VTUServices from "@/pages/dashboard/VTUServices";
import SubscriptionServices from "@/pages/dashboard/SubscriptionServices";
import AirtimeServices from "@/pages/dashboard/AirtimeServices";
import DataServices from "@/pages/dashboard/DataServices";
import ElectricityServices from "@/pages/dashboard/ElectricityServices";
import CableServices from "@/pages/dashboard/CableServices";
import CACServices from "@/pages/dashboard/CACServices";
import FundWallet from "@/pages/dashboard/FundWallet";
import AirtimeToCash from "@/pages/dashboard/AirtimeToCash";
import TransactionHistory from "@/pages/dashboard/TransactionHistory";

// Agent Imports
import CACAgentLogin from "@/pages/agent/CACAgentLogin";
import CACAgentDashboard from "@/pages/agent/CACAgentDashboard";
import IdentityAgentLogin from "@/pages/agent/IdentityAgentLogin";
import IdentityAgentDashboard from "@/pages/agent/IdentityAgentDashboard";
import EducationAgentLogin from "@/pages/agent/EducationAgentLogin";
import EducationAgentDashboard from "@/pages/agent/EducationAgentDashboard";
import A2CAgentLogin from "@/pages/agent/A2CAgentLogin";
import A2CAgentDashboard from "@/pages/agent/A2CAgentDashboard";
import JAMBAgentLogin from "@/pages/agent/JAMBAgentLogin";
import JAMBAgentDashboard from "@/pages/agent/JAMBAgentDashboard";
import EducationAgentPerformancePage from "@/pages/agent/EducationAgentPerformancePage";
import JAMBAgentPerformancePage from "@/pages/agent/JAMBAgentPerformancePage";
import IdentityAgentPerformancePage from "@/pages/agent/IdentityAgentPerformancePage";
import A2CAgentPerformancePage from "@/pages/agent/A2CAgentPerformancePage";
import CACAgentPerformancePage from "@/pages/agent/CACAgentPerformancePage";
import BuyPINs from "@/pages/dashboard/BuyPINs";
import Profile from "@/pages/dashboard/Profile";
import Settings from "@/pages/dashboard/Settings";
import Notifications from "@/pages/dashboard/Notifications";
import Chat from "@/pages/dashboard/Chat";
import FileStorage from "@/pages/dashboard/FileStorage";
import AdminSupportDashboard from "@/pages/admin/SupportDashboard";
import SupportAgentLogin from "@/pages/support/SupportAgentLogin";
import SupportAgentDashboard from "@/pages/support/SupportAgentDashboard";

// Admin Imports
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminForgotPassword from "@/pages/admin/AdminForgotPassword";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminBVNServices from "@/pages/admin/AdminBVNServices";
import AdminEducationServices from "@/pages/admin/AdminEducationServices";
import AdminVTUServices from "@/pages/admin/AdminVTUServices";
import AdminVTUMonitoring from "@/pages/admin/AdminVTUMonitoring";
import AdminIdentityServices from "@/pages/admin/AdminIdentityServices";
import AdminUserManagement from "@/pages/admin/AdminUserManagement";
import AdminAnalytics from "@/pages/admin/AdminAnalytics";
import AdminPricing from "@/pages/admin/AdminPricing";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminSettings from "@/pages/admin/AdminSettings";
import BannerStudio from "@/pages/admin/BannerStudio";
import AdminCACServices from "@/pages/admin/AdminCACServices";
import AdminIdentityAgents from "@/pages/admin/AdminIdentityAgents";
import AdminBirthAttestation from "@/pages/admin/AdminBirthAttestation";
import AdminEducationAgents from "@/pages/admin/AdminEducationAgents";
import AdminA2CAgents from "@/pages/admin/AdminA2CAgents";
import AdminJAMBAgents from "@/pages/admin/AdminJAMBAgents";
import AdminEducationPins from "@/pages/admin/AdminEducationPins";
import AdminAgentPerformance from "@/pages/admin/AdminAgentPerformance";
import AdminWhatsApp from "@/pages/admin/AdminWhatsApp";
import AdminTransactions from "@/pages/admin/AdminTransactions";
import AdminProfile from "@/pages/admin/AdminProfile";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminActivityLog from "@/pages/admin/AdminActivityLog";
import AdminRPAJobs from "@/pages/admin/AdminRPAJobs";
import AdminPortalHealth from "@/pages/admin/AdminPortalHealth";
import AdminDeveloperPortal from "@/pages/admin/AdminDeveloperPortal";
import AdminQueueMonitor from "@/pages/admin/AdminQueueMonitor";
import AdminLoginActivity from "@/pages/admin/AdminLoginActivity";
import AdminBroadcast from "@/pages/admin/AdminBroadcast";
import AdminRPARecovery from "@/pages/admin/AdminRPARecovery";
import AdminSearch from "@/pages/admin/AdminSearch";
import AdminCRUDLayout from "@/components/layout/AdminCRUDLayout";

// Developer Portal Imports
import DevLogin from "@/pages/developer/DevLogin";
import DevDashboard from "@/pages/developer/DevDashboard";
import DevApiKeys from "@/pages/developer/DevApiKeys";
import DevBilling from "@/pages/developer/DevBilling";
import DevLogs from "@/pages/developer/DevLogs";
import DevDocs from "@/pages/developer/DevDocs";
import DevAccount from "@/pages/developer/DevAccount";
import DevKyb from "@/pages/developer/DevKyb";
import DevWebhooks from "@/pages/developer/DevWebhooks";
import DevNotFound from "@/pages/developer/DevNotFound";

function Router() {
  return (
    <Switch>
      <Route path="/suspended" component={SuspendedPage} />

      {/* Support Agent Routes */}
      <Route path="/support/agent/login" component={SupportAgentLogin} />
      <Route path="/support/agent/dashboard" component={SupportAgentDashboard} />

      {/* Agent Routes - outside MainLayout */}
      <Route path="/agent/login" component={CACAgentLogin} />
      <Route path="/agent/dashboard" component={CACAgentDashboard} />
      <Route path="/agent/identity" component={IdentityAgentLogin} />
      <Route path="/agent/identity/dashboard" component={IdentityAgentDashboard} />
      <Route path="/agent/education" component={EducationAgentLogin} />
      <Route path="/agent/education/dashboard" component={EducationAgentDashboard} />
      <Route path="/agent/a2c/login" component={A2CAgentLogin} />
      <Route path="/agent/a2c/dashboard" component={A2CAgentDashboard} />
      <Route path="/agent/a2c/performance" component={A2CAgentPerformancePage} />
      <Route path="/jamb/agent/login" component={JAMBAgentLogin} />
      <Route path="/jamb/agent/dashboard" component={JAMBAgentDashboard} />
      <Route path="/jamb/agent/performance" component={JAMBAgentPerformancePage} />
      <Route path="/agent/education/performance" component={EducationAgentPerformancePage} />
      <Route path="/agent/identity/performance" component={IdentityAgentPerformancePage} />
      <Route path="/agent/cac/performance" component={CACAgentPerformancePage} />
      
      {/* Admin Routes - outside MainLayout */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/forgot-password" component={AdminForgotPassword} />
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
      <Route path="/admin/vtu-monitoring">
        <AdminCRUDLayout>
          <AdminVTUMonitoring />
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
      <Route path="/admin/banner-studio">
        <AdminCRUDLayout>
          <BannerStudio />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/cac">
        <AdminCRUDLayout>
          <AdminCACServices />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/identity-agents">
        <AdminCRUDLayout>
          <AdminIdentityAgents />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/birth-attestation">
        <AdminCRUDLayout>
          <AdminBirthAttestation />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/education-agents">
        <AdminCRUDLayout>
          <AdminEducationAgents />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/education-pins">
        <AdminCRUDLayout>
          <AdminEducationPins />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/a2c-agents">
        <AdminCRUDLayout>
          <AdminA2CAgents />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/jamb-agents">
        <AdminCRUDLayout>
          <AdminJAMBAgents />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/agent-performance">
        <AdminAgentPerformance />
      </Route>
      <Route path="/admin/rpa-jobs">
        <AdminCRUDLayout>
          <AdminRPAJobs />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/portal-health">
        <AdminCRUDLayout>
          <AdminPortalHealth />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/rpa-recovery">
        <AdminCRUDLayout>
          <AdminRPARecovery />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/search">
        <AdminCRUDLayout>
          <AdminSearch />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/whatsapp">
        <AdminCRUDLayout>
          <AdminWhatsApp />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/transactions">
        <AdminCRUDLayout>
          <AdminTransactions />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/support">
        <AdminCRUDLayout>
          <AdminSupportDashboard />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/profile">
        <AdminCRUDLayout>
          <AdminProfile />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/notifications">
        <AdminCRUDLayout>
          <AdminNotifications />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/logs">
        <AdminCRUDLayout>
          <AdminActivityLog />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/developer-portal">
        <AdminCRUDLayout>
          <AdminDeveloperPortal />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/employment-queue">
        <AdminCRUDLayout>
          <AdminQueueMonitor />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/login-activity">
        <AdminCRUDLayout>
          <AdminLoginActivity />
        </AdminCRUDLayout>
      </Route>
      <Route path="/admin/broadcast">
        <AdminCRUDLayout>
          <AdminBroadcast />
        </AdminCRUDLayout>
      </Route>

      {/* Developer Portal Landing (subdomain root) */}
      {window.location.hostname === "developer.arapoint.com.ng" && (
        <Route path="/" component={DevLanding} />
      )}

      <Route path="/developer" component={DevLanding} />
      {/* Developer Portal Routes */}
      <Route path="/developer/login" component={DevLogin} />
      <Route path="/developer/dashboard" component={DevDashboard} />
      <Route path="/developer/api-keys" component={DevApiKeys} />
      <Route path="/developer/billing" component={DevBilling} />
      <Route path="/developer/logs" component={DevLogs} />
      <Route path="/developer/docs" component={DevDocs} />
      <Route path="/developer/account" component={DevAccount} />
      <Route path="/developer/kyb" component={DevKyb} />
      <Route path="/developer/webhooks" component={DevWebhooks} />

      {/* Developer 404 - catches any unmatched /developer/* path before main layout */}
      <Route path="/developer/:rest*" component={DevNotFound} />

      {/* Subdomain catch-all: any unrecognised path on developer.arapoint.com.ng */}
      {window.location.hostname.includes("developer.arapoint") && (
        <Route component={DevNotFound} />
      )}

      {/* Main routes with header/footer */}
      <Route>
        <MainLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/features" component={FeaturesPage} />
            <Route path="/services" component={ServicesPage} />
            <Route path="/pricing" component={PricingPage} />
            <Route path="/contact" component={ContactPage} />
            <Route path="/about" component={AboutUs} />
            <Route path="/careers" component={Careers} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/auth/login" component={Login} />
            <Route path="/auth/signup" component={Signup} />
            <Route path="/auth/forgot-password" component={ForgotPassword} />

            <Route path="/identity-verification" component={IdentityVerificationPage} />
            <Route path="/nin-verification" component={NINVerificationPage} />
            <Route path="/bvn-verification" component={BVNVerificationPage} />
            <Route path="/education-verification" component={EducationVerificationPage} />
            <Route path="/employment-screening" component={EmploymentScreeningPage} />
            <Route path="/kyc-api" component={KYCApiPage} />
            <Route path="/background-checks" component={BackgroundChecksPage} />
            <Route path="/best-identity-verification-platform-nigeria" component={BestIdentityPlatformPage} />
            <Route path="/compare/verifyme-alternative" component={CompareVerifyMePage} />
        
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

        {/* Identity Agent Services */}
        <Route path="/dashboard/identity/agent-services">
          <DashboardLayout>
            <IdentityAgentServices />
          </DashboardLayout>
        </Route>

        {/* Identity History - must be before dynamic route */}
        <Route path="/dashboard/identity/history">
          <DashboardLayout>
            <IdentityHistory />
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
        <Route path="/dashboard/jamb">
          <DashboardLayout>
            <JAMBServices />
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
        <Route path="/dashboard/history">
          <DashboardLayout>
            <TransactionHistory />
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
        <Route path="/dashboard/airtime-to-cash">
          <DashboardLayout>
            <AirtimeToCash />
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
        <Route path="/dashboard/files">
          <DashboardLayout>
            <FileStorage />
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
  useEffect(() => {
    const ping = () => {
      if (!document.hidden) {
        fetch('/api/ping').catch(() => {});
      }
    };
    const intervalId = setInterval(ping, 3 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <TooltipProvider>
            <Toaster />
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </TooltipProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
