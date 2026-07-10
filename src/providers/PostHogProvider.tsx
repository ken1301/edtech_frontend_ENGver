'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const phHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
      
      if (phKey) {
        posthog.init(phKey, {
          api_host: phHost,
          person_profiles: 'always', 
          capture_pageview: true, 
        });
      } else {
        console.warn('PostHog API Key is missing. Tracking will not send to server.');
      }
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
