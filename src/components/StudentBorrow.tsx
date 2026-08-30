"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { compareBarcodes } from "@/lib/sortBarcodes";

// 🎯 1. สร้าง Interface กำหนดรูปแบบข้อมูลให้ชัดเจน (แก้ปัญหา Type Any แจ้งเตือน)
interface EquipmentItem {
  id: number;
  name: string;
  emoji: string;
  barcode: string;
  total_qty: number;
  available_qty: number;
  quantity: number; 
}

const fallbackClubs = [
  "ฝ่ายวิชาการ",
  "ฝ่ายสวัสดิการและสิทธิประโยชน์",
  "ฝ่ายศิลปวัฒนธรรม",
  "ฝ่ายกีฬาและนันทนาการ",
  "ชุมนุมค่ายอาสาพัฒนาสังคมสงเคราะห์",
  "อื่นๆ (โปรดระบุ)" 
];

export default function StudentBorrow() {
  // 🎯 2. ใช้ Interface แทน any[] 
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับฟอร์มและบาร์โค้ด
  const [bookerType, setBookerType] = useState<"internal_person" | "internal_organization" | "external">("internal_person");
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [organizations, setOrganizations] = useState<string[]>(fallbackClubs.filter((club) => club !== "อื่นๆ (โปรดระบุ)"));
  const [customClub, setCustomClub] = useState<string>("");
  const [externalOrganization, setExternalOrganization] = useState("");
  const [regulationUrl, setRegulationUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [borrowDate, setBorrowDate] = useState("");
  const [borrowTime, setBorrowTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [purpose, setPurpose] = useState("");
  
  // State สำหรับไฟล์แนบ
  const [projectFile, setProjectFile] = useState<File | null>(null);

  // State สำหรับ Modal
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: "loading" | "success" | "error";
    title: string;
    message: string;
  }>({
    isOpen: false,
    status: "loading",
    title: "",
    message: ""
  });

  const fetchEquipments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('equipment').select('*');

      if (error) throw error;

      const { data: organizationRows } = await supabase
        .from("borrow_organizations")
        .select("name")
        .eq("is_active", true)
        .order("name");
      if (organizationRows && organizationRows.length > 0) {
        setOrganizations(organizationRows.map((row) => row.name));
      }
      const { data: settings } = await supabase.from("borrow_settings").select("regulation_url").eq("id", 1).maybeSingle();
      setRegulationUrl(settings?.regulation_url ?? "/borrow-regulations.pdf");

      if (data) {
        const formattedData: EquipmentItem[] = data.map(item => ({
          ...item,
          quantity: 0 
        })).sort((a, b) => {
          const barcodeOrder = compareBarcodes(a.barcode, b.barcode);
          return barcodeOrder || a.id - b.id;
        });
        setEquipment(formattedData);
      }
    } catch (error) {
      // 🎯 3. จัดการ Error Type ให้ถูกต้อง
      const err = error as Error;
      console.error('Error fetching equipments:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipments();
  }, []);

  const handleQuantityChange = (id: number, change: number) => {
    setEquipment(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
        if (newQuantity >= 0 && newQuantity <= item.available_qty) {
          return { ...item, quantity: newQuantity };
        }
      }
      return item;
    }));
  };

  const selectedItems = equipment.filter(item => item.quantity > 0);

  const  handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      setModalState({ isOpen: true, status: "error", title: "ไม่ได้เลือกอุปกรณ์", message: "กรุณาเลือกอุปกรณ์ที่ต้องการยืมอย่างน้อย 1 รายการครับ" });
      return;
    }

    if (bookerType === "internal_organization") {
      if (!selectedClub) {
        setModalState({ isOpen: true, status: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณาเลือกฝ่าย/ชุมนุมด้วยครับ" });
        return;
      }
      if (selectedClub === "อื่นๆ (โปรดระบุ)" && !customClub.trim()) {
        setModalState({ isOpen: true, status: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณาระบุชื่อองค์กรหรือชุมนุมด้วยครับ" });
        return;
      }
    }
    if (bookerType === "external" && !externalOrganization.trim()) {
      setModalState({ isOpen: true, status: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณาระบุองค์กรหรือคณะที่สังกัดครับ" });
      return;
    }

    if (!borrowDate || !borrowTime || !returnDate || !returnTime || !phone || !purpose) {
      setModalState({ isOpen: true, status: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณากรอกข้อมูลให้ครบทุกช่องครับ" });
      return;
    }

    setModalState({ isOpen: true, status: "loading", title: "กำลังส่งคำขอ...", message: "ระบบกำลังบันทึกข้อมูลการยืมของคุณ" });

    try {
      // 🎯 1. เช็คและดึงข้อมูล User ที่กำลัง Login อยู่
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      }

      let projectFileUrl: string | null = null;

      if (projectFile) {
        const fileExt = projectFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/borrow-project-${fileName}`;

        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, projectFile);
        if (uploadError) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ: " + uploadError.message);

        const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(filePath);
        projectFileUrl = publicUrlData.publicUrl;
      }

      const finalClubName = bookerType === 'internal_organization'
        ? (selectedClub === "อื่นๆ (โปรดระบุ)" ? customClub : selectedClub) 
        : bookerType === "external" ? externalOrganization.trim() : null;

      const userRestrictionQuery = supabase.from("borrow_restrictions").select("reason, ends_at").eq("is_active", true).eq("user_id", user.id);
      const serviceRestrictionQuery = supabase.from("user_service_restrictions").select("reason, ends_at").eq("service_type", "borrowing").eq("is_active", true).eq("user_id", user.id);
      const organizationRestrictionQuery = finalClubName
        ? supabase.from("borrow_restrictions").select("reason, ends_at").eq("is_active", true).eq("org_name", finalClubName)
        : Promise.resolve({ data: [], error: null });
      const [userRestrictionResult, organizationRestrictionResult, serviceRestrictionResult] = await Promise.all([userRestrictionQuery, organizationRestrictionQuery, serviceRestrictionQuery]);
      if (!userRestrictionResult.error && !organizationRestrictionResult.error && !serviceRestrictionResult.error) {
        const activeRestrictions = [...(userRestrictionResult.data ?? []), ...(organizationRestrictionResult.data ?? []), ...(serviceRestrictionResult.data ?? [])];
        const validRestriction = activeRestrictions.find((restriction) => !restriction.ends_at || new Date(restriction.ends_at) >= new Date());
        if (validRestriction) throw new Error(`ไม่สามารถยืมได้: ${validRestriction.reason}`);
      }

      const borrowTimestamp = new Date(`${borrowDate}T${borrowTime}`).toISOString();
      const returnTimestamp = new Date(`${returnDate}T${returnTime}`).toISOString();

      // 🎯 2. ส่ง user_id เข้าไปบันทึกด้วย
      const { data: request, error: insertError } = await supabase
        .from('borrow_requests')
        .insert({
          user_id: user.id,                  // 👈 เพิ่มบรรทัดนี้!
          borrower_type: bookerType,         
          org_name: finalClubName,           
          phone: phone,
          borrow_date: borrowTimestamp,      
          return_due_date: returnTimestamp,  
          purpose: purpose,
          document_url: projectFileUrl,
          status: 'pending'
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      const { error: itemsError } = await supabase.from('borrow_items').insert(
        selectedItems.map((item) => ({
          borrow_request_id: request?.id,
          equipment_id: item.id,
          quantity: item.quantity,
        })),
      );
      if (itemsError) throw itemsError;

      // ... โค้ด setModalState success และ clear form ด่านล่างเหมือนเดิม ...

      setModalState({ 
        isOpen: true, 
        status: "success", 
        title: "ส่งคำขอสำเร็จ!", 
        message: `ส่งคำขอยืมอุปกรณ์เรียบร้อยแล้ว กรุณารอแอดมินอนุมัติผ่านระบบ` 
      });
      
      setPhone(""); setBorrowDate(""); setBorrowTime(""); setReturnDate(""); setReturnTime(""); setPurpose(""); setSelectedClub(""); setCustomClub(""); setProjectFile(null);
      fetchEquipments();

    } catch (error) {
      const err = error as Error;
      console.error(err);
      setModalState({ 
        isOpen: true, 
        status: "error", 
        title: "เกิดข้อผิดพลาด", 
        message: err.message || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
      });
    }
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', position: 'relative' }}>
      
      {/* Modal Overlay */}
      {modalState.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            
            {modalState.status === "loading" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '50px', height: '50px', border: '5px solid #f3f3f3', borderTop: '5px solid #800000', borderRadius: '50%', marginBottom: '20px' }}></div>
                <h2 style={{ margin: 0, color: '#1e293b' }}>{modalState.title}</h2>
                <p style={{ color: '#64748b', marginTop: '10px' }}>{modalState.message}</p>
              </div>
            )}

            {modalState.status === "success" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', color: '#16a34a', fontSize: '30px' }}>✓</div>
                <h2 style={{ margin: 0, color: '#16a34a' }}>{modalState.title}</h2>
                <p style={{ color: '#64748b', marginTop: '10px', lineHeight: '1.5' }}>{modalState.message}</p>
                <button onClick={closeModal} style={{ marginTop: '20px', padding: '10px 25px', backgroundColor: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>ตกลง</button>
              </div>
            )}

            {modalState.status === "error" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '60px', height: '60px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px', color: '#dc2626', fontSize: '30px', fontWeight: 'bold' }}>✕</div>
                <h2 style={{ margin: 0, color: '#dc2626' }}>{modalState.title}</h2>
                <p style={{ color: '#64748b', marginTop: '10px', lineHeight: '1.5' }}>{modalState.message}</p>
                <button onClick={closeModal} style={{ marginTop: '20px', padding: '10px 25px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>ลองอีกครั้ง</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'auto' }}>
        
        <div style={{ padding: '30px', display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* ฝั่งซ้าย: เลือกอุปกรณ์ */}
          <div style={{ flex: '1.5 1 500px', display: 'flex', flexDirection: 'column' }}>
            
            <h2 style={{ color: '#1e293b', marginTop: 0, marginBottom: '20px' }}>1. เลือกอุปกรณ์ที่ต้องการยืม</h2>
            
            {loading ? (
               <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                 กำลังโหลดข้อมูลอุปกรณ์จากฐานข้อมูล...
               </div>
            ) : equipment.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', backgroundColor: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                 ยังไม่มีข้อมูลอุปกรณ์ในระบบ
               </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {equipment.map((item) => (
                  <div key={item.id} style={{ backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', border: item.quantity > 0 ? '2px solid #800000' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', transition: '0.2s' }}>
                    <div style={{ fontSize: '1.7rem', width: '42px', textAlign: 'center', flexShrink: 0 }}>{item.emoji || '📦'}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'bold', color: '#1e293b', overflowWrap: 'anywhere' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>บาร์โค้ด: {item.barcode}</div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: item.available_qty > 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>
                      {item.available_qty > 0 ? `คงเหลือ: ${item.available_qty} ชิ้น` : 'ของหมด'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '8px', flexShrink: 0 }}>
                      <button 
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={item.quantity === 0}
                        style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', backgroundColor: item.quantity > 0 ? 'white' : 'transparent', color: item.quantity > 0 ? '#1e293b' : '#cbd5e1', cursor: item.quantity > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', boxShadow: item.quantity > 0 ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                      >-</button>
                      <span style={{ fontWeight: 'bold', width: '20px', color: '#1e293b' }}>{item.quantity}</span>
                      
                      <button 
                        onClick={() => handleQuantityChange(item.id, 1)}
                        disabled={item.quantity === item.available_qty}
                        style={{ width: '30px', height: '30px', borderRadius: '6px', border: 'none', backgroundColor: item.quantity < item.available_qty ? '#800000' : 'transparent', color: item.quantity < item.available_qty ? 'white' : '#cbd5e1', cursor: item.quantity < item.available_qty ? 'pointer' : 'not-allowed', fontWeight: 'bold', boxShadow: item.quantity < item.available_qty ? '0 2px 4px rgba(0,0,0,0.1)' : 'none' }}
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ฝั่งขวา: สรุปและฟอร์มยืม */}
          <div style={{ flex: '1 1 400px', backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
            <h2 style={{ marginTop: 0, color: '#1e293b', marginBottom: '20px' }}>2. สรุปรายการและรายละเอียด</h2>
            {regulationUrl && <a href={regulationUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginBottom: '18px', padding: '12px', borderRadius: '8px', background: '#fff7ed', color: '#9a3412', fontWeight: 700, textDecoration: 'none' }}>📄 อ่านประกาศ/ระเบียบการยืมพัสดุ (PDF)</a>}
            
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#1e293b' }}>🛒 อุปกรณ์ที่เลือก</h3>
              {selectedItems.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.9rem' }}>
                  {selectedItems.map(item => (
                    <li key={item.id} style={{ marginBottom: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.emoji || '📦'} {item.name}</span>
                        <span style={{ fontWeight: 'bold', color: '#800000' }}>x {item.quantity}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>ยังไม่ได้เลือกอุปกรณ์ครับ</div>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b', marginBottom: '10px', fontWeight: 'bold' }}>ยืมในนาม</label>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input 
                      type="radio" 
                      name="bookerType" 
                      checked={bookerType === "internal_person"}
                      onChange={() => setBookerType("internal_person")}
                      style={{ marginRight: '8px', accentColor: '#800000' }}
                    />
                    ภายในคณะ: ยืมในนามบุคคล
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input 
                      type="radio" 
                      name="bookerType" 
                      checked={bookerType === "internal_organization"}
                      onChange={() => setBookerType("internal_organization")}
                      style={{ marginRight: '8px', accentColor: '#800000' }}
                    />
                    ภายในคณะ: ชมรม/กลุ่มกิจกรรม
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input type="radio" name="bookerType" checked={bookerType === "external"} onChange={() => setBookerType("external")} style={{ marginRight: '8px', accentColor: '#800000' }} />
                    ภายนอกคณะ
                  </label>
                </div>

                {bookerType === "internal_organization" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select 
                      value={selectedClub}
                      onChange={(e) => setSelectedClub(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', backgroundColor: 'white', fontSize: '0.9rem', color: '#1e293b' }}
                    >
                      <option value="" disabled>-- กรุณาเลือกองค์กรที่สังกัด --</option>
                      {[...organizations, "อื่นๆ (โปรดระบุ)"].map((club, idx) => (
                        <option key={idx} value={club}>{club}</option>
                      ))}
                    </select>

                    {selectedClub === "อื่นๆ (โปรดระบุ)" && (
                      <input 
                        type="text" 
                        value={customClub}
                        onChange={(e) => setCustomClub(e.target.value)}
                        placeholder="พิมพ์ชื่อชุมนุมหรือองค์กรของคุณ..." 
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }} 
                        required
                      />
                    )}
                  </div>
                )}
                {bookerType === "external" && <input type="text" value={externalOrganization} onChange={(e) => setExternalOrganization(e.target.value)} placeholder="ระบุองค์กร/คณะ/หน่วยงานที่สังกัด" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px', fontWeight: 'bold' }}>เบอร์โทรศัพท์ติดต่อ</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  maxLength={10}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontSize: '0.9rem' }} 
                  required 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px', fontWeight: 'bold' }}>วันและเวลาที่ <span style={{color:'#800000'}}>ยืม</span></label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="date" value={borrowDate} onChange={(e) => setBorrowDate(e.target.value)} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} required />
                  <input type="time" value={borrowTime} onChange={(e) => setBorrowTime(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px', fontWeight: 'bold' }}>วันและเวลาที่ <span style={{color:'#800000'}}>คืน</span></label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} style={{ flex: 2, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} required />
                  <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px', fontWeight: 'bold' }}>วัตถุประสงค์ในการยืม</label>
                <textarea 
                  rows={3} 
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="ระบุกิจกรรมที่นำอุปกรณ์ไปใช้งาน..." 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'none' }} 
                  required
                ></textarea>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#1e293b', marginBottom: '8px', fontWeight: 'bold' }}>
                  แนบเอกสารโครงการ / ขออนุมัติ (ถ้ามี)
                </label>
                <div style={{ border: '2px dashed #cbd5e1', padding: '15px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setProjectFile(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem', color: '#475569' }}
                  />
                  {projectFile && (
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>
                      ✓ เลือกไฟล์แล้ว: {projectFile.name}
                    </span>
                  )}
                </div>
              </div>
              
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#800000', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 10px rgba(128,0,0,0.2)' }}>
                ยืนยันการยืมอุปกรณ์
              </button>
            </form>

          </div>
        </div>
      </main>
    </div>
  );
}
