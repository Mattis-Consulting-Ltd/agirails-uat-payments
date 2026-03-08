import "./globals.css";
import "./layout.css";
import { Sidebar } from "@/components/sidebar";

export const metadata = {
  title: "AGIRAILS UAT Payments",
  description: "UAT proof submission and escrow payment dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
