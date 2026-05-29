"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

interface LostFoundItem {
  id: number;
  user_id: string | null;
  post_type: "lost" | "found";
  item_name: string;
  location_name: string | null;
  lost_date: string | null;
  description: string | null;
  contact_info: string | null;
  contact?: string | null;
  image_url: string | null;
  is_resolved: boolean;
  created_at: string;
  user_name?: string;
  student_id?: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  student_id: string | null;
}

type FilterType = "all" | "lost" | "found" | "open" | "resolved";
type ModalState = { isOpen: boolean; status: "loading" | "success" | "error"; title: string; message: string };

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const fmtDate = (value: string | null) => {
  if (!value) return "-";
  const dt = new Date(value);
  return `${dt.getDate()} ${THAI_MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
};

export default function AdminLostFound() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ isOpen: false, status: "loading", title: "", message: "" });

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data: baseRows, error: baseError } = await supabase
      .from("lost_and_found")
      .select("*")
      .order("created_at", { ascending: false });

    if (baseError) {
      setItems([]);
      setModal({
        isOpen: true,
        status: "error",
        title: "โหลดรายการของหายไม่สำเร็จ",
        message: baseError.message,
      });
      setLoading(false);
      return;
    }

    const records = (baseRows ?? []) as LostFoundItem[];
    const userIds = Array.from(new Set(records.map((item) => item.user_id).filter(Boolean))) as string[];

    const profileResult =
      userIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, student_id").in("id", userIds)
        : { data: [], error: null };

    if (profileResult.error) {
      console.error("lost and found profiles error:", profileResult.error);
    }

    const profileMap = new Map(
      ((profileResult.data as ProfileRow[] | null) ?? []).map((profile) => [profile.id, profile] as const)
    );

    setItems(
      records.map((item) => {
        const profile = item.user_id ? profileMap.get(item.user_id) : undefined;
        return {
          ...item,
          user_name: profile?.full_name ?? "-",
          student_id: profile?.student_id ?? "-",
        };
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadItems();
    };
    void run();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "open"
            ? !item.is_resolved
            : filter === "resolved"
              ? item.is_resolved
              : item.post_type === filter;

      const haystack = [
        item.item_name,
        item.location_name ?? "",
        item.description ?? "",
        item.user_name ?? "",
        item.student_id ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [items, filter, search]);

  const handleToggleResolved = async (item: LostFoundItem) => {
    setModal({ isOpen: true, status: "loading", title: "กำลังอัปเดตสถานะ...", message: "" });
    const { error } = await supabase
      .from("lost_and_found")
      .update({ is_resolved: !item.is_resolved })
      .eq("id", item.id);

    if (error) {
      setModal({ isOpen: true, status: "error", title: "อัปเดตสถานะไม่สำเร็จ", message: error.message });
      return;
    }

    setModal({
      isOpen: true,
      status: "success",
      title: item.is_resolved ? "เปิดรายการอีกครั้งสำเร็จ" : "ปิดรายการสำเร็จ",
      message: item.item_name,
    });
    await loadItems();
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ color: "#1e293b", marginBottom: "24px" }}>🔍 จัดการประกาศของหายและของที่เก็บได้</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", backgroundColor: "white", padding: "6px", borderRadius: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
          {([
            { key: "all", label: "ทั้งหมด" },
            { key: "lost", label: "ของหาย" },
            { key: "found", label: "เก็บของได้" },
            { key: "open", label: "ยังเปิดอยู่" },
            { key: "resolved", label: "ปิดรายการแล้ว" },
          ] as const).map((entry) => (
            <button
              key={entry.key}
              onClick={() => setFilter(entry.key)}
              style={{
                padding: "7px 12px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.82rem",
                backgroundColor: filter === entry.key ? "#800000" : "transparent",
                color: filter === entry.key ? "white" : "#64748b",
                fontWeight: filter === entry.key ? "bold" : "normal",
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
          placeholder="🔍 ค้นหาชื่อสิ่งของ, สถานที่, ผู้โพสต์..."
          style={{ flex: 1, minWidth: "240px", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.9rem" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {loading ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px", color: "#94a3b8", backgroundColor: "white", borderRadius: "20px" }}>
            กำลังโหลดรายการ...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "50px", color: "#94a3b8", backgroundColor: "white", borderRadius: "20px" }}>
            ไม่พบรายการ
          </div>
        ) : (
          filteredItems.map((item) => (
            <div key={item.id} style={{ backgroundColor: "white", borderRadius: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", overflow: "hidden", borderLeft: `6px solid ${item.post_type === "lost" ? "#ef4444" : "#10b981"}` }}>
              {item.image_url && <img src={item.image_url} alt={item.item_name} style={{ width: "100%", height: "180px", objectFit: "cover" }} />}
              <div style={{ padding: "18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: item.post_type === "lost" ? "#ef4444" : "#10b981" }}>
                    {item.post_type === "lost" ? "🔍 ของหาย" : "✅ เก็บของได้"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: item.is_resolved ? "#15803d" : "#b45309", fontWeight: 700 }}>
                    {item.is_resolved ? "ปิดรายการแล้ว" : "ยังเปิดรายการอยู่"}
                  </span>
                </div>

                <h3 style={{ margin: "0 0 8px", color: "#1e293b" }}>{item.item_name}</h3>
                <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "0.88rem", lineHeight: "1.6" }}>{item.description ?? "-"}</p>

                <div style={{ display: "grid", gap: "6px", fontSize: "0.82rem", color: "#475569", marginBottom: "14px" }}>
                  <div><b>ผู้โพสต์:</b> {item.user_name} ({item.student_id})</div>
                  <div><b>สถานที่:</b> {item.location_name ?? "-"}</div>
                  <div><b>วันที่แจ้ง:</b> {fmtDate(item.created_at)}</div>
                  <div><b>วันที่เกิดเหตุ:</b> {fmtDate(item.lost_date)}</div>
                  <div><b>ติดต่อ:</b> {item.contact_info ?? item.contact ?? "-"}</div>
                </div>

                <button
                  onClick={() => handleToggleResolved(item)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderRadius: "10px",
                    backgroundColor: item.is_resolved ? "#3b82f6" : "#15803d",
                    color: "white",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  {item.is_resolved ? "เปิดรายการอีกครั้ง" : "ทำเครื่องหมายว่าเรียบร้อยแล้ว"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

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
