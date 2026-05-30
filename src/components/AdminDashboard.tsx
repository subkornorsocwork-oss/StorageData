"use client";
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from "@/lib/supabase";

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingBookings: 0,
    overdueItems: 0,
    totalUsers: 0,
    lostItems: 0
  });
  const [pendingList, setPendingList] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any[]>([]);
  const [facultyStats, setFacultyStats] = useState<any[]>([]);
  const [itemStats, setItemStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. คำขอจองรออนุมัติ
      const { count: pendingCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // 2. อุปกรณ์เกินกำหนดคืน
      const today = new Date().toISOString();
      const { count: overdueCount } = await supabase
        .from("borrow_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .is("actual_return", null)
        .lt("return_due_date", today);

      // 3. ผู้ใช้งานทั้งหมด
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // 4. ของหายเดือนนี้
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count: lostCount } = await supabase
        .from("lost_and_found")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      // 5. รายการจองรออนุมัติ 5 รายการล่าสุด
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`id, created_at, location, profiles ( full_name )`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      // 6. สัดส่วนผู้ใช้ student vs admin
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("role");
      if (profilesData) {
        const roleCounts: Record<string, number> = {};
        profilesData.forEach(p => {
          const label = p.role === "admin" ? "บุคลากร" : "นักศึกษา";
          roleCounts[label] = (roleCounts[label] || 0) + 1;
        });
        setUserStats(Object.entries(roleCounts).map(([name, value]) => ({ name, value })));
      }

      // 7. คณะที่มาใช้บริการ
      const { data: facultyData } = await supabase
        .from("profiles")
        .select("faculty");
      if (facultyData) {
        const counts: Record<string, number> = {};
        facultyData.forEach(p => {
          if (p.faculty) counts[p.faculty] = (counts[p.faculty] || 0) + 1;
        });
        setFacultyStats(Object.entries(counts).map(([name, value]) => ({ name, value })));
      }

      // 8. พัสดุที่ถูกยืมมากที่สุด (join borrow_items → equipment.name)
      const { data: borrowItemsData } = await supabase
        .from("borrow_items")
        .select(`quantity, equipment ( name )`);
      if (borrowItemsData) {
        const counts: Record<string, number> = {};
        borrowItemsData.forEach((b: any) => {
          const name = b.equipment?.name;
          if (name) counts[name] = (counts[name] || 0) + (b.quantity || 1);
        });
        const sorted = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));
        setItemStats(sorted);
      }

      setStats({
        pendingBookings: pendingCount || 0,
        overdueItems: overdueCount || 0,
        totalUsers: userCount || 0,
        lostItems: lostCount || 0
      });

      if (bookingsData) setPendingList(bookingsData);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateStatus = async (bookingId: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);
    if (error) {
      alert("เกิดข้อผิดพลาด: " + error.message);
    } else {
      alert("ทำรายการสำเร็จ!");
      fetchDashboardData();
    }
  };

  const CustomPieChart = ({ data, title }: { data: any[], title: string }) => (
    <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
      <h3 style={{ marginTop: 0, color: "#475569", textAlign: "center", fontSize: "1.1rem" }}>{title}</h3>
      {data.length === 0 ? (
        <div style={{ height: "250px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
          ไม่มีข้อมูล
        </div>
      ) : (
        <div style={{ height: "250px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div style={{ textAlign: "center", padding: "50px", color: "#64748b" }}>กำลังโหลดสถิติแดชบอร์ด...</div>;
  }

  return (
    <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
      <h1 style={{ color: "#1e293b", marginBottom: "30px" }}>📊 แดชบอร์ดผู้ดูแลระบบ</h1>

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

      <h2 style={{ color: "#1e293b", marginBottom: "20px" }}>📈 สถิติการใช้งานระบบ</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <CustomPieChart data={userStats} title="สัดส่วนยอดผู้ใช้" />
        <CustomPieChart data={facultyStats} title="คณะที่มาใช้บริการ" />
        <CustomPieChart data={itemStats} title="พัสดุที่ถูกยืมมากที่สุด" />
      </div>

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