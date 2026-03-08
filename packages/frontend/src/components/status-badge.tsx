type Status = "pending" | "uat-pass" | "pinned" | "submitted" | "accepted" | "paid" | "failed";

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  pending: { bg: "#f1f5f9", text: "#64748b", label: "Pending" },
  "uat-pass": { bg: "#dbeafe", text: "#2563eb", label: "UAT Pass" },
  pinned: { bg: "#e0e7ff", text: "#4f46e5", label: "Proof Pinned" },
  submitted: { bg: "#fef3c7", text: "#d97706", label: "Submitted" },
  accepted: { bg: "#d1fae5", text: "#059669", label: "Accepted" },
  paid: { bg: "#d1fae5", text: "#047857", label: "Paid" },
  failed: { bg: "#fee2e2", text: "#dc2626", label: "Failed" },
};

export function StatusBadge({ status }: { status: Status }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "13px",
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}
