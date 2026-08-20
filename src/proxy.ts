import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const minimumTokenLength = 24;

export function proxy(request: NextRequest): NextResponse {
  if (isHostedDeployment() || request.nextUrl.pathname === "/api/health")
    return NextResponse.next();

  const expectedToken = process.env.HOMELAB_ACCESS_TOKEN;
  if (!expectedToken) return NextResponse.next();

  if (expectedToken.length < minimumTokenLength)
    return new NextResponse(
      `HOMELAB_ACCESS_TOKEN must contain at least ${minimumTokenLength} characters.`,
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );

  const credentials = readBasicCredentials(
    request.headers.get("authorization"),
  );
  const expectedUsername = process.env.HOMELAB_ACCESS_USERNAME ?? "homelab";
  if (
    credentials &&
    safeEqual(credentials.username, expectedUsername) &&
    safeEqual(credentials.password, expectedToken)
  )
    return NextResponse.next();

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="HomeLab Commander", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

function isHostedDeployment(): boolean {
  return process.env.HOMELAB_HOSTED_DEMO === "1" || process.env.VERCEL === "1";
}

function readBasicCredentials(
  authorization: string | null,
): { username: string; password: string } | null {
  if (!authorization?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString(
      "utf8",
    );
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}
