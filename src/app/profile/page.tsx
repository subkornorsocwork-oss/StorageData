"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/context/RoleContext";
import StudentProfile from "@/components/StudentProfile";
import AdminProfile from "@/components/AdminProfile";

export default function ProfilePage() {
  const router = useRouter();
  const { role, loading } = useRole();

  useEffect(() => {
    if (!loading && !role) {
      router.replace("/");
    }
  }, [loading, role, router]);

  if (loading && !role) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.5rem",
        }}
      >
        กำลังโหลดข้อมูลโปรไฟล์... ⏳
      </div>
    );
  }

  if (!role) {
    return null;
  }

  return <>{role === "student" ? <StudentProfile /> : <AdminProfile />}</>;
}
