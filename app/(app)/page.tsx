'use client';

import { useEffect, useState } from 'react';
import { App } from '@/components/app/app';
import { ProtectedRoute } from '@/components/app/protected-route';
import { getAppConfig } from '@/lib/utils';

export default function Page() {
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
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <ProtectedRoute>
      <App appConfig={appConfig} />
    </ProtectedRoute>
  );
}
