"use client";

import { useRole } from "@/context/RoleContext";
// (import StudentProfile กับ AdminProfile ของคุณตามปกติ)
import StudentProfile from "@/components/StudentProfile"; 
import AdminProfile from "@/components/AdminProfile";

export default function ProfilePage() {
  // 🟢 ดึง loading ออกมาจาก Context ด้วย
  const { role, loading } = useRole();

  // 🟢 1. เช็กสถานะ Loading ก่อนเลย ถ้ากำลังโหลดให้โชว์ข้อความรอ
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem' }}>
        กำลังโหลดข้อมูลโปรไฟล์... ⏳
      </div>
    );
  }

  // 🟢 2. ถ้าโหลดเสร็จแล้ว แต่ไม่มี role (เช่น แอบเข้าหน้านี้โดยไม่ล็อกอิน) ให้เด้งกลับหน้าแรก
  if (!role) {
    if (typeof window !== "undefined") {
      window.location.href = "/"; // เด้งกลับไปหน้า Login
    }
    return null;
  }

  // 🟢 3. ถ้ามีข้อมูลครบถ้วน ค่อยโชว์หน้า Profile ตาม Role
  return (
    <>
      {role === "student" ? <StudentProfile /> : <AdminProfile />}
    </>
  );
}