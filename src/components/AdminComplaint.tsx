"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";

type ComplaintStatus = "received" | "in_progress" | "resolved" | "closed";
type ComplaintSeverity = "urgent" | "normal" | "low";
type ComplaintCategory = "facility" | "welfare" | "academic" | "other";

interface ComplaintRow {
  id: number;
  user_id: string | null;
  category: ComplaintCategory;
  title: string;
  detail: string;
  is_anonymous: boolean;
  contact_info: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  admin_response: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
  user_name?: string;
  student_id?: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  student_id: string | null;
}

type ModalState = { isOpen: boolean; status: "loading" | "success" | "error"; title: string; message: string };

const STATUS_LABEL: Record<ComplaintStatus, string> = {
  received: "รับเรื่องแล้ว",
  in_progress: "กำลังดำเนินการ",
  resolved: "แก้ไขแล้ว",
  closed: "ปิดเรื่อง",
};

const SEVERITY_LABEL: Record<ComplaintSeverity, string> = {
  urgent: "เร่งด่วน",
  normal: "ปกติ",
  low: "ต่ำ",
};

const CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  facility: "อาคาร/สถานที่",
  welfare: "สวัสดิการ",
  academic: "การเรียนการสอน",
  other: "อื่น ๆ",
};

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const fmtDateTime = (value: string) => {
  const dt = new Date(value);
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
};

export default function AdminComplaint() {
  const { profile } = useRole();
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ isOpen: false, status: "loading", title: "", message: "" });
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    complaint: ComplaintRow | null;
    nextStatus: ComplaintStatus | null;
    response: string;
  }>({ isOpen: false, complaint: null, nextStatus: null, response: "" });

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    const { data: complaintRows, error: complaintError } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });

    if (complaintError) {
      setComplaints([]);
      setModal({
        isOpen: true,
        status: "error",
        title: "โหลดเรื่องร้องเรียนไม่สำเร็จ",
        message: complaintError.message,
      });
      setLoading(false);
      return;
    }

    const rows = (complaintRows ?? []) as ComplaintRow[];
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[];
    const profileResult =
      userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, student_id").in("id", userIds)
        : { data: [], error: null };

    if (profileResult.error) {
      console.error("complaint profiles error:", profileResult.error);
    }

    const profileMap = new Map(
      ((profileResult.data as ProfileRow[] | null) ?? []).map((item) => [item.id, item] as const)
    );

    setComplaints(
      rows.map((row) => {
        const profileRow = row.user_id ? profileMap.get(row.user_id) : undefined;
        return {
          ...row,
          user_name: row.is_anonymous ? "ไม่ประสงค์ออกนาม" : profileRow?.full_name ?? "-",
          student_id: row.is_anonymous ? "-" : profileRow?.student_id ?? "-",
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadComplaints();
    };
    void run();
  }, [loadComplaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => {
      const statusMatch = statusFilter === "all" ? true : item.status === statusFilter;
      const haystack = [
        item.title,
        item.detail,
        item.user_name ?? "",
        item.student_id ?? "",
        item.contact_info ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const searchMatch = !search || haystack.includes(search.toLowerCase());
      return statusMatch && searchMatch;
    });
  }, [complaints, search, statusFilter]);

  const handleUpdateStatus = async () => {
    if (!actionModal.complaint || !actionModal.nextStatus) return;

    setActionModal((prev) => ({ ...prev, isOpen: false }));
    setModal({ isOpen: true, status: "loading", title: "กำลังอัปเดตสถานะ...", message: "" });

    const payload = {
      status: actionModal.nextStatus,
      admin_response: actionModal.response.trim() || null,
      handled_by: profile?.id ?? null,
      handled_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("complaints")
      .update(payload)
      .eq("id", actionModal.complaint.id);

    if (error) {
      setModal({ isOpen: true, status: "error", title: "อัปเดตสถานะไม่สำเร็จ", message: error.message });
      return;
    }

    setModal({
      isOpen: true,
      status: "success",
      title: "อัปเดตสถานะสำเร็จ ✅",
      message: `${actionModal.complaint.title} → ${STATUS_LABEL[actionModal.nextStatus]}`,
    });
    await loadComplaints();
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "20px", color: "#1e293b" }}>🛠️ จัดการเรื่องร้องเรียน</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", backgroundColor: "white", padding: "6px", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          {([
            { key: "all", label: "ทั้งหมด" },
            { key: "received", label: "รับเรื่องแล้ว" },
            { key: "in_progress", label: "กำลังดำเนินการ" },
            { key: "resolved", label: "แก้ไขแล้ว" },
            { key: "closed", label: "ปิดเรื่อง" },
          ] as const).map((entry) => (
            <button
              key={entry.key}
              onClick={() => setStatusFilter(entry.key)}
              style={{
                padding: "7px 12px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.82rem",
                backgroundColor: statusFilter === entry.key ? "#800000" : "transparent",
                color: statusFilter === entry.key ? "white" : "#64748b",
                fontWeight: statusFilter === entry.key ? "bold" : "normal",
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="🔍 ค้นหาหัวข้อ, รายละเอียด, ผู้แจ้ง..."
          style={{ flex: 1, minWidth: "260px", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }}
        />
      </div>

      <div style={{ display: "grid", gap: "14px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#94a3b8", backgroundColor: "white", borderRadius: "20px" }}>กำลังโหลด...</div>
        ) : filteredComplaints.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#94a3b8", backgroundColor: "white", borderRadius: "20px" }}>ไม่พบรายการ</div>
        ) : (
          filteredComplaints.map((item) => (
            <div key={item.id} style={{ backgroundColor: "white", padding: "20px", borderRadius: "16px", borderLeft: `6px solid ${item.severity === "urgent" ? "#ef4444" : item.severity === "normal" ? "#3b82f6" : "#94a3b8"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "280px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, backgroundColor: "#f8fafc", color: "#475569", padding: "4px 8px", borderRadius: "999px" }}>{CATEGORY_LABEL[item.category]}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, backgroundColor: "#fff7ed", color: "#b45309", padding: "4px 8px", borderRadius: "999px" }}>{SEVERITY_LABEL[item.severity]}</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, backgroundColor: "#eef2ff", color: "#4338ca", padding: "4px 8px", borderRadius: "999px" }}>{STATUS_LABEL[item.status]}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "#1e293b", marginBottom: "6px" }}>{item.title}</div>
                  <p style={{ margin: "0 0 10px", color: "#64748b", lineHeight: "1.65", whiteSpace: "pre-wrap" }}>{item.detail}</p>
                  <div style={{ display: "grid", gap: "4px", fontSize: "0.82rem", color: "#475569" }}>
                    <div><b>ผู้แจ้ง:</b> {item.user_name} ({item.student_id})</div>
                    <div><b>ติดต่อ:</b> {item.contact_info ?? "-"}</div>
                    <div><b>แจ้งเมื่อ:</b> {fmtDateTime(item.created_at)}</div>
                    {item.admin_response && <div><b>คำตอบล่าสุด:</b> {item.admin_response}</div>}
                  </div>
                </div>

                <div style={{ display: "grid", gap: "8px", alignContent: "start", minWidth: "180px" }}>
                  <button
                    onClick={() => setActionModal({ isOpen: true, complaint: item, nextStatus: "in_progress", response: item.admin_response ?? "" })}
                    style={{ padding: "10px 12px", border: "none", borderRadius: "10px", backgroundColor: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer" }}
                  >
                    กำลังดำเนินการ
                  </button>
                  <button
                    onClick={() => setActionModal({ isOpen: true, complaint: item, nextStatus: "resolved", response: item.admin_response ?? "" })}
                    style={{ padding: "10px 12px", border: "none", borderRadius: "10px", backgroundColor: "#16a34a", color: "white", fontWeight: "bold", cursor: "pointer" }}
                  >
                    ทำเครื่องหมายว่าแก้ไขแล้ว
                  </button>
                  <button
                    onClick={() => setActionModal({ isOpen: true, complaint: item, nextStatus: "closed", response: item.admin_response ?? "" })}
                    style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", backgroundColor: "white", color: "#475569", fontWeight: "bold", cursor: "pointer" }}
                  >
                    ปิดเรื่อง
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {actionModal.isOpen && actionModal.complaint && actionModal.nextStatus && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9998, padding: "20px" }}>
          <div style={{ backgroundColor: "white", padding: "28px", borderRadius: "20px", width: "100%", maxWidth: "500px" }}>
            <h3 style={{ margin: "0 0 16px" }}>อัปเดตสถานะเรื่องร้องเรียน</h3>
            <div style={{ backgroundColor: "#f8fafc", padding: "14px", borderRadius: "12px", marginBottom: "16px", lineHeight: "1.8", fontSize: "0.9rem" }}>
              <div><b>หัวข้อ:</b> {actionModal.complaint.title}</div>
              <div><b>สถานะใหม่:</b> {STATUS_LABEL[actionModal.nextStatus]}</div>
            </div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>ข้อความตอบกลับ / หมายเหตุ</label>
            <textarea
              rows={4}
              value={actionModal.response}
              onChange={(event) => setActionModal((prev) => ({ ...prev, response: event.target.value }))}
              placeholder="ระบุการดำเนินการหรือคำตอบกลับ..."
              style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", resize: "none", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                onClick={() => setActionModal({ isOpen: false, complaint: null, nextStatus: null, response: "" })}
                style={{ flex: 1, padding: "11px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", cursor: "pointer", fontWeight: 600 }}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUpdateStatus}
                style={{ flex: 1, padding: "11px", border: "none", borderRadius: "10px", backgroundColor: "#800000", color: "white", fontWeight: "bold", cursor: "pointer" }}
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.isOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "white", padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "380px", textAlign: "center" }}>
            {modal.status === "loading" && <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #800000", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />}
            {modal.status === "success" && <div style={{ fontSize: "3rem", marginBottom: "12px" }}>✅</div>}
            {modal.status === "error" && <div style={{ fontSize: "3rem", marginBottom: "12px" }}>❌</div>}
            <h3 style={{ margin: "0 0 10px" }}>{modal.title}</h3>
            <p style={{ color: "#64748b", marginBottom: "20px" }}>{modal.message}</p>
            {modal.status !== "loading" && (
              <button
                onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: "10px", backgroundColor: "#800000", color: "white", fontWeight: "bold", cursor: "pointer" }}
              >
                ตกลง
              </button>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
    </div>
  );
}
