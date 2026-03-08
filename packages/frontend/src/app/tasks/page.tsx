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

export default function TasksPage() {
  return (
    <>
      <div className="page-header">
        <h1>Tasks</h1>
        <p>All task assignments and their current status</p>
      </div>

      <div className="section">
        <TaskTable tasks={MOCK_TASKS} />
      </div>
    </>
  );
}
