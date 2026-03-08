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
      <body>{children}</body>
    </html>
  );
}
