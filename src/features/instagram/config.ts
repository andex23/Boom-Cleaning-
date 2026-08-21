import "server-only";

export type InstagramConnectionState = "not_configured" | "webhook_ready" | "connected";

export interface InstagramConnectionStatus {
  state: InstagramConnectionState;
  webhookConfigured: boolean;
  publishingConfigured: boolean;
  accountId: string | null;
}

export interface InstagramWebhookConfig {
  appSecret: string;
  verifyToken: string;
}

export function getInstagramWebhookConfig(): InstagramWebhookConfig | null {
  const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim();
  const verifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN?.trim();
  return appSecret && verifyToken ? { appSecret, verifyToken } : null;
}

export function getInstagramConnectionStatus(): InstagramConnectionStatus {
  const webhookConfigured = Boolean(getInstagramWebhookConfig());
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID?.trim() || null;
  const publishingConfigured = Boolean(accountId && process.env.INSTAGRAM_ACCESS_TOKEN?.trim());

  return {
    state: publishingConfigured ? "connected" : webhookConfigured ? "webhook_ready" : "not_configured",
    webhookConfigured,
    publishingConfigured,
    accountId,
  };
}
