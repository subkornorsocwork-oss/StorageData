"use client";
import { useRole } from "@/context/RoleContext";
// 🟢 แก้ชื่อตามไฟล์จริงใน Explorer ของคุณ (สะกดตัวเล็กทั้งหมด)
import Studentlostandfound from "@/components/Studentlostandfound"; 
import AdminLostFound from "@/components/AdminLostFound"; 

export default function LostAndFoundPage() {
  const { role, loading } = useRole();

  if (loading) {
    return <main style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>กำลังโหลด...</main>;
  }

  return (
    <main style={{ padding: "20px" }}>
      {role === "admin" ? <AdminLostFound /> : <Studentlostandfound />}
    </main>
  );
}
