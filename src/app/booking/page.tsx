"use client";
import { useRole } from "@/context/RoleContext";
import StudentBooking from "@/components/StudentBooking"; // เช็คชื่อไฟล์ StudentBooking.tsx ในเครื่อง
import AdminBooking from "@/components/AdminBooking";

export default function BookingPage() {
  const { role, loading } = useRole();

  if (loading) {
    return <main style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>กำลังโหลด...</main>;
  }

  return (
    <main>
      {role === "admin" ? <AdminBooking /> : <StudentBooking />}
    </main>
  );
}
