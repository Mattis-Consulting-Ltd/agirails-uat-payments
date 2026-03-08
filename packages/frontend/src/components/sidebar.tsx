import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/tasks", label: "Tasks", icon: "list" },
  { href: "/proofs", label: "Proofs", icon: "shield" },
  { href: "/contracts", label: "Contracts", icon: "file-text" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>AGIRAILS</h2>
        <span className="sidebar-subtitle">UAT Payments</span>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="nav-item">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
