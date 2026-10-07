'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { supabase } from '@/utils/supabase';

export default function OneSignalInitializer() {
  useEffect(() => {
    const setupOneSignal = async () => {
      try {
        // Get current session to get the user ID
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) return;

        const userId = session.user.id;

        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "a392ce28-3295-4c14-b7a7-cf7833e00720",
          allowLocalhostAsSecureOrigin: true
        });

        // Prompt for notifications
        await OneSignal.Slidedown.promptPush();

        // Listen for subscription changes
        OneSignal.User.PushSubscription.addEventListener('change', async (subscription) => {
          if (subscription.current.optedIn) {
            const pushToken = subscription.current.id;

            if (pushToken) {
              await supabase
                .from('users')
                .update({ onesignal_id: pushToken })
                .eq('id', userId);
              console.log("OneSignal token updated for user:", userId);
            }
          }
        });
      } catch (error) {
        console.error("OneSignal initialization error:", error);
      }
    };

    setupOneSignal();
  }, []);

  return null; // This component doesn't render anything
}
