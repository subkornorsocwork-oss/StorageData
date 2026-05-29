"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TabType = "booking" | "borrow" | "complaint" | "lost-found";

// ── Modal แก้ไขข้อมูลส่วนตัว ──
function EditProfileModal({ userData, onClose, onSave }: {
  userData: { name: string; faculty: string; email: string; phone: string };
  onClose: () => void;
  onSave: (data: { phone: string }) => void;
}) {
  const [phone, setPhone] = useState(userData.phone);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ phone });
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
      <div style={{ background: "white", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "400px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <h3 style={{ margin: "0 0 20px", color: "#0f172a" }}>✏️ แก้ไขข้อมูลส่วนตัว</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {/* ฟิลด์ที่แก้ไขไม่ได้ */}
          {[
            { label: "ชื่อ-นามสกุล", value: userData.name },
            { label: "คณะ", value: userData.faculty },
            { label: "อีเมล", value: userData.email },
          ].map((f) => (
            <div key={f.label}>
              <label style={{ fontSize: "0.8rem", color: "#64748b", display: "block", marginBottom: "4px" }}>{f.label}</label>
              <input value={f.value} disabled style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#94a3b8", boxSizing: "border-box" }} />
            </div>
          ))}
          {/* เบอร์โทร แก้ได้ */}
          <div>
            <label style={{ fontSize: "0.8rem", color: "#64748b", display: "block", marginBottom: "4px" }}>เบอร์โทรศัพท์</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เบอร์โทรศัพท์"
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "12px", fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
            ยกเลิก
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: "12px", borderRadius: "12px", fontWeight: 600, cursor: "pointer", background: "#800000", color: "white", border: "none" }}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal ติดต่อเจ้าหน้าที่ ──
function ContactModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
      <div style={{ background: "white", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "400px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "15px" }}>📞</div>
        <h3 style={{ margin: "0 0 8px", color: "#0f172a" }}>ติดต่อเจ้าหน้าที่ กน.สค.</h3>
        <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 20px" }}>สามารถติดต่อได้ผ่านช่องทางด้านล่าง</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left" }}>
          {[
            { icon: "📍", label: "ที่ตั้ง", value: "ชั้น 1 อาคาร กน.สค." },
            { icon: "📞", label: "โทรศัพท์", value: "02-xxx-xxxx" },
            { icon: "⏰", label: "เวลาทำการ", value: "จ-ศ 08:30 - 16:30 น." },
            { icon: "📧", label: "อีเมล", value: "soc@dome.tu.ac.th" },
          ].map((c) => (
            <div key={c.label} style={{ display: "flex", gap: "12px", padding: "12px", background: "#f8fafc", borderRadius: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>{c.icon}</span>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{c.label}</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#334155" }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: "20px", width: "100%", padding: "12px", borderRadius: "12px", fontWeight: 600, cursor: "pointer", background: "#800000", color: "white", border: "none" }}>
          ปิด
        </button>
      </div>
    </div>
  );
}

// ── Modal ดูรายละเอียด ──
function DetailModal({ item, type, onClose }: { item: any; type: TabType; onClose: () => void }) {
  const formatDate = (d: string) => {
    if (!d) return "-";
    const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    const dt = new Date(d);
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const rows: { label: string; value: string }[] = [];

  if (type === "booking") {
    rows.push(
      { label: "สถานที่", value: item.locations?.name ?? "-" },
      { label: "วันที่จอง", value: formatDate(item.booking_date) },
      { label: "เวลา", value: `${item.start_time?.slice(0,5)} - ${item.end_time?.slice(0,5)}` },
      { label: "จำนวนคน", value: `${item.attendees ?? "-"} คน` },
      { label: "วัตถุประสงค์", value: item.purpose ?? "-" },
      { label: "สถานะ", value: { pending:"รอตรวจสอบ", approved:"อนุมัติแล้ว", rejected:"ไม่อนุมัติ", cancelled:"ยกเลิก" }[item.status as string] ?? item.status },
    );
  } else if (type === "borrow") {
    const items = item.borrow_items?.map((i: any) => `${i.equipment?.emoji ?? "📦"} ${i.equipment?.name} x${i.quantity}`).join(", ") ?? "-";
    rows.push(
      { label: "อุปกรณ์", value: items },
      { label: "วันยืม", value: formatDate(item.borrow_date) },
      { label: "กำหนดคืน", value: formatDate(item.return_due_date) },
      { label: "สถานะ", value: { pending:"รอดำเนินการ", borrowing:"กำลังยืม", returned:"คืนแล้ว", overdue:"เกินกำหนด", cancelled:"ยกเลิก" }[item.status as string] ?? item.status },
    );
  } else if (type === "complaint") {
    rows.push(
      { label: "หัวข้อ", value: item.title ?? "-" },
      { label: "รายละเอียด", value: item.description ?? "-" },
      { label: "วันที่แจ้ง", value: formatDate(item.created_at) },
      { label: "สถานะ", value: { received:"รับเรื่องแล้ว", in_progress:"กำลังดำเนินการ", resolved:"แก้ไขแล้ว", closed:"ปิดเรื่อง" }[item.status as string] ?? item.status },
    );
  } else if (type === "lost-found") {
    rows.push(
      { label: "ชื่อสิ่งของ", value: item.item_name ?? "-" },
      { label: "ประเภท", value: item.post_type === "lost" ? "ของหาย" : "เก็บของได้" },
      { label: "สถานที่", value: item.location_name ?? "-" },
      { label: "วันที่", value: formatDate(item.lost_date) },
      { label: "รายละเอียด", value: item.description ?? "-" },
      { label: "ติดต่อ", value: item.contact_info ?? item.contact ?? "-" },
      { label: "สถานะ", value: item.is_resolved ? "ปิดประกาศแล้ว" : "กำลังตามหา" },
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
      <div style={{ background: "white", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "450px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)", maxHeight: "80vh", overflowY: "auto" }}>
        <h3 style={{ margin: "0 0 20px", color: "#0f172a" }}>📋 รายละเอียด</h3>

        {/* แสดงรูป ถ้าเป็น lost-found และมี image_url */}
        {type === "lost-found" && item.image_url && (
          <img src={item.image_url} alt="item" style={{ width: "100%", borderRadius: "12px", marginBottom: "16px", objectFit: "cover", maxHeight: "200px" }} />
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#f8fafc", borderRadius: "10px", gap: "10px" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{r.label}</span>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155", textAlign: "right" }}>{r.value}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ marginTop: "20px", width: "100%", padding: "12px", borderRadius: "12px", fontWeight: 600, cursor: "pointer", background: "#800000", color: "white", border: "none" }}>
          ปิด
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function StudentProfile() {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen]     = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedItem, setSelectedItem]           = useState<{ item: any; type: TabType } | null>(null);
  const [activeTab, setActiveTab]                 = useState<TabType>("booking");
  const [saveMsg, setSaveMsg]                     = useState("");
  const router = useRouter();

  const [userData, setUserData] = useState({ name: "กำลังโหลด...", id: "-", faculty: "-", email: "-", phone: "-" });
  const [userId, setUserId]     = useState<string | null>(null);

  const [bookings, setBookings]     = useState<any[]>([]);
  const [borrows, setBorrows]       = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [lostFound, setLostFound]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) { router.push("/login"); return; }
        setUserId(user.id);

        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) {
          setUserData({ name: profile.full_name ?? "ไม่ระบุชื่อ", id: profile.student_id ?? "-", faculty: profile.faculty ?? "-", email: profile.email ?? "-", phone: profile.phone ?? "-" });
        }

        const { data: bkData } = await supabase.from("bookings").select("*, locations(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        setBookings(bkData ?? []);

        const { data: brData } = await supabase.from("borrow_requests").select("*, borrow_items(quantity, equipment(name, emoji))").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        setBorrows(brData ?? []);

        const { data: cpData } = await supabase.from("complaints").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        setComplaints(cpData ?? []);

        const { data: lfData } = await supabase.from("lost_and_found").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        setLostFound(lfData ?? []);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // ✅ บันทึกข้อมูลส่วนตัว
  const handleSaveProfile = async ({ phone }: { phone: string }) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ phone }).eq("id", userId);
    if (!error) {
      setUserData((prev) => ({ ...prev, phone }));
      setIsEditModalOpen(false);
      setSaveMsg("บันทึกข้อมูลสำเร็จ ✅");
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return "-";
    const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    const dt = new Date(d);
    return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const bookingStatusColor: Record<string, string> = { pending: "#f59e0b", approved: "#16a34a", rejected: "#ef4444", cancelled: "#94a3b8" };
  const bookingStatusText: Record<string, string>  = { pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ไม่อนุมัติ", cancelled: "ยกเลิก" };
  const borrowStatusColor: Record<string, string>  = { pending: "#f59e0b", borrowing: "#3b82f6", returned: "#16a34a", overdue: "#ef4444", cancelled: "#94a3b8" };
  const borrowStatusText: Record<string, string>   = { pending: "รอดำเนินการ", borrowing: "กำลังยืม", returned: "คืนแล้ว", overdue: "เกินกำหนด", cancelled: "ยกเลิก" };
  const complaintStatusColor: Record<string, string> = { received: "#f59e0b", in_progress: "#3b82f6", resolved: "#16a34a", closed: "#94a3b8" };
  const complaintStatusText: Record<string, string>  = { received: "รับเรื่องแล้ว", in_progress: "กำลังดำเนินการ", resolved: "แก้ไขแล้ว", closed: "ปิดเรื่อง" };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", padding: "40px 20px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "30px" }}>

          {/* ── ซ้าย ── */}
          <aside>
            <div style={{ background: "white", borderRadius: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "30px", textAlign: "center" }}>
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", background: "#f1f5f9", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", border: "3px solid #800000" }}>👤</div>
              <h2 style={{ margin: "0", color: "#1e293b", fontSize: "1.25rem" }}>{userData.name}</h2>
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "20px" }}>{userData.id}</p>

              <div style={{ textAlign: "left", borderTop: "1px solid #f1f5f9", paddingTop: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                {[{ label: "คณะ", value: userData.faculty }, { label: "อีเมล", value: userData.email }, { label: "เบอร์โทรศัพท์", value: userData.phone }].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</div>
                    <div style={{ fontSize: "0.9rem", color: "#334155", fontWeight: 500 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* ✅ มี onClick แล้ว */}
              {saveMsg && <p style={{ color: "#16a34a", fontSize: "0.8rem", marginTop: "10px" }}>{saveMsg}</p>}
              <button
                onClick={() => setIsEditModalOpen(true)}
                style={{ marginTop: "20px", width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: 600, color: "#475569" }}>
                แก้ไขข้อมูลส่วนตัว
              </button>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                style={{ marginTop: "10px", width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #fca5a5", background: "#fef2f2", cursor: "pointer", fontWeight: 600, color: "#dc2626" }}>
                🚪 ออกจากระบบ
              </button>
            </div>
          </aside>

          {/* ── ขวา ── */}
          <section>
            <div style={{ background: "white", borderRadius: "24px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", padding: "30px" }}>
              {/* Tabs */}
              <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e2e8f0", marginBottom: "20px", paddingBottom: "5px", overflowX: "auto" }}>
                {(["booking","borrow","complaint","lost-found"] as TabType[]).map((tab) => {
                  const labels: Record<TabType, string> = { booking: "📅 จองสถานที่", borrow: "📦 ยืม-คืน", complaint: "📢 แจ้งเรื่อง", "lost-found": "🔍 ของหาย" };
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      style={{ padding: "10px 15px", border: "none", background: "transparent", fontSize: "0.9rem", fontWeight: 600, color: activeTab === tab ? "#800000" : "#64748b", cursor: "pointer", borderBottom: activeTab === tab ? "3px solid #800000" : "3px solid transparent", whiteSpace: "nowrap", transition: "all 0.2s" }}>
                      {labels[tab]}
                    </button>
                  );
                })}
              </div>

              {/* Content */}
              {loading ? (
                <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px" }}>กำลังโหลด...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {activeTab === "booking" && (bookings.length === 0 ? <Empty /> : bookings.map((b) => (
                    <HistoryItem key={b.id}
                      title={b.locations?.name ?? "-"}
                      desc={`${formatDate(b.booking_date)} • ${b.start_time?.slice(0,5)} - ${b.end_time?.slice(0,5)}`}
                      statusColor={bookingStatusColor[b.status]}
                      statusText={bookingStatusText[b.status]}
                      onDetail={() => setSelectedItem({ item: b, type: "booking" })} // ✅
                    />
                  )))}
                  {activeTab === "borrow" && (borrows.length === 0 ? <Empty /> : borrows.map((b) => {
                    const items = b.borrow_items?.map((i: any) => `${i.equipment?.emoji ?? "📦"} ${i.equipment?.name} x${i.quantity}`).join(", ") ?? "-";
                    return (
                      <HistoryItem key={b.id}
                        title={items}
                        desc={`ยืม: ${formatDate(b.borrow_date)} | คืน: ${formatDate(b.return_due_date)}`}
                        statusColor={borrowStatusColor[b.status]}
                        statusText={borrowStatusText[b.status]}
                        onDetail={() => setSelectedItem({ item: b, type: "borrow" })} // ✅
                      />
                    );
                  }))}
                  {activeTab === "complaint" && (complaints.length === 0 ? <Empty /> : complaints.map((c) => (
                    <HistoryItem key={c.id}
                      title={c.title}
                      desc={`แจ้งเมื่อ: ${formatDate(c.created_at)}`}
                      statusColor={complaintStatusColor[c.status]}
                      statusText={complaintStatusText[c.status]}
                      onDetail={() => setSelectedItem({ item: c, type: "complaint" })} // ✅
                    />
                  )))}
                  {activeTab === "lost-found" && (lostFound.length === 0 ? <Empty /> : lostFound.map((l) => (
                    <HistoryItem key={l.id}
                      title={l.item_name}
                      desc={`${l.post_type === "lost" ? "ประกาศของหาย" : "เก็บได้"} • ${formatDate(l.created_at)}`}
                      statusColor={l.is_resolved ? "#16a34a" : "#f59e0b"}
                      statusText={l.is_resolved ? "ปิดประกาศแล้ว" : "กำลังตามหา"}
                      onDetail={() => setSelectedItem({ item: l, type: "lost-found" })} // ✅
                    />
                  )))}
                </div>
              )}
            </div>

            {/* Help Banner */}
            <div style={{ background: "#800000", padding: "20px", borderRadius: "20px", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "15px" }}>
              <div>
                <h4 style={{ margin: 0 }}>ต้องการความช่วยเหลือ?</h4>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", opacity: 0.8 }}>หากพบปัญหา ติดต่อ กน.สค. ได้ที่ชั้น 1 คณะฯ</p>
              </div>
              {/* ✅ มี onClick แล้ว */}
              <button
                onClick={() => setIsContactModalOpen(true)}
                style={{ background: "white", color: "#800000", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
                ติดต่อเจ้าหน้าที่
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ✅ Modals */}
      {isLogoutModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
          <div style={{ background: "white", padding: "30px", borderRadius: "20px", width: "100%", maxWidth: "350px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 10px", color: "#0f172a" }}>ยืนยันการออกจากระบบ?</h3>
            <p style={{ color: "#64748b", margin: "0 0 24px", fontSize: "0.9rem" }}>คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบในขณะนี้</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setIsLogoutModalOpen(false)} style={{ flex: 1, padding: "12px", borderRadius: "12px", fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>ยกเลิก</button>
              <button onClick={handleLogout} style={{ flex: 1, padding: "12px", borderRadius: "12px", fontWeight: 600, cursor: "pointer", background: "#dc2626", color: "white", border: "none" }}>ออกจากระบบ</button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <EditProfileModal userData={userData} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveProfile} />
      )}

      {isContactModalOpen && (
        <ContactModal onClose={() => setIsContactModalOpen(false)} />
      )}

      {selectedItem && (
        <DetailModal item={selectedItem.item} type={selectedItem.type} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}

// ── Sub-components ──
function HistoryItem({ title, desc, statusColor, statusText, onDetail }: {
  title: string; desc: string; statusColor: string; statusText: string;
  onDetail: () => void; // ✅ เพิ่ม prop
}) {
  return (
    <div style={{ padding: "15px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
      <div>
        <div style={{ fontWeight: 700, color: "#1e293b" }}>{title}</div>
        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>{desc}</div>
        <div style={{ marginTop: "8px", fontSize: "0.75rem", fontWeight: 600, color: statusColor }}>● {statusText}</div>
      </div>
      <button onClick={onDetail} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: "0.8rem", cursor: "pointer" }}>
        ดูรายละเอียด
      </button>
    </div>
  );
}

function Empty() {
  return <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>ไม่มีประวัติการทำรายการในหมวดหมู่นี้</div>;
}