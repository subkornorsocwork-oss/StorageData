"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id: string;
  student_id: string | null;
  full_name: string;
  faculty: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  created_at: string;
}

interface UserHistory {
  bookings: any[];
  borrows: any[];
  complaints: any[];
}

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
};

export default function AdminUsers() {
  const [users, setUsers]               = useState<UserProfile[]>([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [history, setHistory]           = useState<UserHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── โหลดรายชื่อ users ──────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")  // แสดงเฉพาะ student
      .order("created_at", { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── โหลดประวัติของ user ─────────────────────────────────
  const loadHistory = async (userId: string) => {
    setLoadingHistory(true);
    const [bkRes, brRes, cpRes] = await Promise.all([
      supabase.from("bookings")
        .select("*, locations(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("borrow_requests")
        .select("*, borrow_items(quantity, equipment(name))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("complaints")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    setHistory({
      bookings:   bkRes.data ?? [],
      borrows:    brRes.data ?? [],
      complaints: cpRes.data ?? [],
    });
    setLoadingHistory(false);
  };

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    loadHistory(user.id);
  };

  // ── filter ──────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.full_name?.includes(searchTerm) ||
    u.student_id?.includes(searchTerm) ||
    u.faculty?.includes(searchTerm) ||
    u.email?.includes(searchTerm)
  );

  const bookingStatusText: Record<string, string> = {
    pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ", cancelled: "ยกเลิก",
  };
  const bookingStatusColor: Record<string, string> = {
    pending: "#f59e0b", approved: "#16a34a", rejected: "#ef4444", cancelled: "#94a3b8",
  };
  const borrowStatusText: Record<string, string> = {
    pending: "รอดำเนินการ", borrowing: "กำลังยืม", returned: "คืนแล้ว", overdue: "เกินกำหนด",
  };
  const complaintStatusText: Record<string, string> = {
    received: "รับเรื่องแล้ว", in_progress: "กำลังดำเนินการ", resolved: "แก้ไขแล้ว", closed: "ปิดเรื่อง",
  };

  // ── หน้ารายละเอียด user ─────────────────────────────────
  if (selectedUser) {
    return (
      <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
        <button onClick={() => { setSelectedUser(null); setHistory(null); }}
          style={{ padding: "8px 16px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", marginBottom: "24px" }}>
          ← กลับรายชื่อ
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "24px" }}>

          {/* ซ้าย: ข้อมูลส่วนตัว */}
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", textAlign: "center" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", backgroundColor: "#fef2f2", border: "3px solid #800000", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
              👤
            </div>
            <h2 style={{ margin: "0 0 4px", color: "#1e293b", fontSize: "1.1rem" }}>{selectedUser.full_name}</h2>
            <p style={{ margin: "0 0 20px", color: "#800000", fontWeight: 600, fontSize: "0.85rem" }}>
              {selectedUser.student_id ?? "-"}
            </p>
            <div style={{ textAlign: "left", borderTop: "1px solid #f1f5f9", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "คณะ", value: selectedUser.faculty ?? "-" },
                { label: "อีเมล", value: selectedUser.email ?? "-" },
                { label: "เบอร์โทร", value: selectedUser.phone ?? "-" },
                { label: "สมัครเมื่อ", value: fmtDate(selectedUser.created_at) },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", textTransform: "uppercase" }}>{f.label}</div>
                  <div style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 500 }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ขวา: ประวัติ */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {loadingHistory ? (
              <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "16px", textAlign: "center", color: "#94a3b8" }}>กำลังโหลดประวัติ...</div>
            ) : (
              <>
                {/* ประวัติการจอง */}
                <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#800000", fontSize: "1rem" }}>🏢 ประวัติการจองสถานที่ ({history?.bookings.length ?? 0})</h3>
                  {history?.bookings.length === 0 ? (
                    <p style={{ color: "#94a3b8", textAlign: "center", fontSize: "0.85rem" }}>ไม่มีประวัติ</p>
                  ) : history?.bookings.map(b => (
                    <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed #f1f5f9" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>{b.locations?.name ?? "-"}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{fmtDate(b.booking_date)} • {b.start_time?.slice(0,5)} - {b.end_time?.slice(0,5)}</div>
                      </div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: bookingStatusColor[b.status] }}>
                        ● {bookingStatusText[b.status] ?? b.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ประวัติการยืม */}
                <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#800000", fontSize: "1rem" }}>📦 ประวัติการยืม-คืน ({history?.borrows.length ?? 0})</h3>
                  {history?.borrows.length === 0 ? (
                    <p style={{ color: "#94a3b8", textAlign: "center", fontSize: "0.85rem" }}>ไม่มีประวัติ</p>
                  ) : history?.borrows.map(b => {
                    const items = b.borrow_items?.map((i: any) => `${i.equipment?.name} x${i.quantity}`).join(", ") ?? "-";
                    return (
                      <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed #f1f5f9" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>{items}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>ยืม: {fmtDate(b.borrow_date)}</div>
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                          {borrowStatusText[b.status] ?? b.status}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* ประวัติร้องเรียน */}
                <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
                  <h3 style={{ margin: "0 0 16px", color: "#800000", fontSize: "1rem" }}>📢 ประวัติการร้องเรียน ({history?.complaints.length ?? 0})</h3>
                  {history?.complaints.length === 0 ? (
                    <p style={{ color: "#94a3b8", textAlign: "center", fontSize: "0.85rem" }}>ไม่มีประวัติ</p>
                  ) : history?.complaints.map(c => (
                    <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px dashed #f1f5f9" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>{c.title}</div>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{fmtDate(c.created_at)}</div>
                      </div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                        {complaintStatusText[c.status] ?? c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── หน้ารายชื่อ ─────────────────────────────────────────
  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ color: "#800000", marginBottom: "24px" }}>👥 ระบบจัดการผู้ใช้งาน</h1>

      <div style={{ marginBottom: "20px" }}>
        <input type="text" placeholder="🔍 ค้นหาชื่อ, รหัสนักศึกษา, คณะ, อีเมล..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: "12px 20px", borderRadius: "10px", border: "1px solid #e2e8f0", width: "100%", maxWidth: "450px", fontSize: "0.9rem" }} />
      </div>

      <div style={{ backgroundColor: "white", borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>กำลังโหลด...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #800000" }}>
                  {["รหัสนักศึกษา","ชื่อ-นามสกุล","คณะ","เบอร์ติดต่อ","สมัครเมื่อ","จัดการ"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.83rem", fontWeight: 700, color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>ไม่พบข้อมูลนักศึกษา</td>
                  </tr>
                ) : filteredUsers.map((user, idx) => (
                  <tr key={user.id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "white" : "#fafafa" }}>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#800000", fontSize: "0.875rem" }}>
                      {user.student_id ?? "-"}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#fef2f2", border: "2px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "bold", color: "#800000", flexShrink: 0 }}>
                          {user.full_name?.charAt(0) ?? "?"}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1e293b" }}>{user.full_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569" }}>{user.faculty ?? "-"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#475569" }}>{user.phone ?? "-"}</td>
                    <td style={{ padding: "14px 16px", fontSize: "0.82rem", color: "#94a3b8" }}>{fmtDate(user.created_at)}</td>
                    <td style={{ padding: "14px 16px" }}>
                      <button onClick={() => handleSelectUser(user)}
                        style={{ backgroundColor: "#800000", color: "white", border: "none", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.82rem" }}>
                        🔍 ดูประวัติ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding: "12px 16px", fontSize: "0.8rem", color: "#94a3b8", textAlign: "right", borderTop: "1px solid #f1f5f9" }}>
          ทั้งหมด {filteredUsers.length} คน
        </div>
      </div>
    </div>
  );
}