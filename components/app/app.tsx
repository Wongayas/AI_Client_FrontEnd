'use client';

import { useMemo, useState } from 'react';
import { TokenSource } from 'livekit-client';
import {
  RoomAudioRenderer,
  SessionProvider,
  StartAudio,
  useSession,
} from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { ViewController } from '@/components/app/view-controller';
import { Toaster } from '@/components/livekit/toaster';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';
import { getSandboxTokenSource } from '@/lib/utils';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const [userName, setUserName] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [selectedPersonality, setSelectedPersonality] = useState<string | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
  const tokenSource = useMemo(() => {
    const endpoint =
      typeof process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT === 'string'
        ? process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT
        : '/api/connection-details';
    const endpoint2 = 'http://localhost:8080/getToken'; // for local testing

    // Create a custom TokenSource so we can include client-selected options (like voice, personality, language)
    return TokenSource.custom(async () => {
      // Use endpoint2 if you want to test with external backend, otherwise use endpoint
      const urlString = endpoint; // Change to 'endpoint2' to use external/local backend
      // Support relative paths (like `/api/connection-details`) and absolute URLs
      const url = urlString.startsWith('http')
        ? new URL(urlString)
        : new URL(
            urlString,
            typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
          );
      const sandboxId = appConfig.sandboxId ?? '';
      const AI_SETTINGS_ENDPOINT =
        typeof process.env.NEXT_PUBLIC_AI_SETTINGS_ENDPOINT === 'string'
          ? process.env.NEXT_PUBLIC_AI_SETTINGS_ENDPOINT
          : 'http://localhost:8080/setAgentConfig';

      const agentEntry: Record<string, unknown> = {
        agent_name: appConfig.agentName,
      };
      if (selectedVoice) agentEntry['voice'] = selectedVoice;
      if (selectedPersonality) agentEntry['personality'] = selectedPersonality;
      if (selectedLanguage) agentEntry['language'] = selectedLanguage;
      if (userName) agentEntry['user_name'] = userName;

      const roomConfig = { agents: [agentEntry] };
      const payload = { room_config: roomConfig };

      try {
        console.log('Sending to backend:', JSON.stringify(payload, null, 2));
        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sandbox-Id': sandboxId,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error(`Backend returned ${res.status}: ${res.statusText}`);
        }

        const text = await res.text();
        console.log('Raw response text:', text);

        if (!text) {
          throw new Error('Backend returned empty response');
        }

        // Handle both: token string OR JSON object
        let data;
        try {
          data = JSON.parse(text);
          console.log('Response from backend (JSON):', data);
        } catch (e) {
          // If it's not JSON, assume it's a plain token string
          console.log('Response is a plain token string, wrapping it');
          data = { token: text };
          console.log('Response from backend (wrapped token):', data);
        }

        // Normalize token to a compact JWS string
        // Accept multiple field names that backends may return
        let tokenValue: unknown =
          data && typeof data === 'object'
            ? (data as any).token ||
              (data as any).participantToken ||
              (data as any).accessToken ||
              (data as any).participant_token
            : data;
        if (typeof tokenValue !== 'string') {
          // Try to coerce to string safely
          try {
            tokenValue = String(tokenValue ?? '');
          } catch (err) {
            throw new Error('Token value is not a string and cannot be coerced');
          }
        }

        // Trim possible surrounding quotes/newlines
        tokenValue = (tokenValue as string).trim();

        // Quick validation: compact JWS must have exactly 2 dots
        if ((tokenValue as string).split('.').length !== 3) {
          console.error('Invalid JWT format (not compact JWS):', tokenValue);
          throw new Error('Invalid JWT format returned from backend');
        }

        // Ensure wsUrl exists, fall back to serverUrl/url or default
        const ws =
          (data &&
            ((data as any).wsUrl ||
              (data as any).serverUrl ||
              (data as any).url ||
              (data as any).server_url)) ||
          'ws://localhost:7880';

        // livekit-client expects fields like `participantToken` and `serverUrl`
        const participantToken = tokenValue as string;

        // Create a masked preview (first 16 chars + '...' + last 8 chars) to help debugging
        const maskedPreview = (() => {
          try {
            const t = participantToken.trim();
            if (t.length <= 40) return t.replace(/.(?=.{4})/g, '*');
            const first = t.slice(0, 16);
            const last = t.slice(-8);
            return `${first}...${last}`;
          } catch (err) {
            return '<<unable to preview token>>';
          }
        })();

        const result = { participantToken, serverUrl: ws };
        console.log('TokenSource returning:', {
          participantTokenType: typeof result.participantToken,
          tokenLength:
            typeof result.participantToken === 'string'
              ? result.participantToken.length
              : undefined,
          tokenPreview: maskedPreview,
          serverUrl: result.serverUrl,
        });

        // Send AI settings to your Python endpoint (non-blocking).
        // This helps the server configure/prepare the AI agent without delaying token issuance.
        (async () => {
          try {
            console.log('Sending AI settings to backend:', AI_SETTINGS_ENDPOINT, payload);
            await fetch(AI_SETTINGS_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
          } catch (err) {
            console.error('Error sending AI settings to backend:', err);
          }
        })();

        return result;
      } catch (error) {
        console.error('Error fetching connection details:', error);
        throw new Error(`Error fetching connection details: ${error}`);
      }
    });
  }, [appConfig, userName, selectedVoice, selectedPersonality, selectedLanguage]);

  const session = useSession(
    tokenSource,
    appConfig.agentName ? { agentName: appConfig.agentName } : undefined
  );

  return (
    <SessionProvider session={session}>
      <AppSetup />
      <main className="grid h-svh grid-cols-1 place-content-center">
        <ViewController
          appConfig={appConfig}
          userName={userName}
          setUserName={setUserName}
          selectedVoice={selectedVoice}
          setSelectedVoice={setSelectedVoice}
          selectedPersonality={selectedPersonality}
          setSelectedPersonality={setSelectedPersonality}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
        />
      </main>
      <StartAudio label="Start Audio" />
      <RoomAudioRenderer />
      <Toaster />
    </SessionProvider>
  );
}
