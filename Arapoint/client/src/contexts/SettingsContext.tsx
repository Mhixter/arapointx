import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SiteSettings {
  siteName: string;
  siteEmail: string;
  sitePhone: string;
  siteAddress: string;
  maintenanceMode: boolean;
  currency: string;
  timezone: string;
}

const defaultSettings: SiteSettings = {
  siteName: "Arapoint Solutions",
  siteEmail: "support@arapoint.com.ng",
  sitePhone: "+234 800 123 4567",
  siteAddress: "Lagos, Nigeria",
  maintenanceMode: false,
  currency: "NGN",
  timezone: "Africa/Lagos",
};

interface SettingsContextType {
  settings: SiteSettings;
  isLoading: boolean;
  refetchSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  isLoading: true,
  refetchSettings: async () => {},
});

export function useSettings() {
  return useContext(SettingsContext);
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/public');
      if (response.ok) {
        const responseJson = await response.json();
        if (responseJson.status === 'success' && responseJson.data) {
          const data = responseJson.data;
          setSettings(prev => ({
            ...prev,
            siteName: data.siteName || prev.siteName,
            siteEmail: data.siteEmail || prev.siteEmail,
            sitePhone: data.sitePhone || prev.sitePhone,
            siteAddress: data.siteAddress || prev.siteAddress,
            maintenanceMode: data.maintenanceMode ?? prev.maintenanceMode,
            currency: data.currency || prev.currency,
            timezone: data.timezone || prev.timezone,
          }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch site settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refetchSettings = async () => {
    setIsLoading(true);
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, refetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}
