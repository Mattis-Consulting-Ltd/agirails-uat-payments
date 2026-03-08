export default function ProofsPage() {
  return (
    <>
      <div className="page-header">
        <h1>Proofs</h1>
        <p>Submitted proof manifests and IPFS records</p>
      </div>

      <div className="section">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>IPFS CID</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Voice Agent CRM Integration</td>
                <td style={{ fontFamily: "monospace", fontSize: 13 }}>QmXk9...7f2a</td>
                <td><span style={{ color: "#047857", fontWeight: 500 }}>Verified</span></td>
                <td>2026-03-08</td>
                <td>
                  <a href="#" style={{ marginRight: 12 }}>IPFS</a>
                  <a href="#">Basescan</a>
                </td>
              </tr>
              <tr>
                <td>Missed Call Capture Flow</td>
                <td style={{ fontFamily: "monospace", fontSize: 13 }}>QmRt3...9c1b</td>
                <td><span style={{ color: "#d97706", fontWeight: 500 }}>Pending</span></td>
                <td>2026-03-08</td>
                <td>
                  <a href="#">IPFS</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
