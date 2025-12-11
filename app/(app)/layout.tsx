'use client';

import { useEffect, useState } from 'react';
import { UserMenu } from '@/components/app/user-menu';
import { getAppConfig } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [appConfig, setAppConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getAppConfig(new Headers());
        setAppConfig(config);
      } catch (err) {
        console.error('Failed to load app config:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  if (isLoading || !appConfig) {
    return null;
  }

  const { logo, logoDark, companyName } = appConfig;

  return (
    <>
      <header className="fixed top-0 left-320 z-50 hidden w-full flex-row justify-between p-6 md:flex">
        <UserMenu />
      </header>

      {children}
    </>
  );
}
