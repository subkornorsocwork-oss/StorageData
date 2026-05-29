"use client";

import { useRole } from "@/context/RoleContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import StudentHome from "@/components/StudentHome"; 
import AdminDashboard from "@/components/AdminDashboard"; 

export default function HomePage() {
  const { role, profile, loading } = useRole();
  const router = useRouter();

  useEffect(() => {
    // ถ้าโหลดข้อมูลเสร็จแล้ว และพบว่าไม่มีผู้ใช้ (ไม่ได้ล็อกอิน)
    if (!loading && !profile) {
      router.push('/login'); // ให้เตะไปหน้าล็อกอิน
    }
  }, [profile, loading, router]);

  // ระหว่างที่กำลังเช็คข้อมูลผู้ใช้ ให้โชว์หน้าโหลดไปก่อน
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span>กำลังโหลด...</span>
      </div>
    );
  }

  // ถ้าไม่ได้ล็อกอิน ไม่ต้อง render ด้านล่าง (เดี๋ยว router จะพาไปหน้า login เอง)
  if (!profile) return null;

  return (
    <>
      {role === "admin" ? <AdminDashboard /> : <StudentHome />}
    </>
  );
}