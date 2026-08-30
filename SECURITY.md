# Security policy

## Supported version

Security fixes are applied to the current `main` branch and latest tagged release.

## Report a vulnerability

Use GitHub's **Report a vulnerability** private advisory flow for this repository. Do not open a public issue containing credentials, internal addresses, inventory, private logs, or exploit details. A minimal reproduction against Hosted Demo is preferred when possible.

Include the affected commit/version, impact, reproduction steps, and any suggested mitigation. Please allow reasonable time to validate and ship a fix before public disclosure.

## Scope and boundary

The public Vercel deployment is a constrained, ephemeral demonstration. Live Mode is single-operator software intended for loopback or an authenticated private Tailnet—not the public internet. Public-internet scanning, credential attacks, arbitrary shell execution, and unattended disruptive actions are outside the product boundary and will not be accepted.

See [docs/SECURITY.md](docs/SECURITY.md) for the architecture and threat boundaries.
