import { StatCard } from "@/components/stat-card";

export default function ContractsPage() {
  return (
    <>
      <div className="page-header">
        <h1>Contracts</h1>
        <p>Escrow contract status and on-chain transactions</p>
      </div>

      <div className="stat-grid">
        <StatCard title="Escrow Balance" value="1.5 ETH" subtitle="Base Sepolia" />
        <StatCard title="Total Deposited" value="2.0 ETH" />
        <StatCard title="Total Released" value="0.5 ETH" />
        <StatCard title="Transactions" value={3} />
      </div>

      <div className="section">
        <h2>Recent Transactions</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tx Hash</th>
                <th>Event</th>
                <th>Task</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontFamily: "monospace", fontSize: 13 }}>0xabc1...f234</td>
                <td>PaymentReleased</td>
                <td>Voice Agent CRM Integration</td>
                <td>0.5 ETH</td>
                <td>2026-03-08 14:22</td>
              </tr>
              <tr>
                <td style={{ fontFamily: "monospace", fontSize: 13 }}>0xdef5...6789</td>
                <td>ProofSubmitted</td>
                <td>Missed Call Capture Flow</td>
                <td>-</td>
                <td>2026-03-08 13:15</td>
              </tr>
              <tr>
                <td style={{ fontFamily: "monospace", fontSize: 13 }}>0x123a...bcde</td>
                <td>Deposit</td>
                <td>-</td>
                <td>2.0 ETH</td>
                <td>2026-03-07 10:00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <h2>Grafana Monitoring</h2>
        <div className="placeholder-panel">
          Grafana dashboard embed will be wired here once monitoring infrastructure is deployed.
        </div>
      </div>
    </>
  );
}
