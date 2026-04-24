#!/usr/bin/env bash
# Demo verification script — reproduces the live cosign/grype check shown at 2:15.

set -e
IMAGE="${1:-cgr.dev/oracle/resolver:latest}"

echo "==> grype scan"
grype "$IMAGE" || true

echo
echo "==> cosign verify"
cosign verify "$IMAGE" \
  --certificate-identity-regexp='https://github.com/oracle-demo/.+' \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com

echo
echo "==> digest"
docker inspect --format='{{index .RepoDigests 0}}' "$IMAGE"
