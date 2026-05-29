"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Location { id: number; name: string; capacity: number | null; }
interface BookingSlot { start_time: string; end_time: string; purpose: string | null; location_id: number; booking_date: string; }
interface ModalState { isOpen: boolean; status: "loading"|"success"|"error"; title: string; message: string; }

// ✅ ข้อมูลแต่ละวันที่จอง
interface DayBooking {
  date: string;        // "2026-05-15"
  locationId: number|"";
  startTime: string;
  endTime: string;
  attendees: number|"";
}

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS   = ["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];

const toMin     = (t: string) => { const [h,m] = t.split(":").map(Number); return h*60+m; };
const fmtTime   = (t: string) => t.slice(0,5);
const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
const thaiDate  = (dateStr: string) => {
  const [y,m,d] = dateStr.split("-").map(Number);
  return `${d} ${THAI_MONTHS[m-1]} ${y+543}`;
};

function FileBox({ label, required, file, accept, inputId, onSelect }: {
  label: string; required?: boolean; file: File|null;
  accept: string; inputId: string; onSelect: (f: File) => void;
}) {
  return (
    <div>
      <label style={{ display:"block", marginBottom:"6px", fontSize:"0.85rem", fontWeight:600 }}>
        {label} {required && <span style={{ color:"#ef4444" }}>*</span>}
      </label>
      <div onClick={() => document.getElementById(inputId)?.click()}
        style={{ border:"2px dashed #cbd5e1", padding:"12px", borderRadius:"12px", textAlign:"center",
          backgroundColor: file ? "#f0fdf4" : "#f8fafc", cursor:"pointer" }}>
        <input id={inputId} type="file" hidden accept={accept}
          onChange={e => { if (e.target.files?.[0]) onSelect(e.target.files[0]); }} />
        <div style={{ fontSize:"18px", marginBottom:"2px" }}>{file ? "✅" : "📤"}</div>
        <div style={{ fontSize:"0.78rem", color: file ? "#16a34a" : "#64748b", fontWeight:600 }}>
          {file ? file.name : `คลิกเพื่อเลือก${label}`}
        </div>
      </div>
    </div>
  );
}

export default function StudentBooking() {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());

  const [locations,  setLocations]  = useState<Location[]>([]);
  const [slots,      setSlots]      = useState<BookingSlot[]>([]);
  const [bookedDays, setBookedDays] = useState<Set<number>>(new Set());

  // ✅ หลายวัน แทน selectedDay เดียว
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dayBookings,   setDayBookings]   = useState<DayBooking[]>([]);

  // ข้อมูลร่วมทุกวัน
  const [purpose,     setPurpose]     = useState("");
  const [bookerType,  setBookerType]  = useState<"student"|"organization">("student");
  const [orgName,     setOrgName]     = useState("");
  const [bookingForm, setBookingForm] = useState<File|null>(null);
  const [studentCard, setStudentCard] = useState<File|null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen:false, status:"loading", title:"", message:"" });

  useEffect(() => {
    supabase.from("locations").select("id,name,capacity").eq("is_active",true).order("name")
      .then(({ data }) => setLocations(data ?? []));
  }, []);

  const loadMonthBookings = useCallback(async (year: number, month: number) => {
    const lastDay = new Date(year, month+1, 0).getDate();
    const from = `${year}-${String(month+1).padStart(2,"0")}-01`;
    const to   = `${year}-${String(month+1).padStart(2,"0")}-${lastDay}`;
    const { data } = await supabase
      .from("bookings").select("start_time,end_time,purpose,location_id,booking_date")
      .in("status",["approved","pending"]).gte("booking_date",from).lte("booking_date",to);
    setSlots(data ?? []);
    setBookedDays(new Set((data ?? []).map(b => Number(b.booking_date.split("-")[2]))));
  }, []);

  useEffect(() => { loadMonthBookings(currentYear, currentMonth); }, [currentYear, currentMonth, loadMonthBookings]);

  const daysInMonth     = new Date(currentYear, currentMonth+1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const blanks    = Array.from({ length: firstDayOfMonth });
  const daysArray = Array.from({ length: daysInMonth }, (_,i) => i+1);

  const changeMonth = (offset: number) => {
    let m = currentMonth+offset, y = currentYear;
    if (m < 0)  { m=11; y--; }
    if (m > 11) { m=0;  y++; }
    setCurrentMonth(m); setCurrentYear(y);
  };

  // ✅ toggle วันที่เลือก
  const toggleDay = (d: number) => {
    const dateStr = toDateStr(currentYear, currentMonth, d);
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        // ลบออก
        setDayBookings(db => db.filter(x => x.date !== dateStr));
        return prev.filter(x => x !== dateStr);
      } else {
        // เพิ่ม (ตรวจสอบป้องกันข้อมูลซ้ำ)
        setDayBookings(db => {
          if (db.some(x => x.date === dateStr)) return db;
          return [...db, { date: dateStr, locationId: "", startTime: "", endTime: "", attendees: "" }];
        });
        return [...prev, dateStr].sort();
      }
    });
  };

  // ✅ อัปเดตข้อมูลของวันที่เจาะจง
  const updateDayBooking = (date: string, field: keyof DayBooking, value: any) => {
    setDayBookings(prev => prev.map(d => d.date === date ? { ...d, [field]: value } : d));
  };

  const uploadOneFile = async (file: File, userId: string, prefix: string): Promise<string> => {
    const ext  = file.name.split(".").pop();
    const path = `${userId}/${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("booking-docs").upload(path, file);
    if (error) throw new Error(`อัปโหลด ${prefix} ไม่สำเร็จ: ${error.message}`);
    return supabase.storage.from("booking-docs").getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDates.length === 0)
      return setModal({ isOpen:true, status:"error", title:"ยังไม่ได้เลือกวัน", message:"กรุณาคลิกเลือกวันที่ต้องการจองในปฏิทินก่อนครับ" });

    // เช็คทุกวันกรอกครบ
    for (const db of dayBookings) {
      if (!db.locationId || !db.startTime || !db.endTime)
        return setModal({ isOpen:true, status:"error", title:"ข้อมูลไม่ครบ", message:`กรุณากรอกสถานที่และเวลาของวันที่ ${thaiDate(db.date)} ให้ครบ` });
      if (toMin(db.startTime) >= toMin(db.endTime))
        return setModal({ isOpen:true, status:"error", title:"เวลาไม่ถูกต้อง", message:`วันที่ ${thaiDate(db.date)}: เวลาสิ้นสุดต้องมาหลังเวลาเริ่มต้น` });
      const loc = locations.find(l => l.id === db.locationId);
      if (loc?.capacity && db.attendees !== "" && Number(db.attendees) > loc.capacity)
        return setModal({ isOpen:true, status:"error", title:"จำนวนคนเกินความจุ", message:`วันที่ ${thaiDate(db.date)}: สถานที่รองรับได้สูงสุด ${loc.capacity} คน` });
    }

    if (!purpose)
      return setModal({ isOpen:true, status:"error", title:"ข้อมูลไม่ครบ", message:"กรุณาระบุวัตถุประสงค์" });
    if (!bookingForm)
      return setModal({ isOpen:true, status:"error", title:"ไม่พบเอกสาร", message:"กรุณาแนบแบบฟอร์มขอใช้สถานที่" });
    if (!studentCard)
      return setModal({ isOpen:true, status:"error", title:"ไม่พบสำเนาบัตร", message:"กรุณาแนบสำเนาบัตรนักศึกษา" });

    setSubmitting(true);
    setModal({ isOpen:true, status:"loading", title:"กำลังส่งคำขอ...", message:`กำลังบันทึกการจอง ${selectedDates.length} วัน...` });

    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      // เช็กเวลาซ้อนทุกวัน
      for (const db of dayBookings) {
        const { data: conflicts } = await supabase.from("bookings")
          .select("start_time,end_time").eq("location_id", db.locationId)
          .eq("booking_date", db.date).in("status",["approved","pending"]);
        const newS = toMin(db.startTime), newE = toMin(db.endTime);
        if ((conflicts??[]).some(b => newS < toMin(b.end_time) && newE > toMin(b.start_time))) {
          const loc = locations.find(l => l.id === db.locationId);
          throw new Error(`วันที่ ${thaiDate(db.date)} ห้อง "${loc?.name}" มีผู้จองไว้แล้วในช่วงเวลานี้`);
        }
      }

      // อัปโหลดเอกสาร (ใช้ร่วมกันทุกวัน)
      setModal({ isOpen:true, status:"loading", title:"กำลังอัปโหลดเอกสาร...", message:"กรุณารอสักครู่" });
      const [formUrl, cardUrl] = await Promise.all([
        uploadOneFile(bookingForm, user.id, "booking-form"),
        uploadOneFile(studentCard, user.id, "student-card"),
      ]);

      // ✅ Insert ทุกวันพร้อมกัน
      setModal({ isOpen:true, status:"loading", title:"กำลังบันทึกข้อมูล...", message:`บันทึกการจอง ${selectedDates.length} วัน...` });
      const insertRows = dayBookings.map(db => ({
        user_id: user.id,
        location_id: db.locationId,
        booking_date: db.date,
        start_time: db.startTime,
        end_time: db.endTime,
        purpose,
        attendees: db.attendees === "" ? null : Number(db.attendees),
        booker_type: bookerType,
        org_name: bookerType === "organization" ? orgName : null,
        document_url: JSON.stringify({ bookingForm: formUrl, studentCard: cardUrl }),
        status: "pending",
      }));

      const { error: insertErr } = await supabase.from("bookings").insert(insertRows);
      if (insertErr) throw insertErr;

      setModal({ isOpen:true, status:"success", title:"ส่งคำขอสำเร็จ! 🎉",
        message:`จองสำเร็จ ${selectedDates.length} วัน รอการอนุมัติจากเจ้าหน้าที่` });

      // Reset ทุกอย่าง
      setSelectedDates([]); setDayBookings([]);
      setPurpose(""); setOrgName(""); setBookingForm(null); setStudentCard(null);
      await loadMonthBookings(currentYear, currentMonth);
    } catch (err: any) {
      setModal({ isOpen:true, status:"error", title:"จองไม่สำเร็จ", message: err.message ?? "กรุณาลองใหม่" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor:"#f1f5f9", minHeight:"100%" }}>

      {modal.isOpen && (
        <div style={{ position:"fixed", inset:0, backgroundColor:"rgba(0,0,0,0.6)", display:"flex", justifyContent:"center", alignItems:"center", zIndex:10000, padding:"20px" }}>
          <div style={{ backgroundColor:"white", padding:"32px", borderRadius:"20px", width:"100%", maxWidth:"420px", textAlign:"center" }}>
            {modal.status==="loading" && <div style={{ width:"40px",height:"40px",border:"4px solid #f3f3f3",borderTop:"4px solid #800000",borderRadius:"50%",margin:"0 auto 20px",animation:"spin 1s linear infinite" }} />}
            {modal.status==="success" && <div style={{ fontSize:"48px",marginBottom:"12px" }}>✅</div>}
            {modal.status==="error"   && <div style={{ fontSize:"48px",marginBottom:"12px" }}>❌</div>}
            <h2 style={{ margin:"0 0 10px",color:"#1e293b" }}>{modal.title}</h2>
            <p  style={{ color:"#64748b",marginBottom:"25px",lineHeight:"1.6" }}>{modal.message}</p>
            {modal.status !== "loading" && (
              <button onClick={() => setModal(p => ({...p,isOpen:false}))}
                style={{ width:"100%",padding:"12px",border:"none",borderRadius:"10px",backgroundColor:"#800000",color:"white",fontWeight:"bold",cursor:"pointer" }}>
                ตกลง
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ padding:"40px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(350px, 1fr))", gap:"30px", maxWidth:"1200px", margin:"0 auto" }}>

          {/* ── ซ้าย ── */}
          <section style={{ display:"flex", flexDirection:"column", gap:"25px" }}>

            {/* ปฏิทิน */}
            <div style={{ backgroundColor:"white", padding:"30px", borderRadius:"24px", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"15px" }}>
                <div>
                  <h3 style={{ margin:0, color:"#1e293b" }}>1. เลือกวันที่จอง</h3>
                  <p style={{ margin:"4px 0 0", fontSize:"0.8rem", color:"#64748b" }}>คลิกเลือกได้หลายวัน</p>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                  <button type="button" onClick={() => changeMonth(-1)} style={{ border:"none",background:"#f1f5f9",borderRadius:"8px",padding:"8px 12px",cursor:"pointer",fontWeight:"bold" }}>&lt;</button>
                  <span style={{ fontWeight:"bold",color:"#800000",minWidth:"130px",textAlign:"center" }}>{THAI_MONTHS[currentMonth]} {currentYear+543}</span>
                  <button type="button" onClick={() => changeMonth(1)}  style={{ border:"none",background:"#f1f5f9",borderRadius:"8px",padding:"8px 12px",cursor:"pointer",fontWeight:"bold" }}>&gt;</button>
                </div>
              </div>

              {/* ✅ แสดงจำนวนวันที่เลือก */}
              {selectedDates.length > 0 && (
                <div style={{ marginBottom:"12px", padding:"8px 12px", backgroundColor:"#fef2f2", borderRadius:"10px", fontSize:"0.85rem", color:"#800000", fontWeight:600 }}>
                  🗓️ เลือกแล้ว {selectedDates.length} วัน
                  <button onClick={() => { setSelectedDates([]); setDayBookings([]); }}
                    style={{ marginLeft:"10px", fontSize:"0.75rem", color:"#94a3b8", background:"none", border:"none", cursor:"pointer" }}>
                    ล้างทั้งหมด ✕
                  </button>
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"6px", marginBottom:"8px" }}>
                {THAI_DAYS.map(d => <div key={d} style={{ textAlign:"center",fontSize:"0.8rem",fontWeight:600,color:"#64748b" }}>{d}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:"6px" }}>
                {blanks.map((_,i) => <div key={`b${i}`} />)}
                {daysArray.map(d => {
                  const dateStr = toDateStr(currentYear, currentMonth, d);
                  const isBooked  = bookedDays.has(d);
                  const isSel     = selectedDates.includes(dateStr);
                  return (
                    <button type="button" key={`day-${d}`} onClick={() => toggleDay(d)}
                      style={{ position:"relative", height:"42px", border: isSel ? "2px solid #800000" : "none",
                        borderRadius:"10px",
                        backgroundColor: isSel ? "#800000" : "transparent",
                        color: isSel ? "white" : "#334155",
                        cursor:"pointer", fontWeight: isSel ? "bold" : "normal",
                        transition:"all 0.15s", overflow:"hidden" }}>
                      {d}
                      {isBooked && <div style={{ position:"absolute",bottom:3,left:"20%",width:"60%",height:"3px",backgroundColor:isSel?"#fca5a5":"#ef4444",borderRadius:"2px" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* คิวการใช้งาน */}
            <div style={{ backgroundColor:"white", padding:"20px 25px", borderRadius:"20px", borderLeft:"4px solid #800000" }}>
              <h4 style={{ margin:"0 0 12px", color:"#1e293b", fontSize:"0.95rem" }}>📅 การจองในเดือนนี้</h4>
              {slots.length > 0 ? (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px", maxHeight:"200px", overflowY:"auto" }}>
                  {slots.map((bk,i) => {
                    const loc = locations.find(l => l.id === bk.location_id);
                    return (
                      <div key={`slot-${i}`} style={{ padding:"10px 12px", backgroundColor:"#f8fafc", borderRadius:"10px", border:"1px solid #e2e8f0", fontSize:"0.82rem" }}>
                        <div style={{ display:"flex", justifyContent:"space-between" }}>
                          <span style={{ fontWeight:"bold", color:"#800000" }}>{fmtTime(bk.start_time)} – {fmtTime(bk.end_time)}</span>
                          <span style={{ color:"#64748b" }}>{thaiDate(bk.booking_date)}</span>
                        </div>
                        <div style={{ color:"#475569", marginTop:"2px" }}>{loc?.name ?? "-"} • {bk.purpose}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding:"12px", textAlign:"center", backgroundColor:"#f0fdf4", color:"#16a34a", borderRadius:"10px", fontWeight:600, fontSize:"0.85rem" }}>
                  ✨ เดือนนี้ยังไม่มีการจอง
                </div>
              )}
            </div>

            {/* ดาวน์โหลด */}
            <div style={{ backgroundColor:"white", padding:"25px", borderRadius:"24px", border:"2px dashed #800000" }}>
              <h4 style={{ margin:"0 0 8px", color:"#800000" }}>📄 ขั้นตอนการส่งเอกสาร</h4>
              <p style={{ fontSize:"0.85rem", color:"#64748b", margin:"0 0 15px", lineHeight:"1.6" }}>
                1. ดาวน์โหลดแบบฟอร์มด้านล่าง<br/>
                2. เซ็นชื่อผู้จองและอาจารย์ที่ปรึกษา<br/>
                3. แนบแบบฟอร์ม + สำเนาบัตรนักศึกษาในฟอร์มด้านขวา
              </p>
              <a href="/forms/booking-form.pdf" download
                style={{ display:"flex", alignItems:"center", gap:"10px", padding:"12px 16px", backgroundColor:"#fdf2f2", color:"#800000", borderRadius:"12px", textDecoration:"none", fontWeight:600, fontSize:"0.9rem", border:"1px solid #fecaca" }}>
                ⬇️ ดาวน์โหลดแบบฟอร์มการขอใช้สถานที่ (.PDF)
              </a>
            </div>
          </section>

          {/* ── ขวา: ฟอร์ม ── */}
          <section style={{ backgroundColor:"white", padding:"30px", borderRadius:"24px", boxShadow:"0 4px 6px -1px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin:"0 0 20px", color:"#1e293b" }}>2. ข้อมูลการจอง & อัปโหลด</h3>
            <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"20px" }}>

              {/* ✅ การ์ดแต่ละวันที่เลือก */}
              {selectedDates.length === 0 ? (
                <div style={{ padding:"30px", textAlign:"center", backgroundColor:"#f8fafc", borderRadius:"16px", border:"2px dashed #e2e8f0", color:"#94a3b8" }}>
                  ← คลิกเลือกวันในปฏิทินก่อนครับ
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
                  <p style={{ margin:0, fontSize:"0.85rem", fontWeight:600, color:"#475569" }}>
                    📋 กรอกข้อมูลแต่ละวัน ({selectedDates.length} วัน)
                  </p>
                  {dayBookings.map((db, idx) => {
                    const selLoc = locations.find(l => l.id === db.locationId);
                    return (
                      <div key={`booking-${db.date}-${idx}`} style={{ padding:"16px", backgroundColor:"#f8fafc", borderRadius:"16px", border:"1px solid #e2e8f0", position:"relative" }}>
                        {/* หัว */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"12px" }}>
                          <span style={{ fontWeight:"bold", color:"#800000", fontSize:"0.9rem" }}>
                            วันที่ {idx+1}: {thaiDate(db.date)}
                          </span>
                          <button type="button" onClick={() => toggleDay(Number(db.date.split("-")[2]))}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", fontSize:"1rem" }}>✕</button>
                        </div>

                        {/* สถานที่ */}
                        <select value={db.locationId} onChange={e => updateDayBooking(db.date, "locationId", Number(e.target.value))}
                          style={{ width:"100%", padding:"10px", borderRadius:"10px", border:"1px solid #e2e8f0", backgroundColor:"white", marginBottom:"10px", boxSizing:"border-box" as const }}>
                          <option value="">เลือกสถานที่</option>
                          {locations.map(l => <option key={`loc-${db.date}-${l.id}`} value={l.id}>{l.name}{l.capacity?` • ความจุ ${l.capacity} คน`:""}</option>)}
                        </select>

                        {/* เวลา */}
                        <div style={{ display:"flex", gap:"10px", marginBottom:"10px" }}>
                          {([["เริ่ม", db.startTime, "startTime"], ["ถึง", db.endTime, "endTime"]] as const).map(([label, val, field]) => (
                            <div key={`time-${db.date}-${field}`} style={{ flex:1 }}>
                              <label style={{ display:"block", fontSize:"0.78rem", fontWeight:600, marginBottom:"4px", color:"#64748b" }}>{label}</label>
                              <input type="time" value={val}
                                onChange={e => updateDayBooking(db.date, field, e.target.value)}
                                style={{ width:"100%", padding:"8px", borderRadius:"8px", border:"1px solid #e2e8f0", boxSizing:"border-box" as const }} />
                            </div>
                          ))}
                          <div style={{ flex:1 }}>
                            <label style={{ display:"block", fontSize:"0.78rem", fontWeight:600, marginBottom:"4px", color:"#64748b" }}>
                              จำนวนคน {selLoc?.capacity && <span style={{ fontWeight:400 }}>(สูงสุด {selLoc.capacity})</span>}
                            </label>
                            <input type="number" min={1} value={db.attendees}
                              onChange={e => updateDayBooking(db.date, "attendees", e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="ไม่บังคับ"
                              style={{ width:"100%", padding:"8px", borderRadius:"8px", border:"1px solid #e2e8f0", boxSizing:"border-box" as const }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* วัตถุประสงค์ร่วม */}
              <div>
                <label style={{ display:"block", marginBottom:"8px", fontSize:"0.9rem", fontWeight:600 }}>วัตถุประสงค์ (ใช้ร่วมทุกวัน)</label>
                <textarea rows={2} value={purpose} onChange={e => setPurpose(e.target.value)}
                  placeholder="ระบุวัตถุประสงค์..."
                  style={{ width:"100%", padding:"12px", borderRadius:"12px", border:"1px solid #e2e8f0", resize:"none", boxSizing:"border-box" as const }} />
              </div>

              {/* จองในนาม */}
              <div>
                <label style={{ display:"block", marginBottom:"10px", fontSize:"0.9rem", fontWeight:600 }}>จองในนาม</label>
                <div style={{ display:"flex", gap:"20px" }}>
                  {(["student","organization"] as const).map(t => (
                    <label key={`booker-${t}`} style={{ display:"flex", alignItems:"center", gap:"8px", cursor:"pointer", fontSize:"0.9rem" }}>
                      <input type="radio" value={t} checked={bookerType===t} onChange={() => setBookerType(t)} />
                      {t==="student" ? "นักศึกษาทั่วไป" : "ฝ่าย / ชมรม / องค์กร"}
                    </label>
                  ))}
                </div>
                {bookerType==="organization" && (
                  <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="ชื่อฝ่าย / ชมรม / องค์กร"
                    style={{ marginTop:"10px", width:"100%", padding:"10px", borderRadius:"10px", border:"1px solid #e2e8f0", boxSizing:"border-box" as const }} />
                )}
              </div>

              {/* เอกสาร */}
              <div style={{ backgroundColor:"#f8fafc", padding:"16px", borderRadius:"16px", border:"1px solid #e2e8f0", display:"flex", flexDirection:"column", gap:"12px" }}>
                <p style={{ margin:0, fontSize:"0.85rem", color:"#475569", fontWeight:600 }}>📎 แนบเอกสารให้ครบ 2 รายการ (ใช้ร่วมทุกวัน)</p>
                <FileBox label="แบบฟอร์มขอใช้สถานที่ (เซ็นชื่อแล้ว)" required file={bookingForm} accept=".pdf,.jpg,.jpeg,.png" inputId="bookingFormInput" onSelect={setBookingForm} />
                <FileBox label="สำเนาบัตรนักศึกษา" required file={studentCard} accept=".pdf,.jpg,.jpeg,.png" inputId="studentCardInput" onSelect={setStudentCard} />
              </div>

              <button type="submit" disabled={submitting || selectedDates.length === 0}
                style={{ padding:"16px", borderRadius:"14px", border:"none",
                  backgroundColor: submitting || selectedDates.length === 0 ? "#94a3b8" : "#800000",
                  color:"white", fontWeight:"bold", fontSize:"1rem",
                  cursor: submitting || selectedDates.length === 0 ? "not-allowed" : "pointer" }}>
                {submitting ? "กำลังส่ง..." : selectedDates.length > 0 ? `ยืนยันการจอง ${selectedDates.length} วัน` : "ยืนยันการส่งคำขอจอง"}
              </button>
            </form>
          </section>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html:`@keyframes spin { to { transform: rotate(360deg); } }` }} />
    </div>
  );
}