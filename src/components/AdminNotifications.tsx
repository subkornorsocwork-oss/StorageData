"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type NotificationCounts = {
  bookings: number;
  borrows: number;
  returns: number;
};

export default function AdminNotifications({ onNavigate }: { onNavigate: (tab: "booking" | "borrow") => void }) {
  const [counts, setCounts] = useState<NotificationCounts>({ bookings: 0, borrows: 0, returns: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    const loadNotifications = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const [{ count: bookings }, { count: borrows }, { count: returns }] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("borrow_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("borrow_requests").select("id", { count: "exact", head: true }).not("return_proof_url", "is", null).neq("status", "returned"),
      ]);

      const nextCounts = {
        bookings: bookings ?? 0,
        borrows: borrows ?? 0,
        returns: returns ?? 0,
      };
      setCounts(nextCounts);
      if (nextCounts.bookings + nextCounts.borrows + nextCounts.returns > 0) setIsOpen(true);
    };

    void loadNotifications();
  }, []);

  const close = () => setIsOpen(false);
  const goTo = (tab: "booking" | "borrow") => {
    close();
    onNavigate(tab);
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", background: "rgba(15,23,42,0.58)" }}>
      <div role="dialog" aria-modal="true" aria-labelledby="admin-notification-title" style={{ width: "min(520px, 100%)", background: "white", borderRadius: "20px", boxShadow: "0 20px 60px rgba(15,23,42,0.3)", overflow: "hidden" }}>
        <div style={{ padding: "24px 26px 18px", background: "linear-gradient(135deg, #800000, #a30000)", color: "white" }}>
          <div style={{ fontSize: "2rem" }}>🔔</div>
          <h2 id="admin-notification-title" style={{ margin: "8px 0 4px", fontSize: "1.35rem" }}>มีรายการใหม่รอให้ตรวจสอบ</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "0.9rem" }}>ระบบพบรายการที่ผู้ใช้ส่งเข้ามา</p>
        </div>

        <div style={{ padding: "20px 26px" }}>
          {counts.bookings > 0 && (
            <button onClick={() => goTo("booking")} style={itemStyle}>
              <span style={{ fontSize: "1.5rem" }}>📅</span>
              <span><b>คำขอจองสถานที่</b><small>{counts.bookings} รายการรออนุมัติ</small></span>
              <span style={arrowStyle}>›</span>
            </button>
          )}
          {counts.borrows > 0 && (
            <button onClick={() => goTo("borrow")} style={itemStyle}>
              <span style={{ fontSize: "1.5rem" }}>📦</span>
              <span><b>คำขอยืมอุปกรณ์และพัสดุ</b><small>{counts.borrows} รายการรอตรวจสอบ</small></span>
              <span style={arrowStyle}>›</span>
            </button>
          )}
          {counts.returns > 0 && (
            <button onClick={() => goTo("borrow")} style={itemStyle}>
              <span style={{ fontSize: "1.5rem" }}>📥</span>
              <span><b>แจ้งคืนพัสดุ</b><small>{counts.returns} รายการมีภาพคืนรอตรวจสอบ</small></span>
              <span style={arrowStyle}>›</span>
            </button>
          )}
          <button onClick={close} style={{ width: "100%", marginTop: "12px", padding: "12px", border: 0, borderRadius: "10px", background: "#800000", color: "white", fontWeight: 700, cursor: "pointer" }}>ปิดการแจ้งเตือน</button>
        </div>
      </div>
    </div>
  );
}

const itemStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "32px 1fr 20px",
  alignItems: "center",
  gap: "12px",
  padding: "14px 0",
  border: 0,
  borderBottom: "1px solid #e2e8f0",
  background: "transparent",
  color: "#1e293b",
  textAlign: "left" as const,
  cursor: "pointer",
};

const arrowStyle = { color: "#800000", fontSize: "1.6rem", fontWeight: 700 };
