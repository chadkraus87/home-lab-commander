import "server-only";

import { requestApprovedLocalUrl } from "@/server/local-http";
import { resolveSecretReference } from "@/server/secrets";

export interface NotificationMessage {
  title: string;
  body: string;
  severity: "critical" | "warning" | "info";
}

export async function sendConfiguredNotifications(
  message: NotificationMessage,
  approvedCidrs: string[],
): Promise<void> {
  const tasks: Promise<void>[] = [];
  const ntfyEndpoint = process.env.HOMELAB_NTFY_URL;
  const ntfyTokenRef = process.env.HOMELAB_NTFY_TOKEN_REF;
  if (ntfyEndpoint) {
    tasks.push(
      sendNtfy(new URL(ntfyEndpoint), ntfyTokenRef, message, approvedCidrs),
    );
  }
  const slackReference = process.env.HOMELAB_SLACK_WEBHOOK_REF;
  if (slackReference) {
    tasks.push(sendSlack(slackReference, message));
  }
  await Promise.allSettled(tasks);
}

async function sendNtfy(
  endpoint: URL,
  tokenRef: string | undefined,
  message: NotificationMessage,
  approvedCidrs: string[],
): Promise<void> {
  const headers: Record<string, string> = {
    title: message.title,
    priority: message.severity === "critical" ? "urgent" : "default",
  };
  if (tokenRef)
    headers.authorization = `Bearer ${await resolveSecretReference(tokenRef)}`;
  await requestApprovedLocalUrl(endpoint, {
    approvedCidrs,
    method: "POST",
    headers: { ...headers, "content-type": "text/plain" },
    body: message.body,
  });
}

async function sendSlack(
  reference: string,
  message: NotificationMessage,
): Promise<void> {
  const endpoint = new URL(await resolveSecretReference(reference));
  if (endpoint.protocol !== "https:" || endpoint.hostname !== "hooks.slack.com")
    throw new Error(
      "Slack notifications require an https://hooks.slack.com webhook.",
    );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: `*${message.title}*\n${message.body}` }),
    });
    if (!response.ok) throw new Error("Slack rejected the notification.");
  } finally {
    clearTimeout(timeout);
  }
}
