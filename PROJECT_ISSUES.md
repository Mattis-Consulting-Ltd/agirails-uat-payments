AGIRAILS UAT Payments Project Issues

Last updated: 2026-04-04

---

1. Initialize Project Infrastructure and CI/CD

Set up the monorepo structure for Contracts, Middleware, and Frontend, including CI/CD pipelines.

• Initialize a monorepo (e.g., Turborepo) containing workspaces for Hardhat (Solidity), Node.js (Middleware), and Next.js (Frontend).
• Configure GitHub Actions for linting, type-checking, and running unit tests on pull requests.
• Establish environment variable management for secrets (Alchemy/Infura keys, Private Keys, Slack Webhooks).
• Status: MOSTLY DONE
• Priority: High
• Notes: Turborepo monorepo is set up with all three workspaces (contracts, middleware, frontend). TypeScript strict mode, ESLint configured, turbo.json build pipeline defined. CI/CD via GitHub Actions not yet configured. Environment variable template (.env.example) in place.

2. Develop AGIRAILS Escrow Smart Contract

Implement the core Solidity smart contract for escrow, proof validation, and payment release.

• Status: REPLACED BY SDK
• Priority: N/A (resolved)
• Notes: SDK 3.0.0 compatibility review (Atlas, 3 Apr 2026) confirmed that @agirails/sdk handles the full escrow lifecycle: smart contract wallets (account abstraction), gasless transactions (USDC-only, gas sponsored by AGIRAILS), and simplified agent onboarding. No custom Solidity contracts needed. The contracts/ workspace can be removed from the monorepo. SDK integration wired into packages/middleware/src/sdk/.

3. Smart Contract Audit and Testnet Deployment

Perform security analysis on the contract and deploy it to the Base Testnet.

• Status: REPLACED BY SDK
• Priority: N/A (resolved)
• Notes: AGI Rails protocol passed security audit Feb 2026 (zero findings). 431+ test functions, 90%+ coverage, 100% on security-critical paths. Contracts are immutable (no proxy, no delegatecall). 2-of-3 Gnosis Safe multisig on mainnet. $1,000/tx limit on mainnet until external audit cycle complete. Testnet auto-mints 10,000 test USDC, gasless transactions. All security is handled by the protocol. Use `client.standard` API tier and `mode: 'testnet'` to start.

4. Implement UAT Harness and Manifest Generator

Create scripts to wrap existing automation tasks and generate JSON proof manifests.

• Status: DONE
• Priority: Medium
• Notes: Fully implemented in packages/middleware/src/harness/. Runner executes shell commands, captures stdout/stderr, measures duration and exit code. Manifest generator creates v1.0.0 proof manifests with task/project/agent IDs, SHA-256 artifact hashes, test results (pass/fail with individual cases), structured logs, and manifest integrity hash. AJV schema validation with strict mode (no additional properties). Comprehensive test coverage. SHA-256 manifestHash is retained for internal integrity. Keccak256 resultHash is generated separately by the SDK layer (dual-hash approach per Atlas recommendation).

5. Develop IPFS Integration Service

Build the service to pin proof manifests and artifacts to IPFS.

• Status: DONE
• Priority: Medium
• Notes: Fully implemented in packages/middleware/src/ipfs/service.ts. Pinata API client with retry logic (exponential backoff up to 10s). Fallback gateway support. Returns IPFS CID. Tested. Pinata remains in use for off-chain manifest pinning. The SDK's built-in IPFSClient handles on-chain proof flows (DeliveryProofBuilder) separately.

6. Build Integration Bridge Middleware API

Develop the Node.js/Express API to receive proofs from UAT and orchestrate the flow.

• Status: DONE (SDK integration wired)
• Priority: High
• Notes: Fully implemented. Express server on port 3001 with POST /api/submit-proof and GET /api/proofs/:taskId/status endpoints. API key authentication, rate limiting, request logging, error handling middleware. Validates manifests against schema, verifies integrity hashes, pins to IPFS, tracks proof status in memory. SDK integration added: when AGIRAILS_SDK_MODE is set and UAT passes, submit-proof handler automatically builds AIP-4 delivery proof (Keccak256 hash + EAS attestation) and releases escrow. ACTP transaction details passed via request headers (x-escrow-id, x-actp-tx-id, x-provider-did, x-consumer-did). Falls back to IPFS-only mode when SDK is not configured.

7. Implement On-Chain Transaction Manager

Develop the middleware component responsible for signing and sending transactions to Base.

• Status: REPLACED BY SDK
• Priority: N/A (resolved)
• Notes: SDK 3.0.0 handles wallet creation, gas sponsorship, nonce management, and the full escrow lifecycle. The SDK integration layer (packages/middleware/src/sdk/) wraps three SDK calls: ProofGenerator.hashContent() for Keccak256 resultHash, DeliveryProofBuilder.build() for IPFS + EAS attestation, and client.standard.releaseEscrow() for escrow release. No manual wallet management, gas estimation, or nonce handling needed.

8. Develop Feedback Loop Service (Slack/Notion)

Create an event listener to update Notion and notify Slack upon contract state changes.

• Status: PARTIALLY DONE
• Priority: Medium
• Notes: Slack webhook notification service and Notion API integration are both implemented in packages/middleware/src/notifications/. They fire on proof submission (ProofSubmitted events). The submit-proof handler now includes an onEscrowReleased callback for triggering notifications on escrow release. What's remaining: wire escrow release notifications into the notification service (Slack message + Notion status update when payment is released).

9. Construct Monitoring Dashboard

Build a frontend dashboard to visualize task status, proofs, and contract balance.

• Status: SCAFFOLDED
• Priority: Medium
• Notes: Next.js 15 frontend with React 19 is set up. 5 pages with sidebar navigation (Dashboard, Tasks, Proofs, Contracts, Settings). All pages use hardcoded mock data. No API connections. No blockchain RPC integration. This is UI scaffolding only. Wire to live API endpoints after SDK integration is tested end-to-end.

10. Execute End-to-End Pilot

Run the complete flow with the selected voice-agent workload on Base Testnet.

• Status: UNBLOCKED — ready to test
• Priority: High
• Notes: All dependencies resolved. The full flow is now wired: harness -> manifest (SHA-256) -> Pinata IPFS pin -> SDK ProofGenerator (Keccak256) -> DeliveryProofBuilder (EAS attestation) -> releaseEscrow. Next steps: (1) npm install to pull @agirails/sdk@3.0.0, (2) set AGIRAILS_SDK_MODE=testnet in .env, (3) run the middleware, (4) submit a test proof with ACTP headers, (5) verify escrow release on Base Sepolia. Damir offered to guide through the onboarding process on the next call. Testnet provides 10,000 auto-minted test USDC and gasless transactions.

---

Summary

| Issue | Status | Notes |
|-------|--------|-------|
| 1. Infrastructure & CI/CD | MOSTLY DONE | CI/CD pipeline not configured |
| 2. Escrow Smart Contract | REPLACED BY SDK | @agirails/sdk@3.0.0 handles escrow lifecycle |
| 3. Contract Audit & Deploy | REPLACED BY SDK | Protocol audit passed, zero findings |
| 4. UAT Harness & Manifests | DONE | Dual-hash: SHA-256 (internal) + Keccak256 (AIP-4) |
| 5. IPFS Integration | DONE | Pinata for off-chain, SDK IPFSClient for on-chain |
| 6. Middleware API | DONE | SDK integration wired into submit-proof |
| 7. On-Chain Transaction Manager | REPLACED BY SDK | SDK handles wallets, gas, nonce, escrow |
| 8. Feedback Loop (Slack/Notion) | PARTIALLY DONE | Escrow release notifications to wire |
| 9. Monitoring Dashboard | SCAFFOLDED | Needs live API + blockchain |
| 10. End-to-End Pilot | UNBLOCKED | Ready to test on Base Sepolia |

Next action: npm install, set AGIRAILS_SDK_MODE=testnet, run end-to-end test on Base Sepolia. Schedule onboarding call with Damir for guided walkthrough.
