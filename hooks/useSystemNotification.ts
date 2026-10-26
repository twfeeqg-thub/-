'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  systemNotification, 
  SystemNotificationPermission, 
  SendNotificationOptions 
} from '@/lib/systemNotification';

export function useSystemNotification() {
  const [permission, setPermission] = useState<SystemNotificationPermission>(() => systemNotification.getPermission());
  const [isSupported] = useState<boolean>(() => systemNotification.isSupported());
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const unsubscribe = systemNotification.subscribe((nextStatus) => {
      setPermission(nextStatus);
    });

    return unsubscribe;
  }, []);

  const requestPermission = useCallback(async () => {
    const res = await systemNotification.requestPermission();
    setPermission(res);
    return res;
  }, []);

  const sendNotification = useCallback(async (options: SendNotificationOptions) => {
    return systemNotification.sendNotification(options);
  }, []);

  const sendTestNotification = useCallback(async () => {
    setIsTesting(true);
    try {
      const success = await systemNotification.sendTestNotification();
      setPermission(systemNotification.getPermission());
      return success;
    } finally {
      setTimeout(() => setIsTesting(false), 1500);
    }
  }, []);

  return {
    isSupported,
    permission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isPromptable: permission === 'default',
    isTesting,
    requestPermission,
    sendNotification,
    sendTestNotification,
  };
}
