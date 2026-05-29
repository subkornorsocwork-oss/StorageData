"use client";
import { useRole } from "@/context/RoleContext";
import StudentComplaint from "@/components/StudentComplaint"; 
import AdminComplaint from "@/components/AdminComplaint";

export default function ComplaintPage() {
  const { role, loading } = useRole();

  if (loading) {
    return <main style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>กำลังโหลด...</main>;
  }

  return (
    <main>
      {role === "admin" ? <AdminComplaint /> : <StudentComplaint />}
    </main>
  );
}
