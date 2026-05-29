"use client";

import { useRole } from "@/context/RoleContext";
import StudentBorrow from "@/components/StudentBorrow";
import AdminBorrow from "@/components/AdminBorrow";

export default function BorrowPage() {
  const { role, loading } = useRole();

  if (loading) {
    return <main style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>กำลังโหลด...</main>;
  }

  return (
    <>{role === "admin" ? <AdminBorrow /> : <StudentBorrow />}</>
  );
}
