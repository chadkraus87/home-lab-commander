import "server-only";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  // Next may normalize Request.url to `localhost` even when the browser reached
  // the development server through 127.0.0.1. The Host header preserves the
  // authority the browser actually used, so it is the right same-origin source.
  const requestHost = request.headers.get("host") ?? requestUrl.host;
  if (originUrl.host !== requestHost)
    throw new RequestSecurityError("Cross-origin mutation rejected.");
}

export class RequestSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestSecurityError";
  }
}
