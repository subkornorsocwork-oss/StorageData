"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";

export default function AdminProfile() {
  const router = useRouter();
  const { profile, fullName, loading: roleLoading } = useRole();

  const [adminInfo, setAdminInfo] = useState({
    id: "",
    name: "กำลังโหลด...",
    role: "ผู้ดูแลระบบ",
    email: "กำลังโหลด...",
    phone: "-",
    department: "-",
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");

  useEffect(() => {
    if (!profile) return;

    const nextInfo = {
      id: profile.id,
      name: profile.full_name || fullName || "ไม่ระบุชื่อ",
      role: profile.role === "admin" ? "ผู้ดูแลระบบ (Super Admin)" : "ผู้ใช้งานทั่วไป",
      email: profile.email || "",
      phone: profile.phone || "-",
      department: profile.department || "-",
    };

    setAdminInfo(nextInfo);
    setEditPhone(profile.phone || "");
    setEditDepartment(profile.department || "");
  }, [profile, fullName]);

  const handleSaveChanges = async () => {
    if (!adminInfo.id) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: editPhone,
          department: editDepartment,
        })
        .eq("id", adminInfo.id);

      if (error) throw error;

      setAdminInfo((prev) => ({
        ...prev,
        phone: editPhone,
        department: editDepartment,
      }));
      setIsEditModalOpen(false);
      alert("อัปเดตข้อมูลสำเร็จ!");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "ไม่ทราบสาเหตุ";
      alert("เกิดข้อผิดพลาด: " + message);
    }
  };

  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setIsLogoutModalOpen(false);
    router.replace("/login");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  if (roleLoading) {
    return <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>กำลังเชื่อมต่อฐานข้อมูล...</div>;
  }

  if (!profile) {
    return (
      <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 6px rgba(0,0,0,0.06)" }}>
        <h2 style={{ marginTop: 0, color: "#1e293b" }}>ไม่พบข้อมูลโปรไฟล์</h2>
        <p style={{ color: "#64748b", lineHeight: 1.8 }}>
          ระบบเชื่อมต่อบัญชีได้แล้ว แต่ยังอ่านข้อมูลจากตาราง profiles ไม่สำเร็จ
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 16px",
            border: "none",
            borderRadius: "10px",
            backgroundColor: "#800000",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          โหลดใหม่
        </button>
      </div>
    );
  }

  const activityLogs = [
    { id: 1, action: "เพิ่มประกาศใหม่: แจ้งปิดปรับปรุงระบบ", date: "14 เม.ย. 2026", time: "10:30 น." },
    { id: 2, action: "อนุมัติการจองสถานที่: ลานกิจกรรม", date: "13 เม.ย. 2026", time: "15:45 น." },
  ];

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ color: "#800000", marginBottom: "30px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span>👤</span> โปรไฟล์ของฉัน
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px", alignItems: "start" }}>
        <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", textAlign: "center" }}>
          <div
            style={{
              width: "120px",
              height: "120px",
              backgroundColor: "#f1f5f9",
              borderRadius: "50%",
              margin: "0 auto 20px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "3rem",
              border: "4px solid #800000",
              overflow: "hidden",
            }}
          >
            {profileImage ? <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "🧑‍💼"}
          </div>

          <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontSize: "1.4rem" }}>{adminInfo.name}</h2>
          <p style={{ margin: "0 0 20px 0", color: "#800000", fontWeight: "bold", fontSize: "0.9rem" }}>{adminInfo.role}</p>

          <input type="file" id="profile-upload" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <label
            htmlFor="profile-upload"
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              color: "#475569",
              marginBottom: "10px",
              boxSizing: "border-box",
            }}
          >
            📷 เปลี่ยนรูปโปรไฟล์
          </label>

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            style={{ width: "100%", padding: "10px", backgroundColor: "#ef4444", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "white" }}
          >
            🚪 ออกจากระบบ
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, color: "#1e293b" }}>📝 ข้อมูลติดต่อ</h3>
              <button onClick={() => setIsEditModalOpen(true)} style={{ backgroundColor: "transparent", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "bold" }}>
                ✏️ แก้ไขข้อมูล
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "0.85rem" }}>อีเมล</p>
                <p style={{ margin: 0, color: "#1e293b", fontWeight: "bold" }}>{adminInfo.email}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "0.85rem" }}>เบอร์โทรศัพท์</p>
                <p style={{ margin: 0, color: "#1e293b", fontWeight: "bold" }}>{adminInfo.phone}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "0.85rem" }}>สังกัด / หน่วยงาน</p>
                <p style={{ margin: 0, color: "#1e293b", fontWeight: "bold" }}>{adminInfo.department}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 5px 0", color: "#64748b", fontSize: "0.85rem" }}>ความปลอดภัย</p>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  style={{ margin: 0, padding: "5px 10px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  🔑 เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#1e293b", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" }}>⏱️ ประวัติการทำรายการล่าสุด</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {activityLogs.map((log) => (
                <div key={log.id} style={{ display: "flex", gap: "15px", alignItems: "flex-start", borderBottom: "1px solid #f8fafc", paddingBottom: "10px" }}>
                  <div style={{ backgroundColor: "#fef2f2", color: "#800000", padding: "8px", borderRadius: "50%", fontSize: "0.8rem" }}>⚡</div>
                  <div>
                    <p style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "bold", fontSize: "0.95rem" }}>{log.action}</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>
                      {log.date} • {log.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#1e293b" }}>✏️ แก้ไขข้อมูลติดต่อ</h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "5px" }}>เบอร์โทรศัพท์</label>
              <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
            </div>
            <div style={{ marginBottom: "25px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#64748b", marginBottom: "5px" }}>สังกัด / หน่วยงาน</label>
              <input type="text" value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setIsEditModalOpen(false)} style={{ padding: "8px 16px", border: "none", backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>ยกเลิก</button>
              <button onClick={handleSaveChanges} style={{ padding: "8px 16px", border: "none", backgroundColor: "#3b82f6", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "350px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>🚪</div>
            <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>ยืนยันการออกจากระบบ</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "25px" }}>คุณต้องการออกจากระบบใช่หรือไม่?</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setIsLogoutModalOpen(false)} style={{ flex: 1, padding: "10px 16px", border: "none", backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>ยกเลิก</button>
              <button onClick={confirmLogout} style={{ flex: 1, padding: "10px 16px", border: "none", backgroundColor: "#ef4444", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>ออกจากระบบ</button>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", width: "360px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#1e293b" }}>🔐 เปลี่ยนรหัสผ่าน</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "24px" }}>ส่วนนี้ยังไม่ได้เชื่อม API รีเซ็ตรหัสผ่าน</p>
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              style={{ width: "100%", padding: "10px 16px", border: "none", backgroundColor: "#800000", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
