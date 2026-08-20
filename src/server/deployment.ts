import "server-only";

/**
 * Vercel cannot reach a visitor's private network. Hosted deployments therefore
 * run as a deliberately constrained, ephemeral showcase.
 */
export function isHostedDemo(): boolean {
  return process.env.HOMELAB_HOSTED_DEMO === "1" || process.env.VERCEL === "1";
}

export const hostedDemoMessage =
  "This hosted showcase is Demo Mode only. Run HomeLab Commander locally to use private-network discovery, diagnostics, imports, or Docker integration.";
