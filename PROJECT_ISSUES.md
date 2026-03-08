AGIRAILS UAT Payments Project Issues

1. Initialize Project Infrastructure and CI/CD

Set up the monorepo structure for Contracts, Middleware, and Frontend, including CI/CD pipelines.

• Initialize a monorepo (e.g., Turborepo) containing workspaces for Hardhat (Solidity), Node.js (Middleware), and Next.js (Frontend).
• Configure GitHub Actions for linting, type-checking, and running unit tests on pull requests.
• Establish environment variable management for secrets (Alchemy/Infura keys, Private Keys, Slack Webhooks).
• Status: Pending
• Priority: High
2. Develop AGIRAILS Escrow Smart Contract

Implement the core Solidity smart contract for escrow, proof validation, and payment release.

• Develop the contract using OpenZeppelin v5.
• Implement deposit, submitProof, and releasePayment functions.
• Use AccessControl for roles (Owner, Auditor, Agent).
• Adhere to Checks-Effects-Interactions pattern and include ReentrancyGuard.
• Define the data structure for the Proof (IPFS hash + metadata).
• Status: Pending
• Priority: High
3. Smart Contract Audit and Testnet Deployment

Perform security analysis on the contract and deploy it to the Base Testnet.

• Run Slither or similar static analysis tools to identify vulnerabilities.
• Write deployment scripts using Hardhat Ignition or standard ethers.js scripts.
• Deploy to Base Sepolia testnet.
• Verify the contract source code on Basescan.
• Status: Pending
• Priority: High
4. Implement UAT Harness and Manifest Generator

Create scripts to wrap existing automation tasks and generate JSON proof manifests.

• Develop a wrapper (Node.js/Python) for the voice agent/n8n workflows.
• Upon completion, the script must gather logs, timestamps, and output artifacts.
• It must generate a JSON file adhering to a strict schema (using AJV for validation) containing the cryptographic hash of the artifacts and test results.
• Status: Pending
• Priority: Medium
5. Develop IPFS Integration Service

Build the service to pin proof manifests and artifacts to IPFS.

• Implement a module within the Middleware using a pinning service SDK (e.g., Pinata or Infura).
• Create functions to upload JSON manifests and binary artifacts, returning the IPFS CID.
• Ensure fallback logic is in place if the primary gateway is unresponsive.
• Status: Pending
• Priority: Medium
6. Build Integration Bridge Middleware API

Develop the Node.js/Express API to receive proofs from UAT and orchestrate the flow.

• Create a REST API with endpoints like /api/submit-proof.
• Implement request validation, authentication (API Key), and logic to call the IPFS service.
• This layer acts as the bridge between the off-chain UAT harness and the on-chain smart contract.
• Status: Pending
• Priority: High
7. Implement On-Chain Transaction Manager

Develop the middleware component responsible for signing and sending transactions to Base.

• Integrate ethers.js or viem.
• Create a wallet manager that holds the 'Agent' or 'Bridge' private key.
• Implement logic to call the submitProof function on the smart contract after IPFS pinning.
• Include gas estimation, nonce management, and retry logic for network congestion.
• Status: Pending
• Priority: High
8. Develop Feedback Loop Service (Slack/Notion)

Create an event listener to update Notion and notify Slack upon contract state changes.

• Implement a background worker that polls or listens for PaymentReleased and ProofSubmitted events from the Smart Contract.
• On event detection, use Notion API to update the task status and Slack API to send a message to the specific channel.
• Status: Pending
• Priority: Medium
9. Construct Monitoring Dashboard

Build a frontend dashboard to visualize task status, proofs, and contract balance.

• Develop a React/Next.js page.
• Connect to the Middleware API to fetch recent tasks and directly to the Blockchain (via RPC) to fetch escrow balance.
• Embed Grafana panels if applicable, or build custom UI components to show the flow: Pending -> UAT Pass -> Proof Pinned -> Paid.
• Status: Pending
• Priority: Medium
10. Execute End-to-End Pilot

Run the complete flow with the selected voice-agent workload on Base Testnet.

• Configure the Pilot Task in the database.
• Fund the Escrow Contract.
• Trigger the UAT Harness.
• Verify the automated flow: Manifest generation -> IPFS Pin -> Contract Call -> Payment Release -> Slack Notification.
• Document the transaction hashes and logs.
• Status: Pending
• Priority: High
