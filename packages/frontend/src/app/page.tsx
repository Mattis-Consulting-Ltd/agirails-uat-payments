import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { TaskTable } from "@/components/task-table";

const MOCK_TASKS = [
  {
    id: "task-001",
    title: "Voice Agent CRM Integration",
    project: "Pilot",
    agent: "agent-alpha",
    status: "paid" as const,
    updatedAt: "2026-03-08",
  },
  {
    id: "task-002",
    title: "Missed Call Capture Flow",
    project: "Pilot",
    agent: "agent-beta",
    status: "pinned" as const,
    updatedAt: "2026-03-08",
  },
  {
    id: "task-003",
    title: "SMS Follow-up Workflow",
    project: "Pilot",
    agent: "agent-alpha",
    status: "pending" as const,
    updatedAt: "2026-03-07",
  },
];

export default function Dashboard() {
  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>AGIRAILS escrow payment overview</p>
      </div>

      <div className="stat-grid">
        <StatCard title="Active Tasks" value={3} subtitle="1 pending" />
        <StatCard title="Proofs Submitted" value={2} />
        <StatCard title="Payments Released" value={1} subtitle="0.5 ETH" />
        <StatCard title="Escrow Balance" value="1.5 ETH" subtitle="Base Sepolia" />
      </div>

      <div className="section">
        <h2>Pipeline</h2>
        <div className="flow-pipeline">
          <div className="flow-step"><StatusBadge status="pending" /> <span>1</span></div>
          <span className="flow-arrow">&rarr;</span>
          <div className="flow-step"><StatusBadge status="uat-pass" /> <span>0</span></div>
          <span className="flow-arrow">&rarr;</span>
          <div className="flow-step"><StatusBadge status="pinned" /> <span>1</span></div>
          <span className="flow-arrow">&rarr;</span>
          <div className="flow-step"><StatusBadge status="paid" /> <span>1</span></div>
        </div>
      </div>

      <div className="section">
        <h2>Recent Tasks</h2>
        <TaskTable tasks={MOCK_TASKS} />
      </div>
    </>
  );
}
