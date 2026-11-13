import type { CloudAlertRulePayload } from '@/lib/cloudAlertsSync';

export interface ServerUserAlertBundle {
  syncKeyId: string;
  enabled: boolean;
  pushSubscription?: unknown | null;
  telegramEnabled?: boolean;
  telegramChatId?: string;
  telegramBotToken?: string;
  rules: CloudAlertRulePayload[];
  firedMap: Record<string, number>;
  updatedAt: number;
}

const globalForAlerts = globalThis as unknown as {
  __serverAlertBundles?: Map<string, ServerUserAlertBundle>;
};

export function getServerAlertBundles(): Map<string, ServerUserAlertBundle> {
  if (!globalForAlerts.__serverAlertBundles) {
    globalForAlerts.__serverAlertBundles = new Map<string, ServerUserAlertBundle>();
  }
  return globalForAlerts.__serverAlertBundles;
}
