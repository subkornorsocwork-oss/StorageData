import { RoleProvider } from "@/context/RoleContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <RoleProvider>
          {/* ลบ Sidebar และ div flex ออกจากที่นี่ เพราะเราจะไปจัดการใน Template แทนเพื่อให้เช็คหน้า Login ได้ */}
          {children}
        </RoleProvider>
      </body>
    </html>
  );
}