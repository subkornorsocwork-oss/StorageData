"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Borrow = { id: number; borrow_date: string; return_due_date: string; status: string; borrow_items?: { quantity: number; equipment?: { name: string } | null }[] };

export default function StudentReturn() {
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMessage("กรุณาเข้าสู่ระบบก่อน"); setLoading(false); return; }
      const { data, error } = await supabase.from("borrow_requests").select("id, borrow_date, return_due_date, status, borrow_items(quantity, equipment(name))").eq("user_id", user.id).in("status", ["borrowing", "overdue"]).is("return_proof_url", null).order("return_due_date");
      if (error) setMessage(error.message);
      setBorrows((data as Borrow[] | null) ?? []);
      setLoading(false);
    };
    void load();
  }, []);

  const submit = async () => {
    if (!selectedId || !file) { setMessage("กรุณาเลือกรายการและแนบภาพการคืน"); return; }
    setSaving(true); setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");
      const path = `${user.id}/return-proof-${selectedId}-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;
      const url = supabase.storage.from("documents").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("borrow_requests").update({ return_proof_url: url }).eq("id", Number(selectedId)).eq("user_id", user.id);
      if (error) throw error;
      setBorrows((items) => items.filter((item) => item.id !== Number(selectedId)));
      setSelectedId(""); setFile(null); setMessage("ส่งภาพแจ้งคืนแล้ว เจ้าหน้าที่จะตรวจรับให้ครับ");
    } catch (error) { setMessage(error instanceof Error ? error.message : "แจ้งคืนไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  return <main style={{ maxWidth: 820, margin: "0 auto", padding: "36px 20px", color: "#1e293b" }}>
    <h1 style={{ color: "#800000" }}>📥 แจ้งคืนพัสดุ</h1>
    <p style={{ color: "#64748b" }}>เลือกคำขอที่กำลังยืม แล้วแนบภาพพัสดุที่นำมาคืน</p>
    <section style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,.07)", display: "grid", gap: 16 }}>
      {loading ? <div style={{ color: "#94a3b8" }}>กำลังโหลดรายการ...</div> : borrows.length === 0 ? <div style={{ color: "#64748b" }}>ไม่มีรายการที่รอแจ้งคืน</div> : <>
        <label style={{ fontWeight: 700 }}>รายการที่ต้องการคืน<select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ display: "block", width: "100%", marginTop: 8, padding: 12, border: "1px solid #cbd5e1", borderRadius: 8 }}><option value="">-- เลือกรายการ --</option>{borrows.map(item => <option key={item.id} value={item.id}>#{item.id} {item.borrow_items?.map(i => `${i.equipment?.name ?? "พัสดุ"} x${i.quantity}`).join(", ")}</option>)}</select></label>
        <label style={{ fontWeight: 700 }}>ภาพพัสดุที่คืน<input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={e => setFile(e.target.files?.[0] ?? null)} style={{ display: "block", marginTop: 8 }} /></label>
        <button onClick={submit} disabled={saving} style={{ padding: 13, border: 0, borderRadius: 8, background: saving ? "#94a3b8" : "#800000", color: "white", fontWeight: 700 }}>{saving ? "กำลังส่ง..." : "ส่งภาพแจ้งคืน"}</button>
      </>}
      {message && <p style={{ margin: 0, color: message.includes("แล้ว") ? "#15803d" : "#b91c1c" }}>{message}</p>}
    </section>
  </main>;
}
