"use client";

import { useRole } from "@/context/RoleContext";
import StudentReturn from "@/components/StudentReturn";

export default function ReturnPage() {
  const { role, loading } = useRole();
  if (loading) return <main style={{ padding: 40, textAlign: "center" }}>กำลังโหลด...</main>;
  return role === "admin" ? <main style={{ padding: 40, textAlign: "center" }}>กรุณาใช้หน้าจัดการยืม-คืนสำหรับแอดมิน</main> : <StudentReturn />;
}
