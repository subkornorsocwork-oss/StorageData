"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type ComplaintCategory = "facility" | "welfare" | "academic" | "other";
type ComplaintSeverity = "urgent" | "normal" | "low";

type ModalState = {
  isOpen: boolean;
  status: "loading" | "success" | "error";
  title: string;
  message: string;
};

const CATEGORY_OPTIONS: { value: ComplaintCategory; label: string }[] = [
  { value: "academic", label: "ด้านการเรียนการสอน" },
  { value: "facility", label: "ด้านอาคารสถานที่ / สิ่งอำนวยความสะดวก" },
  { value: "welfare", label: "ด้านสวัสดิการ" },
  { value: "other", label: "อื่น ๆ" },
];

const SEVERITY_OPTIONS: { value: ComplaintSeverity; label: string }[] = [
  { value: "urgent", label: "เร่งด่วน" },
  { value: "normal", label: "ปกติ" },
  { value: "low", label: "ไม่เร่งด่วน" },
];

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 15000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง")), timeoutMs);
    }),
  ]);
}

export default function ComplaintPage() {
  const [category, setCategory] = useState<ComplaintCategory | "">("");
  const [severity, setSeverity] = useState<ComplaintSeverity>("normal");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, status: "loading", title: "", message: "" });

  const resetForm = () => {
    setCategory("");
    setSeverity("normal");
    setTopic("");
    setDescription("");
    setIsAnonymous(false);
    setContact("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !topic.trim() || !description.trim() || (!isAnonymous && !contact.trim())) {
      setModal({
        isOpen: true,
        status: "error",
        title: "ข้อมูลไม่ครบถ้วน",
        message: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ",
      });
      return;
    }

    setIsSubmitting(true);
    setModal({ isOpen: true, status: "loading", title: "กำลังส่งเรื่องร้องเรียน...", message: "" });

    try {
      const {
        data: { session },
      } = await withTimeout(supabase.auth.getSession(), 8000);

      const { error } = await withTimeout(
        supabase.from("complaints").insert({
          category,
          title: topic.trim(),
          detail: description.trim(),
          is_anonymous: isAnonymous,
          contact_info: isAnonymous ? null : contact.trim(),
          severity,
          status: "received",
          user_id: isAnonymous ? null : session?.user?.id ?? null,
        }),
        12000,
      );

      if (error) throw error;

      resetForm();
      setModal({
        isOpen: true,
        status: "success",
        title: "ส่งเรื่องสำเร็จ ✅",
        message: "ระบบได้รับเรื่องร้องเรียนของคุณเรียบร้อยแล้ว",
      });
    } catch (error) {
      const err = error as Error;
      setModal({
        isOpen: true,
        status: "error",
        title: "ส่งเรื่องไม่สำเร็จ",
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        overflowY: "auto",
        backgroundColor: "#f1f5f9",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <main style={{ padding: "40px 20px", flex: 1 }}>
        <div style={{ maxWidth: "820px", margin: "0 auto", paddingBottom: "40px" }}>
          <div
            style={{
              backgroundColor: "white",
              padding: "40px",
              borderRadius: "24px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              border: "1px solid #e2e8f0",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#1e293b", marginBottom: "30px", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "1.5rem" }}>📝</span> รายละเอียดการร้องเรียน
            </h2>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "10px", fontWeight: 600, color: "#334155" }}>
                  หมวดหมู่เรื่องร้องเรียน <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", backgroundColor: "#fff" }}
                  required
                >
                  <option value="">-- กรุณาเลือกหมวดหมู่ --</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "10px", fontWeight: 600, color: "#334155" }}>ระดับความสำคัญ</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as ComplaintSeverity)}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", backgroundColor: "#fff" }}
                >
                  {SEVERITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "10px", fontWeight: 600, color: "#334155" }}>
                  หัวข้อเรื่อง <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="เช่น เครื่องปรับอากาศในห้อง SC101 ไม่เย็น"
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "10px", fontWeight: 600, color: "#334155" }}>
                  รายละเอียดเพิ่มเติม <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="กรุณาระบุรายละเอียดให้ชัดเจน..."
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div style={{ backgroundColor: "#fff1f2", padding: "20px", borderRadius: "16px", borderLeft: "5px solid #800000" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ width: "20px", height: "20px", accentColor: "#800000" }}
                  />
                  <span style={{ fontWeight: 700, color: "#800000" }}>ไม่ประสงค์ออกนาม</span>
                </label>
                <p style={{ margin: "8px 0 0 32px", fontSize: "0.85rem", color: "#64748b" }}>
                  หากเลือกแบบไม่ระบุตัวตน ระบบจะไม่ผูกข้อมูลผู้ใช้ของคุณกับเรื่องร้องเรียนนี้
                </p>
              </div>

              {!isAnonymous && (
                <div style={{ animation: "slideDown 0.3s ease-out" }}>
                  <label style={{ display: "block", marginBottom: "10px", fontWeight: 600, color: "#334155" }}>
                    ข้อมูลติดต่อกลับ <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="เบอร์โทรศัพท์ หรือ อีเมล"
                    style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                    required={!isAnonymous}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: isSubmitting ? "#cbd5e1" : "#800000",
                  color: "white",
                  padding: "18px",
                  borderRadius: "14px",
                  border: "none",
                  fontWeight: "bold",
                  fontSize: "1.05rem",
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  marginTop: "10px",
                }}
              >
                {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งเรื่องร้องเรียน"}
              </button>
            </form>
          </div>
        </div>
      </main>

      {modal.isOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ backgroundColor: "white", padding: "40px", borderRadius: "24px", textAlign: "center", maxWidth: "400px", width: "90%" }}>
            {modal.status === "loading" && <div style={{ width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #800000", borderRadius: "50%", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />}
            {modal.status === "success" && <div style={{ fontSize: "4rem", marginBottom: "10px" }}>✅</div>}
            {modal.status === "error" && <div style={{ fontSize: "4rem", marginBottom: "10px" }}>❌</div>}
            <h3 style={{ color: "#1e293b" }}>{modal.title}</h3>
            <p style={{ color: "#64748b", marginBottom: modal.status === "loading" ? 0 : "20px" }}>{modal.message}</p>
            {modal.status !== "loading" && (
              <button
                onClick={() => setModal((prev) => ({ ...prev, isOpen: false }))}
                style={{ backgroundColor: "#800000", color: "white", padding: "12px 40px", borderRadius: "12px", border: "none", fontWeight: "bold", cursor: "pointer" }}
              >
                ตกลง
              </button>
            )}
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin { to { transform: rotate(360deg); } }
          `,
        }}
      />
    </div>
  );
}
