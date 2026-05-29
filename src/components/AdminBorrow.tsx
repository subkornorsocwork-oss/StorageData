"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";

// ── Types ──────────────────────────────────────────────────
interface Equipment {
  id: number;
  name: string;
  name_en: string | null;
  barcode: string | null;
  emoji: string | null;
  total_qty: number;
  available_qty: number;
  description: string | null;
  is_active: boolean;
}

interface BorrowRequest {
  id: number;
  user_id: string;
  borrower_type: string | null;
  org_name: string | null;
  phone: string | null;
  borrow_date: string;
  return_due_date: string;
  actual_return: string | null;
  purpose: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  document_url: string | null;
  user_name?: string;
  student_id?: string;
  borrow_items?: { quantity: number; equipment: { name: string; emoji: string | null } }[];
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  student_id: string | null;
}

interface BorrowItemRow {
  borrow_request_id: number;
  quantity: number;
  equipment: { name: string; emoji: string | null } | { name: string; emoji: string | null }[] | null;
}

type ModalState = { isOpen: boolean; status: "loading"|"success"|"error"; title: string; message: string };

const THAI_MONTHS = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const fmtDate = (d: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
};
const fmtDateTime = (d: string) => {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
};

const isOverdue = (returnDue: string, status: string) => {
  if (status !== "borrowing") return false;
  return new Date() > new Date(returnDue);
};

const STATUS_LABEL: Record<string, string> = {
  pending: "รอตรวจสอบ", borrowing: "กำลังยืม",
  returned: "คืนแล้ว", overdue: "เกินกำหนด", cancelled: "ยกเลิก",
};

export default function AdminBorrow() {
  const { profile } = useRole();
  const [activeTab, setActiveTab] = useState<"requests"|"inventory">("requests");

  const [requests, setRequests]         = useState<BorrowRequest[]>([]);
  const [loadingReq, setLoadingReq]     = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm]     = useState("");
  const [scanInput, setScanInput]       = useState("");

  const [actionModal, setActionModal] = useState<{
    isOpen: boolean; type: "approve"|"reject"|"return"|null;
    req: BorrowRequest | null; note: string;
  }>({ isOpen: false, type: null, req: null, note: "" });

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loadingEq, setLoadingEq]   = useState(true);
  const [editingEq, setEditingEq]   = useState<Equipment | null>(null);
  const [isAddingEq, setIsAddingEq] = useState(false);
  const [eqForm, setEqForm]         = useState({ name:"", barcode:"", emoji:"📦", total_qty:1, description:"" });

  const [modal, setModal] = useState<ModalState>({ isOpen:false, status:"loading", title:"", message:"" });

  // ✅ แก้ตรงนี้: เพิ่ม , error ใน destructuring
  const loadRequests = useCallback(async () => {
    setLoadingReq(true);
    const { data: requestRows, error: requestError } = await supabase
      .from("borrow_requests")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("borrow request rows:", requestRows);
    console.log("borrow request error:", requestError);

    if (requestError) {
      setRequests([]);
      setModal({
        isOpen: true,
        status: "error",
        title: "โหลดรายการยืมไม่สำเร็จ",
        message: requestError.message,
      });
      setLoadingReq(false);
      return;
    }

    const baseRequests = (requestRows ?? []) as BorrowRequest[];
    if (baseRequests.length === 0) {
      setRequests([]);
      setLoadingReq(false);
      return;
    }

    const userIds = Array.from(new Set(baseRequests.map((req) => req.user_id).filter(Boolean)));
    const requestIds = baseRequests.map((req) => req.id);

    const [profilesResult, itemsResult] = await Promise.allSettled([
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name, student_id").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      requestIds.length > 0
        ? supabase
            .from("borrow_items")
            .select("borrow_request_id, quantity, equipment(name, emoji)")
            .in("borrow_request_id", requestIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const profilesData =
      profilesResult.status === "fulfilled" && !profilesResult.value.error
        ? (profilesResult.value.data as ProfileRow[] | null) ?? []
        : [];
    const borrowItemsData =
      itemsResult.status === "fulfilled" && !itemsResult.value.error
        ? (itemsResult.value.data as BorrowItemRow[] | null) ?? []
        : [];

    if (profilesResult.status === "fulfilled" && profilesResult.value.error) {
      console.error("profiles query error:", profilesResult.value.error);
    } else if (profilesResult.status === "rejected") {
      console.error("profiles query failed:", profilesResult.reason);
    }

    if (itemsResult.status === "fulfilled" && itemsResult.value.error) {
      console.error("borrow_items query error:", itemsResult.value.error);
    } else if (itemsResult.status === "rejected") {
      console.error("borrow_items query failed:", itemsResult.reason);
    }

    const profileById = new Map(
      profilesData.map((profile) => [profile.id, profile] as const)
    );
    const itemsByRequestId = new Map<number, BorrowRequest["borrow_items"]>();

    for (const item of borrowItemsData) {
      const equipmentValue = Array.isArray(item.equipment)
        ? item.equipment[0] ?? null
        : item.equipment;

      const currentItems = itemsByRequestId.get(item.borrow_request_id) ?? [];
      currentItems.push({
        quantity: item.quantity,
        equipment: {
          name: equipmentValue?.name ?? "-",
          emoji: equipmentValue?.emoji ?? null,
        },
      });
      itemsByRequestId.set(item.borrow_request_id, currentItems);
    }

    const mapped = baseRequests.map((request) => {
      const profileRow = profileById.get(request.user_id);
      return {
        ...request,
        user_name: profileRow?.full_name ?? "-",
        student_id: profileRow?.student_id ?? "-",
        borrow_items: itemsByRequestId.get(request.id) ?? [],
      };
    });

    setRequests(mapped);
    setLoadingReq(false);
  }, []);

  const loadEquipments = useCallback(async () => {
    setLoadingEq(true);
    const { data } = await supabase.from("equipment").select("*").order("name");
    setEquipments(data ?? []);
    setLoadingEq(false);
  }, []);

  useEffect(() => { loadRequests(); loadEquipments(); }, [loadRequests, loadEquipments]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const overdueFlag = isOverdue(r.return_due_date, r.status);
      const matchStatus = filterStatus === "all" ? true
        : filterStatus === "overdue" ? overdueFlag
        : r.status === filterStatus;
      const itemNames = r.borrow_items?.map(i => i.equipment?.name ?? "").join(" ") ?? "";
      const matchSearch = !searchTerm ||
        r.user_name?.includes(searchTerm) ||
        r.student_id?.includes(searchTerm) ||
        itemNames.includes(searchTerm);
      return matchStatus && matchSearch;
    });
  }, [requests, filterStatus, searchTerm]);

  const handleApprove = async () => {
    if (!actionModal.req) return;
    setActionModal(p => ({ ...p, isOpen: false }));
    setModal({ isOpen: true, status: "loading", title: "กำลังอนุมัติ...", message: "" });
    const { error } = await supabase.from("borrow_requests").update({
      status: "borrowing", approved_by: profile?.id,
    }).eq("id", actionModal.req.id);
    if (error) {
      setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
    } else {
      for (const item of actionModal.req.borrow_items ?? []) {
        const eq = equipments.find(e => e.name === item.equipment?.name);
        if (eq) await supabase.from("equipment").update({ available_qty: Math.max(0, eq.available_qty - item.quantity) }).eq("id", eq.id);
      }
      setModal({ isOpen: true, status: "success", title: "อนุมัติสำเร็จ ✅", message: `คำขอของ ${actionModal.req.user_name} อนุมัติแล้ว` });
      loadRequests(); loadEquipments();
    }
  };

  const handleReject = async () => {
    if (!actionModal.req) return;
    setActionModal(p => ({ ...p, isOpen: false }));
    setModal({ isOpen: true, status: "loading", title: "กำลังปฏิเสธ...", message: "" });
    const { error } = await supabase.from("borrow_requests").update({
      status: "cancelled", admin_note: actionModal.note, approved_by: profile?.id,
    }).eq("id", actionModal.req.id);
    if (error) {
      setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
    } else {
      setModal({ isOpen: true, status: "success", title: "ปฏิเสธแล้ว", message: "" });
      loadRequests();
    }
  };

  const handleReturn = async () => {
    if (!actionModal.req) return;
    setActionModal(p => ({ ...p, isOpen: false }));
    setModal({ isOpen: true, status: "loading", title: "กำลังบันทึกการคืน...", message: "" });
    const { error } = await supabase.from("borrow_requests").update({
      status: "returned", actual_return: new Date().toISOString(),
    }).eq("id", actionModal.req.id);
    if (error) {
      setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
    } else {
      for (const item of actionModal.req.borrow_items ?? []) {
        const eq = equipments.find(e => e.name === item.equipment?.name);
        if (eq) await supabase.from("equipment").update({ available_qty: eq.available_qty + item.quantity }).eq("id", eq.id);
      }
      setModal({ isOpen: true, status: "success", title: "บันทึกการคืนสำเร็จ ✅", message: "" });
      loadRequests(); loadEquipments();
    }
  };

  const handleScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = scanInput.trim();
    if (!code) return;
    const eq = equipments.find(e => e.barcode === code);
    if (!eq) { alert(`❌ ไม่พบอุปกรณ์บาร์โค้ด: ${code}`); setScanInput(""); return; }
    const active = requests.find(r => r.status === "borrowing" && r.borrow_items?.some(i => i.equipment?.name === eq.name));
    if (active) { setActionModal({ isOpen: true, type: "return", req: active, note: "" }); }
    else { alert(`⚠️ "${eq.name}" ไม่มีรายการยืมค้างอยู่`); }
    setScanInput("");
  };

  const handleSaveEq = async () => {
    if (!eqForm.name.trim() || eqForm.total_qty < 1)
      return setModal({ isOpen: true, status: "error", title: "ข้อมูลไม่ครบ", message: "กรุณากรอกชื่อและจำนวน" });
    setModal({ isOpen: true, status: "loading", title: "กำลังบันทึก...", message: "" });
    if (editingEq) {
      const diff = eqForm.total_qty - editingEq.total_qty;
      const { error } = await supabase.from("equipment").update({
        name: eqForm.name, barcode: eqForm.barcode || null, emoji: eqForm.emoji,
        total_qty: eqForm.total_qty, available_qty: Math.max(0, editingEq.available_qty + diff),
        description: eqForm.description || null,
      }).eq("id", editingEq.id);
      if (error) return setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
    } else {
      const { error } = await supabase.from("equipment").insert({
        name: eqForm.name, barcode: eqForm.barcode || null, emoji: eqForm.emoji,
        total_qty: eqForm.total_qty, available_qty: eqForm.total_qty,
        description: eqForm.description || null, is_active: true,
      });
      if (error) return setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
    }
    setModal({ isOpen: true, status: "success", title: "บันทึกสำเร็จ ✅", message: "" });
    setEditingEq(null); setIsAddingEq(false);
    setEqForm({ name:"", barcode:"", emoji:"📦", total_qty:1, description:"" });
    loadEquipments();
  };

  const handleDeleteEq = async (eq: Equipment) => {
    if (!confirm(`ลบ "${eq.name}" ออกจากระบบ?`)) return;
    await supabase.from("equipment").delete().eq("id", eq.id);
    loadEquipments();
  };

  const handleToggleEq = async (eq: Equipment) => {
    await supabase.from("equipment").update({ is_active: !eq.is_active }).eq("id", eq.id);
    loadEquipments();
  };

  const StatusBadge = ({ req }: { req: BorrowRequest }) => {
    const over = isOverdue(req.return_due_date, req.status);
    if (over) return <span style={{ padding:"4px 8px", backgroundColor:"#fee2e2", color:"#b91c1c", borderRadius:"12px", fontSize:"0.78rem", fontWeight:"bold" }}>🚨 เกินกำหนด</span>;
    const colors: Record<string, [string,string]> = {
      pending: ["#fef3c7","#b45309"], borrowing: ["#dbeafe","#1e40af"],
      returned: ["#dcfce7","#15803d"], cancelled: ["#f1f5f9","#64748b"],
    };
    const [bg, color] = colors[req.status] ?? ["#f1f5f9","#64748b"];
    return <span style={{ padding:"4px 8px", backgroundColor:bg, color, borderRadius:"12px", fontSize:"0.78rem", fontWeight:"bold" }}>{STATUS_LABEL[req.status] ?? req.status}</span>;
  };

  return (
    <div style={{ padding:"40px", maxWidth:"1200px", margin:"0 auto" }}>
      <h1 style={{ color:"#800000", marginBottom:"20px" }}>📦 ระบบจัดการยืม-คืนพัสดุและอุปกรณ์</h1>

      <div style={{ backgroundColor:"#fff0f2", border:"2px dashed #800000", padding:"15px 20px", borderRadius:"12px", marginBottom:"25px", display:"flex", alignItems:"center", gap:"15px" }}>
        <span style={{ fontSize:"1.5rem" }}>📷</span>
        <div style={{ flex:1 }}>
          <h4 style={{ margin:0, color:"#800000" }}>สแกนบาร์โค้ดเพื่อรับคืนด่วน</h4>
          <p style={{ margin:"4px 0 0", fontSize:"0.85rem", color:"#64748b" }}>คลิกที่ช่องแล้วสแกนบาร์โค้ด</p>
        </div>
        <input type="text" placeholder="||||| สแกนบาร์โค้ด..." value={scanInput}
          onChange={e => setScanInput(e.target.value)} onKeyDown={handleScan}
          style={{ padding:"12px 20px", borderRadius:"8px", border:"2px solid #800000", width:"280px", fontSize:"1rem", fontWeight:"bold", textAlign:"center" }} />
      </div>

      <div style={{ display:"flex", gap:"10px", marginBottom:"24px", borderBottom:"2px solid #e2e8f0" }}>
        {([
          { key:"requests",  label:"📝 จัดการคำขอยืม-คืน" },
          { key:"inventory", label:"📦 สต๊อกพัสดุ & บาร์โค้ด" },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{ padding:"10px 20px", border:"none", cursor:"pointer", fontWeight:"bold", fontSize:"0.9rem",
              backgroundColor:"transparent", color: activeTab === tab.key ? "#800000" : "#64748b",
              borderBottom: activeTab === tab.key ? "3px solid #800000" : "3px solid transparent" }}>
            {tab.label}
            {tab.key === "requests" && requests.filter(r => r.status === "pending").length > 0 && (
              <span style={{ marginLeft:"6px", backgroundColor:"#800000", color:"white", borderRadius:"999px", padding:"1px 7px", fontSize:"0.75rem" }}>
                {requests.filter(r => r.status === "pending").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "requests" && (
        <div>
          <div style={{ display:"flex", gap:"12px", marginBottom:"20px", flexWrap:"wrap" }}>
            <div style={{ display:"flex", gap:"6px", backgroundColor:"white", padding:"6px", borderRadius:"12px", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              {([
                { key:"all", label:"ทั้งหมด" }, { key:"pending", label:"รอตรวจสอบ" },
                { key:"borrowing", label:"กำลังยืม" }, { key:"overdue", label:"🚨 เกินกำหนด" },
                { key:"returned", label:"คืนแล้ว" },
              ]).map(s => (
                <button key={s.key} onClick={() => setFilterStatus(s.key)}
                  style={{ padding:"7px 12px", border:"none", borderRadius:"8px", cursor:"pointer", fontSize:"0.82rem",
                    backgroundColor: filterStatus === s.key ? "#800000" : "transparent",
                    color: filterStatus === s.key ? "white" : "#64748b",
                    fontWeight: filterStatus === s.key ? "bold" : "normal" }}>
                  {s.label}
                </button>
              ))}
            </div>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="🔍 ค้นหาชื่อ, รหัส, อุปกรณ์..."
              style={{ flex:1, minWidth:"200px", padding:"10px 14px", borderRadius:"10px", border:"1px solid #e2e8f0", fontSize:"0.9rem" }} />
          </div>

          <div style={{ backgroundColor:"white", borderRadius:"18px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
            {loadingReq ? (
              <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>กำลังโหลด...</div>
            ) : filteredRequests.length === 0 ? (
              <div style={{ padding:"60px", textAlign:"center", color:"#94a3b8" }}>ไม่พบรายการ</div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:"800px" }}>
                  <thead>
                    <tr style={{ backgroundColor:"#f8fafc", borderBottom:"2px solid #800000" }}>
                      {["วันที่ยืม","กำหนดคืน","ผู้ยืม","อุปกรณ์","เอกสาร","สถานะ","จัดการ"].map(h => (
                        <th key={h} style={{ padding:"12px 14px", textAlign:"left", fontSize:"0.82rem", fontWeight:700, color:"#64748b" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req, idx) => {
                      const over = isOverdue(req.return_due_date, req.status);
                      const items = req.borrow_items?.map(i => `${i.equipment?.emoji ?? "📦"} ${i.equipment?.name} x${i.quantity}`).join(", ") ?? "-";
                      return (
                        <tr key={req.id} style={{ borderBottom:"1px solid #f1f5f9", backgroundColor: over ? "#fef2f2" : idx%2===0 ? "white" : "#fafafa" }}>
                          <td style={{ padding:"12px 14px", fontSize:"0.85rem" }}>{fmtDate(req.borrow_date)}</td>
                          <td style={{ padding:"12px 14px", fontSize:"0.85rem", color: over ? "#b91c1c" : "#ef4444", fontWeight:600 }}>{fmtDateTime(req.return_due_date)}</td>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ fontWeight:600, fontSize:"0.875rem" }}>{req.user_name}</div>
                            <div style={{ fontSize:"0.75rem", color:"#94a3b8" }}>{req.org_name ?? req.student_id}</div>
                          </td>
                          <td style={{ padding:"12px 14px", fontSize:"0.82rem", color:"#475569" }}>{items}</td>
                          <td style={{ padding:"12px 14px" }}>
                            {req.document_url
                              ? <a href={req.document_url} target="_blank" rel="noreferrer" style={{ padding:"4px 8px", backgroundColor:"#f1f5f9", color:"#475569", borderRadius:"6px", textDecoration:"none", fontSize:"0.78rem", fontWeight:600 }}>📄 ดูไฟล์</a>
                              : <span style={{ fontSize:"0.78rem", color:"#94a3b8" }}>-</span>}
                          </td>
                          <td style={{ padding:"12px 14px" }}><StatusBadge req={req} /></td>
                          <td style={{ padding:"12px 14px" }}>
                            <div style={{ display:"flex", gap:"6px" }}>
                              {req.status === "pending" && (
                                <>
                                  <button onClick={() => setActionModal({ isOpen:true, type:"approve", req, note:"" })}
                                    style={{ padding:"5px 10px", border:"none", borderRadius:"6px", backgroundColor:"#15803d", color:"white", fontWeight:700, fontSize:"0.78rem", cursor:"pointer" }}>✅ อนุมัติ</button>
                                  <button onClick={() => setActionModal({ isOpen:true, type:"reject", req, note:"" })}
                                    style={{ padding:"5px 10px", border:"none", borderRadius:"6px", backgroundColor:"#b91c1c", color:"white", fontWeight:700, fontSize:"0.78rem", cursor:"pointer" }}>❌ ปฏิเสธ</button>
                                </>
                              )}
                              {req.status === "borrowing" && (
                                <button onClick={() => setActionModal({ isOpen:true, type:"return", req, note:"" })}
                                  style={{ padding:"5px 10px", border:"none", borderRadius:"6px", backgroundColor: over ? "#b91c1c" : "#3b82f6", color:"white", fontWeight:700, fontSize:"0.78rem", cursor:"pointer" }}>
                                  {over ? "🚨 รับคืนล่าช้า" : "📥 รับคืน"}
                                </button>
                              )}
                              {(req.status === "returned" || req.status === "cancelled") && (
                                <span style={{ fontSize:"0.78rem", color:"#94a3b8" }}>จบรายการ</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ padding:"10px 16px", fontSize:"0.78rem", color:"#94a3b8", textAlign:"right", borderTop:"1px solid #f1f5f9" }}>
              แสดง {filteredRequests.length} รายการ
            </div>
          </div>
        </div>
      )}

      {activeTab === "inventory" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
            <h2 style={{ margin:0, color:"#1e293b", fontSize:"1.1rem" }}>📦 รายการพัสดุทั้งหมด</h2>
            <button onClick={() => { setIsAddingEq(!isAddingEq); setEditingEq(null); setEqForm({ name:"", barcode:"", emoji:"📦", total_qty:1, description:"" }); }}
              style={{ backgroundColor:"#800000", color:"white", padding:"8px 16px", borderRadius:"8px", border:"none", cursor:"pointer", fontWeight:"bold" }}>
              {isAddingEq ? "ยกเลิก" : "+ เพิ่มพัสดุใหม่"}
            </button>
          </div>

          {(isAddingEq || editingEq) && (
            <div style={{ backgroundColor:"white", padding:"20px", borderRadius:"14px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", marginBottom:"20px", display:"grid", gridTemplateColumns:"1fr 1fr 80px 1fr auto", gap:"12px", alignItems:"end" }}>
              <div>
                <label style={{ display:"block", fontSize:"0.8rem", fontWeight:600, marginBottom:"4px" }}>ชื่ออุปกรณ์ *</label>
                <input type="text" value={eqForm.name} onChange={e => setEqForm(p => ({...p, name: e.target.value}))} placeholder="เช่น โปรเจคเตอร์"
                  style={{ width:"100%", padding:"9px", borderRadius:"8px", border:"1px solid #e2e8f0", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"0.8rem", fontWeight:600, marginBottom:"4px" }}>บาร์โค้ด</label>
                <input type="text" value={eqForm.barcode} onChange={e => setEqForm(p => ({...p, barcode: e.target.value}))} placeholder="เช่น EQ-001"
                  style={{ width:"100%", padding:"9px", borderRadius:"8px", border:"1px solid #e2e8f0", boxSizing:"border-box" as const }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"0.8rem", fontWeight:600, marginBottom:"4px" }}>Emoji</label>
                <input type="text" value={eqForm.emoji} onChange={e => setEqForm(p => ({...p, emoji: e.target.value}))}
                  style={{ width:"100%", padding:"9px", borderRadius:"8px", border:"1px solid #e2e8f0", textAlign:"center", fontSize:"1.2rem" }} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"0.8rem", fontWeight:600, marginBottom:"4px" }}>จำนวนทั้งหมด *</label>
                <input type="number" min={1} value={eqForm.total_qty} onChange={e => setEqForm(p => ({...p, total_qty: Number(e.target.value)}))}
                  style={{ width:"100%", padding:"9px", borderRadius:"8px", border:"1px solid #e2e8f0", boxSizing:"border-box" as const }} />
              </div>
              <button onClick={handleSaveEq} style={{ padding:"9px 18px", backgroundColor:"#10b981", color:"white", border:"none", borderRadius:"8px", fontWeight:"bold", cursor:"pointer" }}>บันทึก</button>
            </div>
          )}

          <div style={{ backgroundColor:"white", borderRadius:"18px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", overflow:"hidden" }}>
            {loadingEq ? (
              <div style={{ padding:"40px", textAlign:"center", color:"#94a3b8" }}>กำลังโหลด...</div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ backgroundColor:"#f8fafc", borderBottom:"2px solid #800000" }}>
                    {["บาร์โค้ด","ชื่อพัสดุ","ทั้งหมด","พร้อมให้ยืม","สถานะ","จัดการ"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:"0.82rem", fontWeight:700, color:"#64748b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equipments.map((eq, idx) => (
                    <tr key={eq.id} style={{ borderBottom:"1px solid #f1f5f9", backgroundColor: idx%2===0 ? "white" : "#fafafa" }}>
                      <td style={{ padding:"12px 16px", color:"#94a3b8", fontSize:"0.82rem" }}>{eq.barcode ?? "-"}</td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          <span style={{ fontSize:"1.2rem" }}>{eq.emoji ?? "📦"}</span>
                          <span style={{ fontWeight:600, color: eq.is_active ? "#1e293b" : "#94a3b8" }}>{eq.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:"12px 16px", textAlign:"center" }}>{eq.total_qty}</td>
                      <td style={{ padding:"12px 16px", textAlign:"center" }}>
                        <span style={{ fontWeight:700, color: eq.available_qty > 0 ? "#15803d" : "#ef4444" }}>{eq.available_qty}</span>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ padding:"3px 10px", borderRadius:"999px", fontSize:"0.78rem", fontWeight:700,
                          backgroundColor: eq.is_active ? "#dcfce7" : "#f1f5f9", color: eq.is_active ? "#15803d" : "#64748b" }}>
                          {eq.is_active ? "🟢 พร้อมใช้" : "⚫ ปิด"}
                        </span>
                      </td>
                      <td style={{ padding:"12px 16px" }}>
                        <div style={{ display:"flex", gap:"6px" }}>
                          <button onClick={() => { setEditingEq(eq); setIsAddingEq(false); setEqForm({ name:eq.name, barcode:eq.barcode??"", emoji:eq.emoji??"📦", total_qty:eq.total_qty, description:eq.description??"" }); }}
                            style={{ padding:"5px 10px", border:"1px solid #e2e8f0", borderRadius:"6px", background:"white", cursor:"pointer", fontSize:"0.78rem", fontWeight:600 }}>✏️ แก้ไข</button>
                          <button onClick={() => handleToggleEq(eq)}
                            style={{ padding:"5px 10px", border:"none", borderRadius:"6px", cursor:"pointer", fontSize:"0.78rem", fontWeight:700, backgroundColor: eq.is_active ? "#b91c1c" : "#15803d", color:"white" }}>
                            {eq.is_active ? "ปิด" : "เปิด"}
                          </button>
                          <button onClick={() => handleDeleteEq(eq)}
                            style={{ padding:"5px 10px", border:"none", borderRadius:"6px", background:"#fee2e2", color:"#b91c1c", cursor:"pointer", fontSize:"0.78rem" }}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {actionModal.isOpen && actionModal.req && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:9998, padding:"20px" }}>
          <div style={{ backgroundColor:"white", padding:"28px", borderRadius:"20px", width:"100%", maxWidth:"460px" }}>
            <h3 style={{ margin:"0 0 16px" }}>
              {actionModal.type === "approve" ? "✅ ยืนยันการอนุมัติ" : actionModal.type === "reject" ? "❌ ยืนยันการปฏิเสธ" : "📥 ยืนยันการรับคืน"}
            </h3>
            <div style={{ backgroundColor:"#f8fafc", padding:"14px", borderRadius:"10px", marginBottom:"16px", fontSize:"0.875rem", lineHeight:"1.9" }}>
              <div><b>ผู้ยืม:</b> {actionModal.req.user_name} ({actionModal.req.student_id})</div>
              <div><b>อุปกรณ์:</b> {actionModal.req.borrow_items?.map(i => `${i.equipment?.name} x${i.quantity}`).join(", ") ?? "-"}</div>
              <div><b>วันยืม:</b> {fmtDate(actionModal.req.borrow_date)}</div>
              <div><b>กำหนดคืน:</b> {fmtDateTime(actionModal.req.return_due_date)}</div>
            </div>
            {actionModal.type === "reject" && (
              <div style={{ marginBottom:"16px" }}>
                <label style={{ display:"block", marginBottom:"6px", fontWeight:600, fontSize:"0.9rem" }}>เหตุผลการปฏิเสธ</label>
                <textarea rows={3} value={actionModal.note} onChange={e => setActionModal(p => ({...p, note: e.target.value}))}
                  placeholder="ระบุเหตุผล..." style={{ width:"100%", padding:"10px", borderRadius:"8px", border:"1px solid #e2e8f0", resize:"none" }} />
              </div>
            )}
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setActionModal(p => ({...p, isOpen:false}))}
                style={{ flex:1, padding:"11px", border:"1px solid #e2e8f0", borderRadius:"10px", background:"white", cursor:"pointer", fontWeight:600 }}>ยกเลิก</button>
              <button onClick={actionModal.type === "approve" ? handleApprove : actionModal.type === "reject" ? handleReject : handleReturn}
                style={{ flex:1, padding:"11px", border:"none", borderRadius:"10px", color:"white", fontWeight:"bold", cursor:"pointer",
                  backgroundColor: actionModal.type === "approve" ? "#15803d" : actionModal.type === "reject" ? "#b91c1c" : "#3b82f6" }}>
                {actionModal.type === "approve" ? "อนุมัติ" : actionModal.type === "reject" ? "ปฏิเสธ" : "รับคืน"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal.isOpen && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.5)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:9999 }}>
          <div style={{ backgroundColor:"white", padding:"32px", borderRadius:"20px", width:"100%", maxWidth:"360px", textAlign:"center" }}>
            {modal.status === "loading" && <div style={{ width:"40px", height:"40px", border:"4px solid #f3f3f3", borderTop:"4px solid #800000", borderRadius:"50%", margin:"0 auto 20px", animation:"spin 1s linear infinite" }} />}
            {modal.status === "success" && <div style={{ fontSize:"3rem", marginBottom:"12px" }}>✅</div>}
            {modal.status === "error"   && <div style={{ fontSize:"3rem", marginBottom:"12px" }}>❌</div>}
            <h3 style={{ margin:"0 0 8px" }}>{modal.title}</h3>
            <p style={{ color:"#64748b", marginBottom:"20px" }}>{modal.message}</p>
            {modal.status !== "loading" && (
              <button onClick={() => setModal(p => ({...p, isOpen:false}))}
                style={{ width:"100%", padding:"11px", border:"none", borderRadius:"10px", backgroundColor:"#800000", color:"white", fontWeight:"bold", cursor:"pointer" }}>
                ตกลง
              </button>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html:`@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}
