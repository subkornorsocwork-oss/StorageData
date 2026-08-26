"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Organization { id: number; name: string; is_active: boolean; }
interface Restriction {
  id: number;
  target_type: "user" | "organization";
  user_id: string | null;
  org_name: string | null;
  reason: string;
  ends_at: string | null;
  is_active: boolean;
}

export default function AdminBorrowControls() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [targetType, setTargetType] = useState<"user" | "organization">("user");
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [orgs, bans] = await Promise.all([
      supabase.from("borrow_organizations").select("id, name, is_active").order("name"),
      supabase.from("borrow_restrictions").select("id, target_type, user_id, org_name, reason, ends_at, is_active").order("created_at", { ascending: false }),
    ]);
    if (!orgs.error) setOrganizations((orgs.data ?? []) as Organization[]);
    if (!bans.error) setRestrictions((bans.data ?? []) as Restriction[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addOrganization = async () => {
    const name = organizationName.trim();
    if (!name) return;
    const { error } = await supabase.from("borrow_organizations").insert({ name });
    setMessage(error ? error.message : "เพิ่มองค์กร/ชุมนุมแล้ว");
    if (!error) { setOrganizationName(""); load(); }
  };

  const toggleOrganization = async (item: Organization) => {
    const { error } = await supabase.from("borrow_organizations").update({ is_active: !item.is_active }).eq("id", item.id);
    setMessage(error ? error.message : "อัปเดตสถานะแล้ว");
    if (!error) load();
  };

  const addRestriction = async () => {
    if (!target.trim() || !reason.trim()) return setMessage("กรุณาระบุเป้าหมายและเหตุผล");
    const { data: { user } } = await supabase.auth.getUser();
    const payload = targetType === "user"
      ? { target_type: targetType, user_id: target.trim(), org_name: null, reason: reason.trim(), ends_at: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null, created_by: user?.id ?? null }
      : { target_type: targetType, user_id: null, org_name: target.trim(), reason: reason.trim(), ends_at: endsAt ? new Date(`${endsAt}T23:59:59`).toISOString() : null, created_by: user?.id ?? null };
    const { error } = await supabase.from("borrow_restrictions").insert(payload);
    setMessage(error ? error.message : "บันทึกข้อจำกัดแล้ว");
    if (!error) { setTarget(""); setReason(""); setEndsAt(""); load(); }
  };

  const disableRestriction = async (id: number) => {
    const { error } = await supabase.from("borrow_restrictions").update({ is_active: false }).eq("id", id);
    setMessage(error ? error.message : "ยกเลิกข้อจำกัดแล้ว");
    if (!error) load();
  };

  return <div style={{ display: "grid", gap: 20 }}>
    <section style={{ background: "white", padding: 20, borderRadius: 16 }}>
      <h2 style={{ marginTop: 0, color: "#1e293b" }}>จัดการฝ่าย / ชุมนุม / องค์กร</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="ชื่อองค์กรหรือชุมนุม" style={{ flex: 1, minWidth: 220, padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }} />
        <button onClick={addOrganization} style={{ padding: "10px 16px", border: 0, borderRadius: 8, background: "#800000", color: "white", fontWeight: 700 }}>+ เพิ่ม</button>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {organizations.map(item => <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>
          <span style={{ color: item.is_active ? "#1e293b" : "#94a3b8" }}>{item.name}</span>
          <button onClick={() => toggleOrganization(item)} style={{ border: 0, borderRadius: 6, padding: "6px 10px", background: item.is_active ? "#fee2e2" : "#dcfce7", color: item.is_active ? "#b91c1c" : "#15803d" }}>{item.is_active ? "ปิดการใช้งาน" : "เปิดใช้งาน"}</button>
        </div>)}
      </div>
    </section>
    <section style={{ background: "white", padding: 20, borderRadius: 16 }}>
      <h2 style={{ marginTop: 0, color: "#1e293b" }}>ระงับสิทธิ์การยืม / ติดโทษ</h2>
      <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr 170px auto", gap: 8 }}>
        <select value={targetType} onChange={e => setTargetType(e.target.value as "user" | "organization")} style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }}><option value="user">รายบุคคล (User ID)</option><option value="organization">องค์กร/ชุมนุม</option></select>
        <input value={target} onChange={e => setTarget(e.target.value)} placeholder={targetType === "user" ? "UUID ผู้ใช้" : "ชื่อองค์กร"} style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }} />
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="เหตุผล เช่น คืนล่าช้า" style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }} />
        <input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }} />
        <button onClick={addRestriction} style={{ padding: "10px 14px", border: 0, borderRadius: 8, background: "#b91c1c", color: "white", fontWeight: 700 }}>บันทึกโทษ</button>
      </div>
      {restrictions.map(item => <div key={item.id} style={{ marginTop: 10, padding: 10, background: item.is_active ? "#fef2f2" : "#f8fafc", borderRadius: 8, color: "#475569" }}>
        <b>{item.target_type === "user" ? item.user_id : item.org_name}</b> | {item.reason} | {item.ends_at ? `ถึง ${new Date(item.ends_at).toLocaleDateString("th-TH")}` : "ไม่มีกำหนด"} {item.is_active && <button onClick={() => disableRestriction(item.id)} style={{ float: "right", border: 0, color: "#15803d", background: "transparent", cursor: "pointer" }}>ยกเลิก</button>}
      </div>)}
      {message && <p style={{ color: "#64748b", marginBottom: 0 }}>{message}</p>}
    </section>
  </div>;
}
