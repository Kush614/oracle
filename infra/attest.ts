// Chainguard attestation script.
//
// Run as part of the CI pipeline after `docker build && docker push`:
//
//   tsx infra/attest.ts <image> <digest>
//
// Emits the attestation block (image, digest, sbom ref, verify cmd) that gets
// pinned via CHAINGUARD_DIGEST for the running resolver to embed into cited.md.

import { resolveAttestation } from '../lib/clients/chainguard';

const [, , imageArg, digestArg] = process.argv;
if (imageArg) process.env.CHAINGUARD_IMAGE = imageArg;
if (digestArg) process.env.CHAINGUARD_DIGEST = digestArg;

const att = resolveAttestation();

const block = [
  'Chainguard attestation',
  '='.repeat(60),
  `image:       ${att.image}`,
  `digest:      ${att.digest}`,
  `sbom_ref:    ${att.sbom_ref}`,
  'verify:',
  ...att.sigstore_verify_cmd.split('\n').map(l => '  ' + l),
  '',
  'Pin for runtime:',
  `  export CHAINGUARD_DIGEST="${att.digest}"`
].join('\n');

console.log(block);
