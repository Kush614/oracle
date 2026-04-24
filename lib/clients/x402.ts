// x402 — HTTP 402 micropayment gates (spec §12.3).
//
// Three gates:
//   - market_create     (0.10 paper USDC)
//   - evidence_unlock   (0.05)
//   - challenge_request (0.25)
//
// Fallback mode debits paper balances from InsForge. Live mode would forward
// to an x402-compatible PSP.

import { CONFIG } from '@shared/config';
import type { X402Quote } from '@shared/types';
import { adjustBalance, getBalance } from './insforge';

type Gate = X402Quote['gate'];

const prices: Record<Gate, number> = {
  market_create: CONFIG.x402.marketCreate,
  evidence_unlock: CONFIG.x402.evidenceUnlock,
  challenge_request: CONFIG.x402.challengeRequest
};

export function quote(gate: Gate, marketId?: string): X402Quote {
  const price = prices[gate];
  return {
    gate,
    market_id: marketId,
    price,
    currency: 'USDC_PAPER',
    payment_url: `/api/x402/pay?gate=${gate}${marketId ? `&market_id=${marketId}` : ''}`,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  };
}

export async function charge(userId: string, gate: Gate, marketId?: string): Promise<{ ok: true; quote: X402Quote; receipt: string } | { ok: false; reason: string; quote: X402Quote }> {
  const q = quote(gate, marketId);
  const bal = await getBalance(userId);
  if (bal.balance < q.price) {
    return { ok: false, reason: 'insufficient_balance', quote: q };
  }
  await adjustBalance(userId, -q.price);
  return { ok: true, quote: q, receipt: `rx_${gate}_${Date.now()}` };
}
