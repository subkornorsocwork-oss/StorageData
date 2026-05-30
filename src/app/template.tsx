"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useRole } from "@/context/RoleContext";
import { supabase } from "@/lib/supabase";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const isAdminPage = pathname.startsWith("/admin");

  const { role, fullName, profile, loading } = useRole();

  useEffect(() => {
    if (loading) return;

    if (!role && !isLoginPage) {
      router.push("/login");
      return;
    }

    if (role && isLoginPage) {
      router.push(role === "admin" ? "/admin" : "/");
      return;
    }

    if (role === "student" && isAdminPage) {
      router.push("/");
      return;
    }

    if (role === "admin" && !isAdminPage && !isLoginPage) {
      router.push("/admin");
      return;
    }
  }, [loading, role, isLoginPage, isAdminPage, router]);

  // Listen sign out only
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.push("/login");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // กำลัง redirect ไป /login — ไม่ต้องแสดงอะไร
  if (!loading && !role && !isLoginPage) {
    return null;
  }

  // หน้า admin ตอน loading — ไม่แสดง skeleton student
  if (loading && isAdminPage) {
    return null;
  }

  // Skeleton — แสดงเฉพาะหน้า student ตอน loading ครั้งแรก
  if (loading && !isLoginPage && !isAdminPage) {
    return (
      <div style={{ display: "flex", height: "100vh", backgroundColor: "#f8fafc", overflow: "hidden" }}>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            .skel-box { background-color: #e2e8f0; animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            @media (max-width: 768px) { .skel-sidebar { display: none !important; } .skel-content { padding: 15px !important; } }
          `
        }} />
        <div className="skel-sidebar" style={{ width: "260px", backgroundColor: "white", borderRight: "1px solid #e2e8f0", padding: "30px 20px", display: "flex", flexDirection: "column", gap: "24px", flexShrink: 0 }}>
          <div className="skel-box" style={{ height: "40px", borderRadius: "8px", width: "80%", marginBottom: "20px" }}></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skel-box" style={{ height: "24px", borderRadius: "6px", width: "90%" }}></div>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ height: "70px", backgroundColor: "white", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 40px", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
              <div className="skel-box" style={{ height: "14px", width: "120px", borderRadius: "4px" }}></div>
              <div className="skel-box" style={{ height: "10px", width: "70px", borderRadius: "4px" }}></div>
            </div>
            <div className="skel-box" style={{ width: "40px", height: "40px", borderRadius: "50%" }}></div>
          </div>
          <div className="skel-content" style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "30px" }}>
            <div className="skel-box" style={{ height: "36px", width: "30%", borderRadius: "8px", minWidth: "200px" }}></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "30px" }}>
              {[0, 1].map(i => (
                <div key={i} style={{ backgroundColor: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", height: "350px", display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div className="skel-box" style={{ height: "24px", width: "40%", borderRadius: "6px" }}></div>
                  <div className="skel-box" style={{ height: "100%", width: "100%", borderRadius: "8px", marginTop: "10px" }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .app-container { display: flex; height: 100vh; overflow: hidden; background-color: #f8fafc; }
        .content-wrapper { flex: 1; display: flex; flex-direction: column; overflow-y: auto; scroll-behavior: smooth; min-width: 0; }
        .main-content { animation: fadeIn 0.4s ease-in-out; flex: 1; }
        @media (max-width: 768px) { .app-container { flex-direction: column; } .main-content { padding: 15px !important; } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
      `}} />

      {!isLoginPage && !isAdminPage && <Sidebar />}

      <div className="content-wrapper">
        {!isLoginPage && !isAdminPage && (
          <header style={{
            height: "70px", backgroundColor: "white", borderBottom: "1px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "flex-end",
            padding: "0 40px", position: "sticky", top: 0, zIndex: 10, paddingLeft: "70px",
          }}>
            <Link href="/profile" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1e293b" }}>
                  {fullName || "ผู้ใช้งาน"}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {profile?.student_id ?? "-"}
                </div>
              </div>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                backgroundColor: "#f1f5f9", display: "flex", alignItems: "center",
                justifyContent: "center", border: "2px solid #800000",
                color: "#800000", flexShrink: 0,
              }}>
                👤
              </div>
            </Link>
          </header>
        )}

        <main className="main-content" style={{ padding: isLoginPage || isAdminPage ? "0" : "40px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}