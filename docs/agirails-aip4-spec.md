# AGI Rails Integration Spec: AIP-4 Delivery Proof Standard

**Source:** Damir (AGI Rails founder), shared 3 April 2026 via WhatsApp
**Purpose:** Reference for integrating the UAT harness with AGI Rails protocol
**Status:** Implemented on Base Sepolia (Nov 2025) and mainnet (Feb 2026)

---

## Protocol Security Summary

### Audit Status
- Security audit passed February 2026, **zero findings** on smart contracts
- Static analysis: Slither, Mythril, Echidna run on every PR
- Smart contracts are **NOT upgradeable** (immutable deployment). No proxy, no delegatecall.

### Test Coverage
- 431+ test functions across 16+ test files (Foundry)
- 90%+ coverage overall, **100% for security-critical paths** (escrow, state transitions)
- Fuzz testing on escrow/dispute flows
- Categories: unit, integration, fuzz, security, edge cases, branch coverage

### Admin Controls
- Mainnet: 2-of-3 Gnosis Safe multisig
- 2-day timelock on economic parameter changes
- 7-day timelock on emergency withdrawals
- Separate pauser role (can only pause, cannot access funds)

---

## The 10 Protocol Invariants

These are guaranteed properties that always hold:

1. **Escrow Solvency** - vault balance >= all active transaction amounts + fees
2. **State Machine Integrity** - transitions are strictly one-way, no backwards
3. **Fee Bounds** - platform fee capped at 5% (currently 1%, $0.05 min)
4. **Deadline Enforcement** - no accepts after deadline
5. **Access Control** - only authorized parties trigger transitions
6. **Dispute Window** - funds can't finalize during active dispute window
7. **Pause Effectiveness** - all transitions blocked when paused
8. **Economic Parameter Delays** - fee changes require 2-day timelock
9. **Single Transaction Per ID** - no collisions, no overwrites
10. **Fund Conservation** - total USDC in = total USDC out

---

## Attack Vectors Covered

10 vectors, all mitigated:

| Vector | Mitigation |
|--------|-----------|
| Reentrancy | ReentrancyGuard + CEI pattern |
| Front-running | No economic benefit, first-come-first-served |
| Griefing | Deadline expiry, dispute window expiry |
| DoS | $0.05 minimum makes spam uneconomical |
| Admin key compromise | 3-of-5 multisig, 2-day timelock, 7-day emergency withdrawal |
| Dispute abuse | Penalty mechanism for losing party |
| Integer overflow | Solidity 0.8.x built-in protection |
| Timestamp manipulation | Windows are hours/days, miner can shift ~15s |
| Upgrade attacks | Contracts are immutable, no proxy |
| Oracle manipulation | No oracle dependency in current version |

---

## V1 Known Limitation: EAS Attestation Validation

The V1 contract does NOT validate EAS attestations on-chain:
- `ACTPKernel.anchorAttestation()` accepts any bytes32 value
- A malicious provider could submit a fake attestation UID

**Mitigations in place:**
- SDK method `releaseEscrowWithVerification()` performs client-side validation:
  - Verifies attestation exists on EAS
  - Checks attestation is not revoked
  - Validates attestation references correct txId
- Users who bypass the SDK and call the contract directly are at risk
- V2 deployment will add 7 on-chain EAS validation checks

**CRITICAL: Always use SDK methods, never call contract directly for escrow release.**

---

## AIP-4 Delivery Proof Standard

**EAS Schema UID:** `0x1b0ebdf0bd20c28ec9d5362571ce8715a55f46e81c3de2f9b0d8e1b95fb5ffce`

### DeliveryProof JSON Schema

```typescript
interface DeliveryProof {
  type: 'agirails.delivery.v1';       // Fixed identifier
  version: '1.0.0';                    // Semantic version
  txId: string;                        // bytes32 ACTP transaction ID
  provider: string;                    // DID (did:ethr:0x...)
  consumer: string;                    // DID (did:ethr:0x...)
  resultCID: string;                   // IPFS CID (CIDv1, base32)
  resultHash: string;                  // Keccak256 of canonical JSON
  easAttestationUID: string;           // bytes32 EAS attestation UID
  deliveredAt: number;                 // Unix timestamp
  metadata?: {
    executionTime?: number;            // ms
    outputFormat?: string;             // MIME type
    outputSize?: number;               // bytes
    notes?: string;
  };
  nonce: number;
  signature: string;                   // EIP-712 typed signature
  chainId: number;
}
```

### Storage Tiers

| Size | Storage | Rationale |
|------|---------|-----------|
| < 64KB | Inline | No external dependency |
| 64KB - 100MB | IPFS | Decentralized, content-addressed |
| > 100MB | Arweave (V1.1+) | Permanent storage |

### Dual-Proof System

1. **Off-chain** (IPFS): Full delivery data + metadata
2. **On-chain** (EAS): Cryptographic commitment (immutable, dispute-resistant)

---

## Delivery Flow

```
Provider completes work
  -> Uploads result to IPFS (gets CID)
  -> Creates EAS attestation (hashes CID + metadata)
  -> Anchors attestation UID to transaction
  -> Transitions state to DELIVERED
  -> Consumer verifies proof
  -> Escrow releases on acceptance
```

---

## UAT Harness Integration Mapping

| Patrick's UAT Harness | AGI Rails AIP-4 |
|------------------------|-----------------|
| Structured test plan | Transaction metadata (what's being tested) |
| Acceptance criteria | Encoded in proof metadata / off-chain spec |
| UAT pass/fail result | `resultHash` = Keccak256 of canonical UAT manifest JSON |
| Proof manifest | `resultCID` = IPFS-pinned full UAT results |
| Auto-release on pass | SDK: `releaseEscrowWithVerification()` called on UAT pass |

### Integration Flow (What We Build)

```
1. Requester creates ACTP transaction (scope of work + budget)
2. Provider accepts, escrow locks USDC
3. Provider does the work
4. Patrick's UAT harness runs against deliverable
5. UAT pass -> generate manifest, pin to IPFS (already built)
6. Submit proof via SDK -> EAS attestation created
7. State transitions to DELIVERED
8. Requester (or auto-accept after 48h) releases escrow
9. USDC flows to provider
```

### SDK Classes to Use

- `ProofGenerator` - `hashContent()`, `generateDeliveryProof()`, `verifyDeliverable()`
- `DeliveryProofBuilder` - full proof with IPFS upload + EAS attestation
- Both support EIP-712 signatures for cross-language compatibility

---

## Required Changes to Existing Code

1. **Hash algorithm:** Change SHA-256 to Keccak256 for manifest integrity hash. ethers provides `keccak256`.
2. **Proof schema:** Keep current rich manifest as the IPFS payload. Generate AIP-4 DeliveryProof as a wrapper that references it via `resultCID`.
3. **SDK integration:** Wire `DeliveryProofBuilder` after IPFS pinning step.
4. **Release flow:** UAT pass -> IPFS pin -> DeliveryProofBuilder -> escrow release via `releaseEscrowWithVerification()`.
5. **Never call contract directly.** V1 does not validate EAS attestations on-chain. SDK handles client-side validation.

---

## Testnet Details

- Network: Base Sepolia
- Auto-mints 10,000 test USDC on testnet (no faucet needed)
- Gasless transactions: USDC-only wallets, gas sponsored by AGI Rails
- Smart contract wallets (account abstraction), no ETH required
- $1,000/tx limit on mainnet until external audit cycle complete
