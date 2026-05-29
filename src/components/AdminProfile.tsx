"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// 🚨 อย่าลืมเปลี่ยนพาธตามที่เก็บไฟล์ supabase client จริงของคุณนะครับ
import { supabase } from "@/lib/supabase"; 

export default function AdminProfile() {
  const router = useRouter(); 

  // State สำหรับเก็บข้อมูลจริงจากฐานข้อมูล
  const [adminInfo, setAdminInfo] = useState({
    id: "",
    name: "กำลังโหลด...",
    role: "ผู้ดูแลระบบ",
    email: "กำลังโหลด...",
    phone: "-",
    department: "-",
  });

  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // State สำหรับรับค่าอินพุตตอนแก้ไขข้อมูล
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");

  // 1. ฟังก์ชันดึงข้อมูลโปรไฟล์ของคนที่ล็อกอินจาก Supabase
  const fetchProfile = async () => {
    try {
      setLoading(true);
      // ดึง User ปัจจุบันจากระบบ Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/login");
        return;
      }

      // ดึงข้อมูลเสริมจากตาราง profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setAdminInfo({
          id: user.id,
          name: profile.full_name || "ไม่ระบุชื่อ",
          role: profile.role === "admin" ? "ผู้ดูแลระบบ (Super Admin)" : "ผู้ใช้งานทั่วไป",
          email: profile.email || user.email || "",
          phone: profile.phone || "-",
          department: profile.department || "-",
        });
        // ตั้งค่าเริ่มต้นให้กับ Input ตอนแก้ไข
        setEditPhone(profile.phone || "");
        setEditDepartment(profile.department || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลทันทีที่เปิดหน้าเว็บ
  useEffect(() => {
    fetchProfile();
  }, []);

  // 2. ฟังก์ชันอัปเดตข้อมูลไปยังฐานข้อมูล (เมื่อกดบันทึกแก้ไข)
  const handleSaveChanges = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: editPhone,
          department: editDepartment
        })
        .eq("id", adminInfo.id);

      if (error) throw error;
      
      // อัปเดตข้อมูลที่แสดงบนหน้าจอ
      setAdminInfo(prev => ({ ...prev, phone: editPhone, department: editDepartment }));
      setIsEditModalOpen(false);
      alert("อัปเดตข้อมูลสำเร็จ!");
    } catch (error: any) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    }
  };

  // 3. ฟังก์ชันออกจากระบบจริงผ่าน Supabase Auth
  const confirmLogout = async () => {
    await supabase.auth.signOut();
    setIsLogoutModalOpen(false);
    router.push("/login"); 
  };

  // ประวัติการทำงาน (Mock ชั่วคราว หรือดึงจากตาราง logs ในอนาคต)
  const activityLogs = [
    { id: 1, action: "เพิ่มประกาศใหม่: แจ้งปิดปรับปรุงระบบ", date: "14 เม.ย. 2026", time: "10:30 น." },
    { id: 2, action: "อนุมัติการจองสถานที่: ลานกิจกรรม กิจกรรมรับน้อง", date: "13 เม.ย. 2026", time: "15:45 น." },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(URL.createObjectURL(e.target.files[0]));
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>กำลังเชื่อมต่อฐานข้อมูล...</div>;
  }

  return (
    <div style={{ padding: "40px", maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ color: "#800000", marginBottom: "30px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span>👤</span> โปรไฟล์ของฉัน
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "30px", alignItems: "start" }}>
        {/* คอลัมน์ซ้าย: การ์ดโปรไฟล์ */}
        <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", textAlign: "center" }}>
          <div style={{ width: "120px", height: "120px", backgroundColor: "#f1f5f9", borderRadius: "50%", margin: "0 auto 20px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "3rem", border: "4px solid #800000", overflow: "hidden" }}>
            {profileImage ? (
              <img src={profileImage} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              "🧑‍💼"
            )}
          </div>

          <h2 style={{ margin: "0 0 5px 0", color: "#1e293b", fontSize: "1.4rem" }}>{adminInfo.name}</h2>
          <p style={{ margin: "0 0 20px 0", color: "#800000", fontWeight: "bold", fontSize: "0.9rem" }}>{adminInfo.role}</p>
          
          <input type="file" id="profile-upload" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <label htmlFor="profile-upload" style={{ display: "block", width: "100%", padding: "10px", backgroundColor: "white", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#475569", marginBottom: "10px", boxSizing: "border-box" }}>
            📷 เปลี่ยนรูปโปรไฟล์
          </label>

          <button onClick={() => setIsLogoutModalOpen(true)} style={{ width: "100%", padding: "10px", backgroundColor: "#ef4444", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "white" }}>
            🚪 ออกจากระบบ
          </button>
        </div>

        {/* คอลัมน์ขวา: ข้อมูลและประวัติ */}
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
                <button onClick={() => setIsPasswordModalOpen(true)} style={{ margin: 0, padding: "5px 10px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                  🔑 เปลี่ยนรหัสผ่าน
                </button>
              </div>
            </div>
          </div>

          {/* ประวัติการทำงาน */}
          <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
            <h3 style={{ margin: "0 0 20px 0", color: "#1e293b", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" }}>⏱️ ประวัติการทำรายการล่าสุด</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {activityLogs.map((log) => (
                <div key={log.id} style={{ display: "flex", gap: "15px", alignItems: "flex-start", borderBottom: "1px solid #f8fafc", paddingBottom: "10px" }}>
                  <div style={{ backgroundColor: "#fef2f2", color: "#800000", padding: "8px", borderRadius: "50%", fontSize: "0.8rem" }}>⚡</div>
                  <div>
                    <p style={{ margin: "0 0 5px 0", color: "#1e293b", fontWeight: "bold", fontSize: "0.95rem" }}>{log.action}</p>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>{log.date} • {log.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal แก้ไขข้อมูล */}
      {isEditModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
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

      {/* Modal ยืนยันการออกจากระบบ */}
      {isLogoutModalOpen && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
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
    </div>
  );
}