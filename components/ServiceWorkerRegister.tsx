'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/utils/notifications';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
