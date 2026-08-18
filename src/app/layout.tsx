import { RoleProvider } from "@/context/RoleContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
