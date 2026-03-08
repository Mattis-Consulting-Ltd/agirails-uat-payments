import { StatusBadge } from "./status-badge";

interface Task {
  id: string;
  title: string;
  project: string;
  agent: string;
  status: "pending" | "uat-pass" | "pinned" | "submitted" | "accepted" | "paid" | "failed";
  updatedAt: string;
}

export function TaskTable({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <p className="empty-state">No tasks found.</p>;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Project</th>
            <th>Agent</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>{task.title}</td>
              <td>{task.project}</td>
              <td>{task.agent}</td>
              <td>
                <StatusBadge status={task.status} />
              </td>
              <td>{task.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
