"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";

// ─── Types ────────────────────────────────────────────────────

interface BookingRow {
  id: number;
  status: "pending" | "approved" | "rejected";
  booking_date: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
  booker_type: string | null;
  org_name: string | null;
  document_url: string | null;
  admin_note: string | null;
  created_at: string;
  user_name: string;
  user_faculty: string | null;
  student_id: string | null;
  location_name: string;
}

interface Location {
  id: number;
  name: string;
  location_type: string | null;
  capacity: number | null;
  is_active: boolean;
}

// ─── Constants ────────────────────────────────────────────────

const THAI_MONTHS_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const THAI_MONTHS_FULL  = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS = ["อา","จ","อ","พ","พฤ","ศ","ส"];

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${Number(day)} ${THAI_MONTHS_SHORT[Number(m) - 1]} ${Number(y) + 543}`;
};
const fmtTime = (t: string) => t.slice(0, 5);

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "รอตรวจสอบ", color: "#b45309", bg: "#fef3c7" },
  approved: { label: "อนุมัติแล้ว", color: "#15803d", bg: "#dcfce7" },
  rejected: { label: "ปฏิเสธแล้ว", color: "#b91c1c", bg: "#fee2e2" },
};

// ─── Component ────────────────────────────────────────────────

export default function AdminBooking() {
  const { profile } = useRole();

  // แท็บ
  const [activeTab, setActiveTab] = useState<"requests" | "calendar" | "rooms">("requests");

  // ── แท็บ 1: คำขอจอง ──
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [search, setSearch] = useState("");

  // modal อนุมัติ/ปฏิเสธ
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: "approve" | "reject" | null;
    booking: BookingRow | null;
    rejectReason: string;
  }>({ isOpen: false, type: null, booking: null, rejectReason: "" });

  // ── แท็บ 2: ปฏิทิน ──
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  // ── แท็บ 3: สถานที่ ──
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(true);
  const [editingLoc, setEditingLoc] = useState<Location | null>(null);
  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [newLocName, setNewLocName] = useState("");
  const [newLocType, setNewLocType] = useState("room");
  const [newLocCap, setNewLocCap] = useState("");

  // feedback modal
  const [fb, setFb] = useState({ isOpen: false, status: "loading" as "loading"|"success"|"error", title: "", message: "" });

  // ─── Load bookings ──────────────────────────────────────────

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    let q = supabase.from("v_bookings_detail").select("*").order("created_at", { ascending: false });
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    const { data } = await q;
    setBookings(data ?? []);
    setLoadingBookings(false);
  }, [filterStatus]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  // ─── Load locations ─────────────────────────────────────────

  const loadLocations = useCallback(async () => {
    setLoadingLoc(true);
    const { data } = await supabase.from("locations").select("id, name, location_type, capacity, is_active").order("name");
    setLocations(data ?? []);
    setLoadingLoc(false);
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  // ─── Filter bookings ────────────────────────────────────────

  const filteredBookings = useMemo(() => {
    if (!search) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(b =>
      b.user_name?.toLowerCase().includes(q) ||
      b.student_id?.toLowerCase().includes(q) ||
      b.location_name?.toLowerCase().includes(q) ||
      b.org_name?.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  // ─── Approve ────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!actionModal.booking || !profile) return;
    setActionModal(p => ({ ...p, isOpen: false }));
    setFb({ isOpen: true, status: "loading", title: "กำลังอนุมัติ...", message: "" });
    const { error } = await supabase.from("bookings").update({
      status: "approved",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
    }).eq("id", actionModal.booking.id);
    if (error) {
      setFb({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
    } else {
      setFb({ isOpen: true, status: "success", title: "อนุมัติแล้ว ✅", message: `จอง ${actionModal.booking.location_name} ของ ${actionModal.booking.user_name} อนุมัติแล้ว` });
      await loadBookings();
    }
  };

  // ─── Reject ─────────────────────────────────────────────────

  const handleReject = async () => {
    if (!actionModal.booking || !profile || !actionModal.rejectReason.trim()) return;
    setActionModal(p => ({ ...p, isOpen: false }));
    setFb({ isOpen: true, status: "loading", title: "กำลังปฏิเสธ...", message: "" });
    const { error } = await supabase.from("bookings").update({
      status: "rejected",
      approved_by: profile.id,
      approved_at: new Date().toISOString(),
      admin_note: actionModal.rejectReason,
    }).eq("id", actionModal.booking.id);
    if (error) {
      setFb({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
    } else {
      setFb({ isOpen: true, status: "success", title: "ปฏิเสธแล้ว", message: `คำขอของ ${actionModal.booking.user_name} ถูกปฏิเสธแล้ว` });
      await loadBookings();
    }
  };

  // ─── Toggle location active ─────────────────────────────────

  const handleToggleLoc = async (loc: Location) => {
    const { error } = await supabase.from("locations").update({ is_active: !loc.is_active }).eq("id", loc.id);
    if (!error) await loadLocations();
  };

  // ─── Save edited location ────────────────────────────────────

  const handleSaveLoc = async () => {
    if (!editingLoc) return;
    const { error } = await supabase.from("locations").update({
      name: editingLoc.name,
      location_type: editingLoc.location_type,
      capacity: editingLoc.capacity,
    }).eq("id", editingLoc.id);
    if (!error) { setEditingLoc(null); await loadLocations(); }
  };

  // ─── Add new location ────────────────────────────────────────

  const handleAddLoc = async () => {
    if (!newLocName.trim()) return;
    const { error } = await supabase.from("locations").insert({
      name: newLocName,
      location_type: newLocType,
      capacity: newLocCap ? Number(newLocCap) : null,
      is_active: true,
    });
    if (!error) {
      setIsAddingLoc(false); setNewLocName(""); setNewLocType("room"); setNewLocCap("");
      await loadLocations();
    }
  };

  // ─── Calendar helpers ────────────────────────────────────────

  const daysInCalMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfCalMonth = new Date(calYear, calMonth, 1).getDay();
  const calBlanks = Array.from({ length: firstDayOfCalMonth });
  const calDays = Array.from({ length: daysInCalMonth }, (_, i) => i + 1);

  const changeCalMonth = (offset: number) => {
    let m = calMonth + offset, y = calYear;
    if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  };

  const approvedBookings = bookings.filter(b => b.status === "approved");

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: "#f1f5f9", padding: "40px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        <h1 style={{ color: "#800000", marginBottom: "24px", fontSize: "1.5rem" }}>
          📅 ระบบจัดการสถานที่และปฏิทิน
        </h1>

        {/* ── Tabs ── */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "30px", borderBottom: "2px solid #e2e8f0", paddingBottom: "0" }}>
          {([
            { key: "requests", label: "📝 จัดการคำขอจอง" },
            { key: "calendar", label: "🗓️ ปฏิทินการใช้งาน" },
            { key: "rooms",    label: "🏢 จัดการสถานที่" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 20px", border: "none", cursor: "pointer", fontWeight: "bold",
              borderBottom: activeTab === tab.key ? "3px solid #800000" : "3px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === tab.key ? "#800000" : "#64748b",
              transition: "all 0.2s", fontSize: "0.9rem",
            }}>
              {tab.label}
              {tab.key === "requests" && bookings.filter(b => b.status === "pending").length > 0 && (
                <span style={{ marginLeft: "6px", backgroundColor: "#800000", color: "white", borderRadius: "999px", padding: "1px 7px", fontSize: "0.75rem" }}>
                  {bookings.filter(b => b.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════ แท็บ 1: คำขอจอง ══════════ */}
        {activeTab === "requests" && (
          <div>
            {/* Filter + Search */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "6px", backgroundColor: "white", padding: "6px", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
                {(["pending","approved","rejected","all"] as const).map(s => {
                  const labels = { pending:"รอตรวจสอบ", approved:"อนุมัติแล้ว", rejected:"ปฏิเสธ", all:"ทั้งหมด" };
                  const active = filterStatus === s;
                  return (
                    <button key={s} onClick={() => setFilterStatus(s)} style={{
                      padding: "7px 14px", border: "none", borderRadius: "8px",
                      backgroundColor: active ? "#800000" : "transparent",
                      color: active ? "white" : "#64748b",
                      fontWeight: active ? "bold" : "normal",
                      cursor: "pointer", fontSize: "0.85rem",
                    }}>
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 ค้นหาชื่อ, รหัส, สถานที่..."
                style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }} />
            </div>

            <div style={{ backgroundColor: "white", borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden" }}>
              {loadingBookings ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>กำลังโหลด...</div>
              ) : filteredBookings.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "#94a3b8" }}>ไม่พบรายการ</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "750px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #800000" }}>
                        {["วันที่/เวลา","สถานที่","ผู้จอง","เอกสาร","สถานะ","จัดการ"].map(h => (
                          <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.83rem", fontWeight: 700, color: "#64748b" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b, idx) => {
                        const st = STATUS_STYLE[b.status];
                        return (
                          <tr key={b.id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "white" : "#fafafa" }}>
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1e293b" }}>{fmtDate(b.booking_date)}</div>
                              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{fmtTime(b.start_time)} – {fmtTime(b.end_time)}</div>
                            </td>
                            <td style={{ padding: "14px 16px", fontWeight: 700, color: "#800000", fontSize: "0.875rem" }}>{b.location_name}</td>
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{b.user_name}</div>
                              <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{b.org_name ?? b.user_faculty ?? b.student_id ?? ""}</div>
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              {b.document_url ? (
                                <a href={b.document_url} target="_blank" rel="noreferrer"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "5px 10px", backgroundColor: "#f1f5f9", color: "#475569", borderRadius: "7px", textDecoration: "none", fontSize: "0.8rem", fontWeight: 600 }}>
                                  📄 ดูไฟล์
                                </a>
                              ) : <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>ไม่มีไฟล์</span>}
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: "999px", backgroundColor: st.bg, color: st.color, fontSize: "0.78rem", fontWeight: 700 }}>
                                {st.label}
                              </span>
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              {b.status === "pending" ? (
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button onClick={() => setActionModal({ isOpen: true, type: "approve", booking: b, rejectReason: "" })}
                                    style={{ padding: "6px 12px", border: "none", borderRadius: "7px", backgroundColor: "#15803d", color: "white", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                                    ✅ อนุมัติ
                                  </button>
                                  <button onClick={() => setActionModal({ isOpen: true, type: "reject", booking: b, rejectReason: "" })}
                                    style={{ padding: "6px 12px", border: "none", borderRadius: "7px", backgroundColor: "#b91c1c", color: "white", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                                    ❌ ปฏิเสธ
                                  </button>
                                </div>
                              ) : <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>ดำเนินการแล้ว</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div style={{ marginTop: "10px", fontSize: "0.8rem", color: "#94a3b8", textAlign: "right" }}>
              แสดง {filteredBookings.length} รายการ
            </div>
          </div>
        )}

        {/* ══════════ แท็บ 2: ปฏิทิน ══════════ */}
        {activeTab === "calendar" && (
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <button onClick={() => changeCalMonth(-1)} style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}>&lt;</button>
              <h2 style={{ margin: 0, color: "#800000", fontSize: "1.2rem" }}>
                {THAI_MONTHS_FULL[calMonth]} {calYear + 543}
              </h2>
              <button onClick={() => changeCalMonth(1)} style={{ border: "none", background: "#f1f5f9", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}>&gt;</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
              {THAI_DAYS.map(d => (
                <div key={d} style={{ textAlign: "center", fontWeight: "bold", color: "#800000", paddingBottom: "10px", borderBottom: "2px solid #fecaca", fontSize: "0.9rem" }}>{d}</div>
              ))}
              {calBlanks.map((_, i) => <div key={`b${i}`} />)}
              {calDays.map(day => {
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayBookings = approvedBookings.filter(b => b.booking_date === dateStr);
                return (
                  <div key={day} style={{ minHeight: "90px", padding: "8px", border: "1px solid #f1f5f9", borderRadius: "10px", backgroundColor: "#fafafa" }}>
                    <div style={{ fontWeight: "bold", color: "#475569", marginBottom: "5px", fontSize: "0.9rem" }}>{day}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      {dayBookings.map(b => (
                        <div key={b.id} style={{ backgroundColor: "#800000", color: "white", fontSize: "0.68rem", padding: "3px 6px", borderRadius: "4px", lineHeight: "1.3" }}>
                          <strong>{fmtTime(b.start_time)}</strong> {b.location_name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════ แท็บ 3: จัดการสถานที่ ══════════ */}
        {activeTab === "rooms" && (
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "18px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0, color: "#1e293b" }}>🏢 รายชื่อสถานที่ทั้งหมด</h2>
              <button onClick={() => setIsAddingLoc(true)}
                style={{ backgroundColor: "#800000", color: "white", border: "none", padding: "10px 18px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                ➕ เพิ่มสถานที่ใหม่
              </button>
            </div>

            {loadingLoc ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>กำลังโหลด...</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #800000" }}>
                    {["รหัส","ชื่อสถานที่","ประเภท","ความจุ","สถานะ","จัดการ"].map(h => (
                      <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "0.83rem", fontWeight: 700, color: "#64748b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc, idx) => (
                    <tr key={loc.id} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "0.85rem" }}>ROOM-{loc.id}</td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: loc.is_active ? "#1e293b" : "#94a3b8" }}>{loc.name}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#64748b" }}>{loc.location_type ?? "-"}</td>
                      <td style={{ padding: "14px 16px", fontSize: "0.85rem", color: "#64748b" }}>{loc.capacity ? `${loc.capacity} คน` : "-"}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700, backgroundColor: loc.is_active ? "#dcfce7" : "#f1f5f9", color: loc.is_active ? "#15803d" : "#64748b" }}>
                          {loc.is_active ? "🟢 เปิดบริการ" : "⚫ ปิดปรับปรุง"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => setEditingLoc({ ...loc })}
                            style={{ padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: "7px", background: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#475569" }}>
                            ✏️ แก้ไข
                          </button>
                          <button onClick={() => handleToggleLoc(loc)}
                            style={{ padding: "6px 12px", border: "none", borderRadius: "7px", backgroundColor: loc.is_active ? "#b91c1c" : "#15803d", color: "white", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, minWidth: "90px" }}>
                            {loc.is_active ? "ปิดบริการ" : "เปิดบริการ"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>

      {/* ══ Feedback Modal ══ */}
      {fb.isOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "380px", textAlign: "center" }}>
            {fb.status === "loading" && <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #800000", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />}
            {fb.status === "success" && <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>}
            {fb.status === "error"   && <div style={{ fontSize: "48px", marginBottom: "12px" }}>❌</div>}
            <h2 style={{ margin: "0 0 10px" }}>{fb.title}</h2>
            <p style={{ color: "#64748b", marginBottom: "20px" }}>{fb.message}</p>
            {fb.status !== "loading" && (
              <button onClick={() => setFb(p => ({ ...p, isOpen: false }))}
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: "10px", backgroundColor: "#800000", color: "white", fontWeight: "bold", cursor: "pointer" }}>
                ตกลง
              </button>
            )}
          </div>
        </div>
      )}

      {/* ══ Modal อนุมัติ/ปฏิเสธ ══ */}
      {actionModal.isOpen && actionModal.booking && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9998, padding: "20px" }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "460px" }}>
            <h3 style={{ margin: "0 0 18px" }}>
              {actionModal.type === "approve" ? "✅ ยืนยันการอนุมัติ" : "❌ ยืนยันการปฏิเสธ"}
            </h3>
            <div style={{ backgroundColor: "#f8fafc", padding: "14px", borderRadius: "10px", marginBottom: "18px", fontSize: "0.875rem", lineHeight: "1.9" }}>
              <div><b>ผู้จอง:</b> {actionModal.booking.user_name} ({actionModal.booking.student_id})</div>
              <div><b>สถานที่:</b> {actionModal.booking.location_name}</div>
              <div><b>วันที่:</b> {fmtDate(actionModal.booking.booking_date)}</div>
              <div><b>เวลา:</b> {fmtTime(actionModal.booking.start_time)} – {fmtTime(actionModal.booking.end_time)}</div>
              <div><b>วัตถุประสงค์:</b> {actionModal.booking.purpose ?? "-"}</div>
            </div>
            {actionModal.type === "reject" && (
              <div style={{ marginBottom: "18px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, fontSize: "0.9rem" }}>
                  เหตุผลการปฏิเสธ <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea rows={3} value={actionModal.rejectReason}
                  onChange={e => setActionModal(p => ({ ...p, rejectReason: e.target.value }))}
                  placeholder="ระบุเหตุผล..."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", resize: "none", fontSize: "0.9rem" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setActionModal(p => ({ ...p, isOpen: false }))}
                style={{ flex: 1, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600 }}>
                ยกเลิก
              </button>
              <button
                onClick={actionModal.type === "approve" ? handleApprove : handleReject}
                disabled={actionModal.type === "reject" && !actionModal.rejectReason.trim()}
                style={{
                  flex: 1, padding: "12px", border: "none", borderRadius: "10px",
                  backgroundColor: actionModal.type === "approve" ? "#15803d" : "#b91c1c",
                  color: "white", fontWeight: "bold", cursor: "pointer",
                  opacity: (actionModal.type === "reject" && !actionModal.rejectReason.trim()) ? 0.5 : 1,
                }}>
                {actionModal.type === "approve" ? "อนุมัติ" : "ปฏิเสธ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal เพิ่มสถานที่ใหม่ ══ */}
      {isAddingLoc && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9997, padding: "20px" }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ margin: "0 0 20px", color: "#800000" }}>➕ เพิ่มสถานที่ใหม่</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.9rem" }}>ชื่อสถานที่ *</label>
                <input type="text" value={newLocName} onChange={e => setNewLocName(e.target.value)}
                  placeholder="เช่น ห้องประชุม 2"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.9rem" }}>ประเภท</label>
                <select value={newLocType} onChange={e => setNewLocType(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }}>
                  <option value="room">ห้อง (room)</option>
                  <option value="outdoor">พื้นที่กลางแจ้ง (outdoor)</option>
                  <option value="hall">ห้องโถง (hall)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.9rem" }}>ความจุ (คน)</label>
                <input type="number" value={newLocCap} onChange={e => setNewLocCap(e.target.value)}
                  placeholder="เช่น 30"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { setIsAddingLoc(false); setNewLocName(""); }}
                style={{ flex: 1, padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 600 }}>ยกเลิก</button>
              <button onClick={handleAddLoc} disabled={!newLocName.trim()}
                style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", backgroundColor: newLocName.trim() ? "#800000" : "#94a3b8", color: "white", fontWeight: "bold", cursor: newLocName.trim() ? "pointer" : "not-allowed" }}>
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Modal แก้ไขสถานที่ ══ */}
      {editingLoc && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9997, padding: "20px" }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "420px" }}>
            <h3 style={{ margin: "0 0 20px", color: "#800000" }}>✏️ แก้ไขสถานที่</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.9rem" }}>ชื่อสถานที่</label>
                <input type="text" value={editingLoc.name} onChange={e => setEditingLoc({ ...editingLoc, name: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.9rem" }}>ประเภท</label>
                <select value={editingLoc.location_type ?? "room"} onChange={e => setEditingLoc({ ...editingLoc, location_type: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }}>
                  <option value="room">ห้อง (room)</option>
                  <option value="outdoor">พื้นที่กลางแจ้ง (outdoor)</option>
                  <option value="hall">ห้องโถง (hall)</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "0.9rem" }}>ความจุ (คน)</label>
                <input type="number" value={editingLoc.capacity ?? ""}
                  onChange={e => setEditingLoc({ ...editingLoc, capacity: e.target.value ? Number(e.target.value) : null })}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setEditingLoc(null)}
                style={{ flex: 1, padding: "10px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "white", cursor: "pointer", fontWeight: 600 }}>ยกเลิก</button>
              <button onClick={handleSaveLoc}
                style={{ flex: 1, padding: "10px", border: "none", borderRadius: "8px", backgroundColor: "#800000", color: "white", fontWeight: "bold", cursor: "pointer" }}>
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}