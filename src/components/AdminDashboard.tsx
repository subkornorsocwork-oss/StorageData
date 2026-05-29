"use client";
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from "@/lib/supabase"; // 🚨 เช็คพาธตามโปรเจกต์ของคุณนะครับ

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  // State สำหรับเก็บข้อมูลสรุปสถิติตัวเลข
  const [stats, setStats] = useState({
    pendingBookings: 0,
    overdueItems: 0,
    totalUsers: 0,
    lostItems: 0
  });
  
  // State สำหรับเก็บรายการคำขอจองจากฐานข้อมูล
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ฟังก์ชันดึงสถิติต่างๆ และข้อมูลตาราง
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. นับจำนวนคำขอจองรอตรวจสอบ (Status = 'pending')
      const { count: pendingCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // 2. นับจำนวนผู้ใช้งานระบบทั้งหมดจากตาราง profiles
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // 3. ดึงรายการจองที่รอการตรวจสอบ 5 รายการล่าสุดมาลงตารางด้านล่าง
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          id, 
          created_at, 
          location, 
          profiles ( full_name )
        `) // ทำการ Join กับตาราง profiles เพื่อเอาชื่อผู้จอง
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      setStats({
        pendingBookings: pendingCount || 0,
        overdueItems: 2, // ใส่ Mock หรือผูกกับตารางอุปกรณ์เกินกำหนดส่งในอนาคต
        totalUsers: userCount || 0,
        lostItems: 14    // ใส่ Mock หรือผูกกับตารางของหายในอนาคต
      });

      if (bookingsData) {
        setPendingList(bookingsData);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ฟังก์ชันอนุมัติหรือปฏิเสธคำขอจอง
  const handleUpdateStatus = async (bookingId: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
      alert("ทำรายการสำเร็จ!");
      fetchDashboardData(); // โหลดข้อมูลใหม่หลังจากอัปเดต
    }
  };

  // --- ข้อมูลสถิติสำหรับกราฟวงกลม (Mock ไว้ก่อนสำหรับการจัดกลุ่มซับซ้อน) ---
  const userStats = [{ name: 'นักศึกษา', value: 1200 }, { name: 'บุคลากร', value: 150 }];
  const facultyStats = [
    { name: 'วิศวกรรมศาสตร์', value: 400 }, { name: 'บริหารธุรกิจ', value: 300 },
    { name: 'วิทยาศาสตร์', value: 300 }, { name: 'ศิลปศาสตร์', value: 200 }
  ];
  const clubStats = [
    { name: 'ชมรมดนตรี', value: 45 }, { name: 'ชมรมกีฬา', value: 60 },
    { name: 'ชมรมอาสา', value: 80 }, { name: 'ชมรมวิชาการ', value: 30 }
  ];
  const itemStats = [
    { name: 'เต็นท์', value: 120 }, { name: 'เครื่องเสียง', value: 85 },
    { name: 'เก้าอี้พลาสติก', value: 300 }, { name: 'โต๊ะพับ', value: 150 }
  ];

  const CustomPieChart = ({ data, title }: { data: any[], title: string }) => (
    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <h3 style={{ marginTop: 0, color: "#475569", textAlign: "center", fontSize: "1.1rem" }}>{title}</h3>
      <div style={{ height: "250px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>กำลังโหลดสถิติแดชบอร์ด...</div>;
  }

  return (
    <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ color: "#1e293b", marginBottom: "30px" }}>📊 แดชบอร์ดผู้ดูแลระบบ</h1>

      {/* 1. ส่วนการ์ดสรุปตัวเลขดึงค่ามาจาก State จริง */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "30px" }}>
        <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "20px", borderLeft: "8px solid #f59e0b", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ color: "#64748b", margin: 0, fontWeight: "bold" }}>คำขอจองรออนุมัติ</p>
          <h2 style={{ fontSize: "2.5rem", color: "#f59e0b", margin: "10px 0" }}>{stats.pendingBookings} รายการ</h2>
        </div>
        <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "20px", borderLeft: "8px solid #ef4444", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ color: "#64748b", margin: 0, fontWeight: "bold" }}>อุปกรณ์เกินกำหนดคืน</p>
          <h2 style={{ fontSize: "2.5rem", color: "#ef4444", margin: "10px 0" }}>{stats.overdueItems} รายการ</h2>
        </div>
        <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "20px", borderLeft: "8px solid #10b981", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ color: "#64748b", margin: 0, fontWeight: "bold" }}>ผู้ใช้งานระบบทั้งหมด</p>
          <h2 style={{ fontSize: "2.5rem", color: "#10b981", margin: "10px 0" }}>{stats.totalUsers.toLocaleString()} คน</h2>
        </div>
        <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "20px", borderLeft: "8px solid #3b82f6", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
          <p style={{ color: "#64748b", margin: 0, fontWeight: "bold" }}>แจ้งของหาย(เดือนนี้)</p>
          <h2 style={{ fontSize: "2.5rem", color: "#3b82f6", margin: "10px 0" }}>{stats.lostItems} รายการ</h2>
        </div>
      </div>

      {/* 2. ส่วนกราฟวงกลม */}
      <h2 style={{ color: "#1e293b", marginBottom: "20px" }}>📈 สถิติการใช้งานระบบ</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <CustomPieChart data={userStats} title="สัดส่วนยอดผู้ใช้" />
        <CustomPieChart data={facultyStats} title="คณะที่มาใช้บริการ" />
        <CustomPieChart data={clubStats} title="ชุมนุมที่มาใช้บริการ" />
        <CustomPieChart data={itemStats} title="พัสดุที่ถูกยืมมากที่สุด" />
      </div>

      {/* 3. ตารางรายการจากข้อมูลจริงในระบบ Supabase */}
      <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
        <h3 style={{ marginBottom: "20px", color: "#1e293b" }}>📝 คำขอจองสถานที่รอตรวจสอบ</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "2px solid #f1f5f9" }}>
              <th style={{ padding: "12px" }}>วันที่ขอใช้</th>
              <th style={{ padding: "12px" }}>สถานที่</th>
              <th style={{ padding: "12px" }}>ผู้จอง</th>
              <th style={{ padding: "12px" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {pendingList.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>ไม่มีคำขอจองค้างอยู่เลย 🎉</td>
              </tr>
            ) : (
              pendingList.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "15px" }}>{new Date(item.created_at).toLocaleDateString('th-TH')}</td>
                  <td style={{ padding: "15px", fontWeight: "bold" }}>{item.location}</td>
                  <td style={{ padding: "15px" }}>{item.profiles?.full_name || "ไม่ระบุชื่อ"}</td>
                  <td style={{ padding: "15px", display: "flex", gap: "10px" }}>
                    <button onClick={() => handleUpdateStatus(item.id, 'approved')} style={{ backgroundColor: "#10b981", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>✅ อนุมัติ</button>
                    <button onClick={() => handleUpdateStatus(item.id, 'rejected')} style={{ backgroundColor: "#ef4444", color: "white", border: "none", padding: "8px 15px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>❌ ปฏิเสธ</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}