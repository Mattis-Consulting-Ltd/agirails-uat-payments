export default function SettingsPage() {
  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Integration configuration and notification preferences</p>
      </div>

      <div className="section">
        <h2>Notifications</h2>
        <div className="placeholder-panel">
          Slack webhook URL, Notion API key, and Telegram bot token configuration will be added here.
        </div>
      </div>

      <div className="section">
        <h2>IPFS Gateway</h2>
        <div className="placeholder-panel">
          Connection test and retry parameter configuration for the private IPFS gateway.
        </div>
      </div>

      <div className="section">
        <h2>Contract</h2>
        <div className="placeholder-panel">
          Escrow contract address, network selection (testnet/mainnet), and RPC endpoint configuration.
        </div>
      </div>
    </>
  );
}
