AGIRAILS UAT Payments Project Issues

Last updated: 2026-04-03

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

• Develop the contract using OpenZeppelin v5.
• Implement deposit, submitProof, and releasePayment functions.
• Use AccessControl for roles (Owner, Auditor, Agent).
• Adhere to Checks-Effects-Interactions pattern and include ReentrancyGuard.
• Define the data structure for the Proof (IPFS hash + metadata).
• Status: BLOCKED — WAITING ON AGI RAILS SDK UPDATE
• Priority: High
• Notes: contracts/contracts/ directory is empty. Hardhat configured for Base Sepolia with OpenZeppelin v5 ready. DO NOT BUILD YET. Damir (AGI Rails founder) is releasing a new SDK (published to NPM, stabilising over 1-2 days from 3 Apr) that changes how agent onboarding and contract interaction works. The new SDK may replace the need for custom Solidity. Wait for the SDK update and Damir's guidance before writing contracts.

3. Smart Contract Audit and Testnet Deployment

Perform security analysis on the contract and deploy it to the Base Testnet.

• Run Slither or similar static analysis tools to identify vulnerabilities.
• Write deployment scripts using Hardhat Ignition or standard ethers.js scripts.
• Deploy to Base Sepolia testnet.
• Verify the contract source code on Basescan.
• Status: BLOCKED — depends on Issue 2
• Priority: High
• Notes: AGI Rails protocol has a $1,000/tx limit on mainnet until their external audit is complete (~$50K cost, investor funding in progress). Testnet auto-mints 10,000 test USDC. Gasless transactions on Base (gas sponsored by AGI Rails). All initial testing will be on testnet.

4. Implement UAT Harness and Manifest Generator

Create scripts to wrap existing automation tasks and generate JSON proof manifests.

• Develop a wrapper (Node.js/Python) for the voice agent/n8n workflows.
• Upon completion, the script must gather logs, timestamps, and output artifacts.
• It must generate a JSON file adhering to a strict schema (using AJV for validation) containing the cryptographic hash of the artifacts and test results.
• Status: DONE
• Priority: Medium
• Notes: Fully implemented in packages/middleware/src/harness/. Runner executes shell commands, captures stdout/stderr, measures duration and exit code. Manifest generator creates v1.0.0 proof manifests with task/project/agent IDs, SHA-256 artifact hashes, test results (pass/fail with individual cases), structured logs, and manifest integrity hash. AJV schema validation with strict mode (no additional properties). Comprehensive test coverage.

5. Develop IPFS Integration Service

Build the service to pin proof manifests and artifacts to IPFS.

• Implement a module within the Middleware using a pinning service SDK (e.g., Pinata or Infura).
• Create functions to upload JSON manifests and binary artifacts, returning the IPFS CID.
• Ensure fallback logic is in place if the primary gateway is unresponsive.
• Status: DONE
• Priority: Medium
• Notes: Fully implemented in packages/middleware/src/ipfs/service.ts. Pinata API client with retry logic (exponential backoff up to 10s). Fallback gateway support. Returns IPFS CID. Tested.

6. Build Integration Bridge Middleware API

Develop the Node.js/Express API to receive proofs from UAT and orchestrate the flow.

• Create a REST API with endpoints like /api/submit-proof.
• Implement request validation, authentication (API Key), and logic to call the IPFS service.
• This layer acts as the bridge between the off-chain UAT harness and the on-chain smart contract.
• Status: DONE
• Priority: High
• Notes: Fully implemented. Express server on port 3001 with POST /api/submit-proof and GET /api/proofs/:taskId/status endpoints. API key authentication, rate limiting, request logging, error handling middleware. Validates manifests against schema, verifies integrity hashes, pins to IPFS, tracks proof status in memory. Prisma/Postgres schema defined but not yet wired into API endpoints. The on-chain submission step (calling the smart contract after IPFS pinning) is the gap — this is what the AGI Rails SDK will fill.

7. Implement On-Chain Transaction Manager

Develop the middleware component responsible for signing and sending transactions to Base.

• Integrate ethers.js or viem.
• Create a wallet manager that holds the 'Agent' or 'Bridge' private key.
• Implement logic to call the submitProof function on the smart contract after IPFS pinning.
• Include gas estimation, nonce management, and retry logic for network congestion.
• Status: BLOCKED — WAITING ON AGI RAILS SDK UPDATE
• Priority: High
• Notes: ethers v6.13 is in dependencies but not used in code. DO NOT BUILD MANUALLY. The new AGI Rails SDK provides: smart contract wallets (account abstraction), gasless transactions (USDC-only on Base, gas sponsored by AGI Rails), and simplified agent onboarding (one MD file, agent self-configures). This replaces the need for manual wallet management, gas estimation, and nonce handling. Wait for the SDK update, then integrate it here to call submitProof after IPFS pinning.

8. Develop Feedback Loop Service (Slack/Notion)

Create an event listener to update Notion and notify Slack upon contract state changes.

• Implement a background worker that polls or listens for PaymentReleased and ProofSubmitted events from the Smart Contract.
• On event detection, use Notion API to update the task status and Slack API to send a message to the specific channel.
• Status: PARTIALLY DONE
• Priority: Medium
• Notes: Slack webhook notification service and Notion API integration are both implemented in packages/middleware/src/notifications/. They fire on proof submission (ProofSubmitted events). What's missing: contract event listener for PaymentReleased events (depends on Issue 7). Once on-chain integration is in place, add event polling/listening to trigger notifications on payment release.

9. Construct Monitoring Dashboard

Build a frontend dashboard to visualize task status, proofs, and contract balance.

• Develop a React/Next.js page.
• Connect to the Middleware API to fetch recent tasks and directly to the Blockchain (via RPC) to fetch escrow balance.
• Embed Grafana panels if applicable, or build custom UI components to show the flow: Pending -> UAT Pass -> Proof Pinned -> Paid.
• Status: SCAFFOLDED
• Priority: Medium
• Notes: Next.js 15 frontend with React 19 is set up. 5 pages with sidebar navigation (Dashboard, Tasks, Proofs, Contracts, Settings). All pages use hardcoded mock data. No API connections. No blockchain RPC integration. This is UI scaffolding only. Wire to live API endpoints after Issues 2, 3, and 7 are complete.

10. Execute End-to-End Pilot

Run the complete flow with the selected voice-agent workload on Base Testnet.

• Configure the Pilot Task in the database.
• Fund the Escrow Contract.
• Trigger the UAT Harness.
• Verify the automated flow: Manifest generation -> IPFS Pin -> Contract Call -> Payment Release -> Slack Notification.
• Document the transaction hashes and logs.
• Status: BLOCKED — depends on Issues 2, 3, 7
• Priority: High
• Notes: The off-chain flow works (harness -> manifest -> IPFS -> notifications). The on-chain flow is the gap. Once AGI Rails SDK is integrated and contracts are deployed to testnet, this becomes a straight-through test. Damir offered to guide Patrick through the new onboarding process on a follow-up call. Testnet provides 10,000 auto-minted test USDC.

---

Summary

| Issue | Status | Blocker |
|-------|--------|---------|
| 1. Infrastructure & CI/CD | MOSTLY DONE | CI/CD pipeline not configured |
| 2. Escrow Smart Contract | BLOCKED | Waiting on AGI Rails SDK update |
| 3. Contract Audit & Deploy | BLOCKED | Depends on Issue 2 |
| 4. UAT Harness & Manifests | DONE | — |
| 5. IPFS Integration | DONE | — |
| 6. Middleware API | DONE | On-chain step pending |
| 7. On-Chain Transaction Manager | BLOCKED | Waiting on AGI Rails SDK update |
| 8. Feedback Loop (Slack/Notion) | PARTIALLY DONE | Contract event listener pending |
| 9. Monitoring Dashboard | SCAFFOLDED | Needs live API + blockchain |
| 10. End-to-End Pilot | BLOCKED | Depends on 2, 3, 7 |

Next action: Wait for Damir's SDK update notification (expected ~5 Apr), then integrate the AGI Rails SDK into packages/middleware, test on testnet, and share the repo with Damir for review.
