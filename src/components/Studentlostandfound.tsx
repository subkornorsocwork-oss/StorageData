"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface LostFoundItem {
  id: number;
  user_id: string;
  post_type: string;
  item_name: string;
  location_name: string;
  lost_date: string;
  description: string;
  contact_info: string;
  contact: string;
  image_url: string | null;
  is_resolved: boolean;
  created_at: string;
}

export default function LostAndFoundPage() {
  const [items, setItems] = useState<LostFoundItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [reportType, setReportType] = useState<"lost" | "found">("lost");
  const [itemName, setItemName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");

  // ✅ State สำหรับรูปภาพ
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    status: "loading" | "success" | "error";
    title: string;
    message: string;
  }>({ isOpen: false, status: "loading", title: "", message: "" });

  const fetchItems = async () => {
    try {
      setLoadingItems(true);
      const { data, error } = await supabase
        .from('lost_and_found')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setItems(data);
    } catch (error) {
      console.error('Error fetching:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // ✅ ฟังก์ชันเลือกรูปภาพ + Preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // เช็คขนาดไฟล์ไม่เกิน 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องไม่เกิน 5MB ครับ");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ✅ ฟังก์ชันอัปโหลดรูปไปยัง Supabase Storage
  const uploadImage = async (file: File, userId: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}_${Date.now()}.${fileExt}`;
    const filePath = `lost-and-found/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images') // ✅ ชื่อ bucket ใน Supabase Storage (สร้างก่อนถ้ายังไม่มี)
      .upload(filePath, file, { upsert: false });

    if (uploadError) throw uploadError;

    // ดึง Public URL
    const { data } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemName || !location || !date || !description || !contact) {
      setModalState({ isOpen: true, status: "error", title: "ข้อมูลไม่ครบถ้วน", message: "กรุณากรอกข้อมูลให้ครบทุกช่องครับ" });
      return;
    }

    setModalState({ isOpen: true, status: "loading", title: "กำลังบันทึกข้อมูล...", message: "ระบบกำลังนำประกาศของคุณขึ้นกระดาน" });

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบก่อนครับ");

      // ✅ อัปโหลดรูปก่อน (ถ้ามี)
      let imageUrl: string | null = null;
      if (imageFile) {
        setModalState({ isOpen: true, status: "loading", title: "กำลังอัปโหลดรูปภาพ...", message: "กรุณารอสักครู่ครับ" });
        imageUrl = await uploadImage(imageFile, user.id);
      }

      const { error: insertError } = await supabase
        .from('lost_and_found')
        .insert({
          user_id: user.id,
          post_type: reportType,
          item_name: itemName,
          location_name: location,
          lost_date: date,
          description: description,
          contact_info: contact,
          contact: contact,
          is_resolved: false,
          image_url: imageUrl, // ✅ บันทึก URL รูปภาพ
        });

      if (insertError) throw insertError;

      setModalState({ isOpen: true, status: "success", title: "ประกาศสำเร็จ!", message: "ระบบนำประกาศของคุณขึ้นกระดานเรียบร้อยแล้ว" });

      // ล้างค่าทั้งหมดรวมถึงรูปด้วย
      setItemName(""); setLocation(""); setDate(""); setDescription(""); setContact("");
      handleRemoveImage();
      fetchItems();

    } catch (error) {
      const err = error as Error;
      setModalState({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง" });
    }
  };

  return (
    <div style={{ width: '100%' }}>

      {/* Modal */}
      {modalState.isOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', width: '90%', maxWidth: '400px', textAlign: 'center' }}>
            {modalState.status === "loading" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #800000', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '15px' }}></div>
                <h3>{modalState.title}</h3>
                <p style={{ color: '#64748b' }}>{modalState.message}</p>
              </div>
            )}
            {modalState.status !== "loading" && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{modalState.status === "success" ? "✅" : "❌"}</div>
                <h3 style={{ color: modalState.status === "success" ? '#16a34a' : '#800000' }}>{modalState.title}</h3>
                <p>{modalState.message}</p>
                <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} style={{ padding: '10px 25px', backgroundColor: '#800000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>ตกลง</button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* ฝั่งซ้าย: ฟอร์ม */}
        <div style={{ flex: '1 1 400px', backgroundColor: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h2 style={{ marginTop: 0, color: '#1e293b', marginBottom: '20px' }}>✍️ สร้างประกาศใหม่</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div onClick={() => setReportType("lost")} style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', border: reportType === "lost" ? '2px solid #800000' : '1px solid #e2e8f0', backgroundColor: reportType === "lost" ? '#fef2f2' : 'white', cursor: 'pointer', fontWeight: reportType === "lost" ? 'bold' : 'normal' }}>ของหาย</div>
              <div onClick={() => setReportType("found")} style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '12px', border: reportType === "found" ? '2px solid #10b981' : '1px solid #e2e8f0', backgroundColor: reportType === "found" ? '#ecfdf5' : 'white', cursor: 'pointer', fontWeight: reportType === "found" ? 'bold' : 'normal' }}>เก็บของได้</div>
            </div>

            <input type="text" placeholder="ชื่อสิ่งของ" value={itemName} onChange={(e) => setItemName(e.target.value)} style={inputStyle} required />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="สถานที่" value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} required />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} required />
            </div>
            <textarea rows={3} placeholder="รายละเอียด" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, resize: 'none' }} required />
            <input type="text" placeholder="ข้อมูลติดต่อ (เบอร์โทร / Line ID)" value={contact} onChange={(e) => setContact(e.target.value)} style={inputStyle} required />

            {/* ✅ ช่องอัปโหลดรูปภาพ */}
            <div>
              <label style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '8px', display: 'block' }}>
                📷 รูปภาพสิ่งของ (ไม่บังคับ)
              </label>

              {!imagePreview ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'all 0.2s' }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = '#800000')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
                >
                  <div style={{ fontSize: '2rem' }}>📁</div>
                  <div style={{ fontSize: '0.85rem' }}>คลิกเพื่อเลือกรูปภาพ</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>PNG, JPG ขนาดไม่เกิน 5MB</div>
                </div>
              ) : (
                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px' }} />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={{ position: 'absolute', top: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}
                  >✕</button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>

            <button type="submit" style={{ padding: '15px', backgroundColor: reportType === "lost" ? '#800000' : '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}>
              โพสต์ประกาศ
            </button>
          </form>
        </div>

        {/* ✅ ฝั่งขวา: กระดานประกาศ พร้อมแสดงรูปภาพ */}
        <div style={{ flex: '1.5 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ color: '#1e293b', marginTop: 0 }}>📌 กระดานประกาศ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

            {loadingItems ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '20px' }}>กำลังโหลดประกาศ...</div>
            ) : items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '20px', color: '#64748b' }}>ยังไม่มีประกาศของหายหรือเก็บของได้ในขณะนี้</div>
            ) : (
              items.map((item) => (
                <div key={item.id} style={{ backgroundColor: 'white', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden', borderLeft: `6px solid ${item.post_type === "lost" ? '#800000' : '#10b981'}` }}>

                  {/* ✅ แสดงรูปภาพถ้ามี */}
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.item_name}
                      style={{ width: '100%', height: '180px', objectFit: 'cover' }}
                    />
                  )}

                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: item.post_type === "lost" ? '#ef4444' : '#10b981' }}>
                        {item.post_type === "lost" ? "🔍 ของหาย" : "✅ เก็บของได้"}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {item.is_resolved && (
                          <span style={{ fontSize: '0.75rem', backgroundColor: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '20px' }}>แก้ไขแล้ว</span>
                        )}
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.lost_date}</span>
                      </div>
                    </div>
                    <h3 style={{ margin: '5px 0', fontSize: '1.1rem' }}>{item.item_name}</h3>
                    <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#475569' }}>{item.description}</p>
                    <div style={{ fontSize: '0.85rem' }}>
                      <b>📍 สถานที่:</b> {item.location_name} | <b>📞 ติดต่อ:</b> {item.contact_info || item.contact}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
    </div>
  );
}

const inputStyle = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', boxSizing: 'border-box' as const };