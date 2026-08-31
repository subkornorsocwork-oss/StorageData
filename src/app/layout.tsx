import type { Metadata } from "next";
import { RoleProvider } from "@/context/RoleContext";

export const metadata: Metadata = {
  title: "กน.สค. Services",
  icons: {
    icon: "/favicon.png?v=2",
    shortcut: "/favicon.png?v=2",
    apple: "/favicon.png?v=2",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" type="image/png" href="/favicon.png?v=2" />
        <link rel="apple-touch-icon" href="/favicon.png?v=2" />
      </head>
      <body style={{ margin: 0, padding: 0, width: "100%", minHeight: "100dvh", backgroundColor: '#f8fafc', fontFamily: 'sans-serif', overflowX: "hidden" }}>
        <RoleProvider>
          {/* ลบ Sidebar และ div flex ออกจากที่นี่ เพราะเราจะไปจัดการใน Template แทนเพื่อให้เช็คหน้า Login ได้ */}
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}
