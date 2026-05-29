"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/context/RoleContext";

interface Announcement {
  id: number;
  post_type: "announcement" | "event";
  title: string;
  detail: string | null;
  event_date: string | null;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
}

interface Banner {
  id: number;
  image_url: string;
  is_active: boolean;
  updated_by?: string | null;
  updated_at?: string | null;
}

type ModalState = {
  isOpen: boolean;
  status: "loading" | "success" | "error";
  title: string;
  message: string;
};

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

const fmtDate = (value: string) => {
  const dt = new Date(value);
  return `${dt.getDate()} ${THAI_MONTHS_SHORT[dt.getMonth()]} ${dt.getFullYear() + 543}`;
};

export default function AdminAnnouncements() {
  const { profile } = useRole();

  const [activeTab, setActiveTab] = useState<"announcements" | "events" | "banner">("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newPinned, setNewPinned] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [modal, setModal] = useState<ModalState>({ isOpen: false, status: "loading", title: "", message: "" });

  const resetForm = () => {
    setEditingId(null);
    setNewTitle("");
    setNewDetail("");
    setNewDate("");
    setNewPinned(false);
  };

  const loadAnnouncements = useCallback(async (type: "announcement" | "event") => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("post_type", type)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadAnnouncements error:", error);
      setAnnouncements([]);
      setModal({
        isOpen: true,
        status: "error",
        title: "โหลดรายการประกาศไม่สำเร็จ",
        message: error.message,
      });
      setLoading(false);
      return;
    }

    setAnnouncements((data as Announcement[] | null) ?? []);
    setLoading(false);
  }, []);

  const loadBanners = useCallback(async () => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("loadBanners error:", error);
      setBanners([]);
      setModal({
        isOpen: true,
        status: "error",
        title: "โหลดแบนเนอร์ไม่สำเร็จ",
        message: error.message,
      });
      return;
    }

    setBanners((data as Banner[] | null) ?? []);
  }, []);

  useEffect(() => {
    if (activeTab === "announcements") {
      void loadAnnouncements("announcement");
    } else if (activeTab === "events") {
      void loadAnnouncements("event");
    } else {
      void loadBanners();
    }
  }, [activeTab, loadAnnouncements, loadBanners]);

  const handleSave = async () => {
    if (!newTitle.trim()) {
      setModal({ isOpen: true, status: "error", title: "ข้อมูลไม่ครบ", message: "กรุณากรอกหัวข้อ" });
      return;
    }

    setModal({ isOpen: true, status: "loading", title: "กำลังบันทึก...", message: "" });

    const payload = {
      post_type: activeTab === "announcements" ? "announcement" : "event",
      title: newTitle.trim(),
      detail: newDetail.trim() || null,
      event_date: newDate || null,
      is_pinned: newPinned,
      is_active: true,
      created_by: profile?.id ?? null,
    };

    const { error } = editingId
      ? await supabase.from("announcements").update(payload).eq("id", editingId)
      : await supabase.from("announcements").insert(payload);

    if (error) {
      setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
      return;
    }

    setModal({
      isOpen: true,
      status: "success",
      title: editingId ? "แก้ไขสำเร็จ ✅" : "เพิ่มสำเร็จ ✅",
      message: "",
    });
    resetForm();
    if (activeTab === "announcements") {
      await loadAnnouncements("announcement");
    } else {
      await loadAnnouncements("event");
    }
  };

  const handleEdit = (item: Announcement) => {
    setEditingId(item.id);
    setNewTitle(item.title);
    setNewDetail(item.detail ?? "");
    setNewDate(item.event_date ?? "");
    setNewPinned(item.is_pinned);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("ยืนยันการลบ?")) return;

    setModal({ isOpen: true, status: "loading", title: "กำลังลบ...", message: "" });
    const { error } = await supabase.from("announcements").delete().eq("id", id);

    if (error) {
      setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message: error.message });
      return;
    }

    setModal({ isOpen: true, status: "success", title: "ลบสำเร็จ", message: "" });
    if (activeTab === "announcements") {
      await loadAnnouncements("announcement");
    } else {
      await loadAnnouncements("event");
    }
  };

  const handleToggleActive = async (item: Announcement) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      setModal({ isOpen: true, status: "error", title: "อัปเดตสถานะไม่สำเร็จ", message: error.message });
      return;
    }

    if (activeTab === "announcements") {
      await loadAnnouncements("announcement");
    } else {
      await loadAnnouncements("event");
    }
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setModal({ isOpen: true, status: "error", title: "ไฟล์ใหญ่เกินไป", message: "ขนาดไฟล์ต้องไม่เกิน 5MB" });
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleBannerUpload = async () => {
    if (!bannerFile || !profile) return;

    setUploadingBanner(true);
    setModal({ isOpen: true, status: "loading", title: "กำลังอัปโหลดแบนเนอร์...", message: "" });

    try {
      const ext = bannerFile.name.split(".").pop();
      const path = `banner_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("banners")
        .upload(path, bannerFile, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
      const newUrl = urlData.publicUrl;

      const { error: insertErr } = await supabase.from("banners").insert({
        image_url: newUrl,
        is_active: true,
        updated_by: profile.id,
        updated_at: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;

      setBannerFile(null);
      setBannerPreview(null);
      await loadBanners();
      setModal({ isOpen: true, status: "success", title: "เพิ่มแบนเนอร์สำเร็จ ✅", message: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
      setModal({ isOpen: true, status: "error", title: "เกิดข้อผิดพลาด", message });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleToggleBanner = async (item: Banner) => {
    const { error } = await supabase
      .from("banners")
      .update({
        is_active: !item.is_active,
        updated_by: profile?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setModal({ isOpen: true, status: "error", title: "อัปเดตสถานะแบนเนอร์ไม่สำเร็จ", message: error.message });
      return;
    }

    await loadBanners();
  };

  const handleDeleteBanner = async (item: Banner) => {
    if (!confirm("ยืนยันลบแบนเนอร์นี้?")) return;

    const { error } = await supabase.from("banners").delete().eq("id", item.id);

    if (error) {
      setModal({ isOpen: true, status: "error", title: "ลบแบนเนอร์ไม่สำเร็จ", message: error.message });
      return;
    }

    await loadBanners();
  };

  const isEvent = activeTab === "events";
  const tabType = isEvent ? "กิจกรรม" : "ประกาศ";

  return (
    <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ color: "#800000", marginBottom: "24px" }}>📣 ระบบจัดการประกาศ และกิจกรรม</h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "30px", borderBottom: "2px solid #e2e8f0" }}>
        {([
          { key: "announcements", label: "📝 ประกาศ" },
          { key: "events", label: "📅 กิจกรรม" },
          { key: "banner", label: "🖼️ แบนเนอร์" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              resetForm();
            }}
            style={{
              padding: "10px 20px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "0.9rem",
              backgroundColor: "transparent",
              color: activeTab === tab.key ? "#800000" : "#64748b",
              borderBottom: activeTab === tab.key ? "3px solid #800000" : "3px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {(activeTab === "announcements" || activeTab === "events") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "30px", alignItems: "start" }}>
          <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>
              {editingId ? `✏️ แก้ไข${tabType}` : `➕ เพิ่ม${tabType}ใหม่`}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "5px" }}>
                  หัวข้อ <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={`หัวข้อ${tabType}...`}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "5px" }}>รายละเอียด</label>
                <textarea
                  rows={3}
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  placeholder="รายละเอียด..."
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", resize: "none", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "5px" }}>
                  {isEvent ? "วันที่จัดกิจกรรม" : "วันที่ประกาศ"}
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", boxSizing: "border-box" }}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.9rem" }}>
                <input type="checkbox" checked={newPinned} onChange={(e) => setNewPinned(e.target.checked)} />
                📌 ปักหมุด
              </label>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleSave}
                  style={{ flex: 1, padding: "10px", backgroundColor: "#800000", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {editingId ? "บันทึกการแก้ไข" : `+ เพิ่ม${tabType}`}
                </button>
                {editingId && (
                  <button
                    onClick={resetForm}
                    style={{ padding: "10px 16px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "25px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>
              รายการ{tabType}ทั้งหมด
              <span style={{ marginLeft: "8px", fontSize: "0.8rem", color: "#64748b", fontWeight: "normal" }}>
                ({announcements.length} รายการ)
              </span>
            </h3>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>กำลังโหลด...</div>
            ) : announcements.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>ยังไม่มี{tabType}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "500px", overflowY: "auto" }}>
                {announcements.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "14px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: item.is_active ? "white" : "#f8fafc",
                      borderLeft: `4px solid ${item.is_pinned ? "#f59e0b" : item.is_active ? "#800000" : "#cbd5e1"}`,
                      opacity: item.is_active ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          {item.is_pinned && <span style={{ fontSize: "0.75rem" }}>📌</span>}
                          <span style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.9rem" }}>{item.title}</span>
                        </div>
                        {item.detail && <p style={{ margin: "0 0 4px", fontSize: "0.8rem", color: "#64748b" }}>{item.detail}</p>}
                        {item.event_date && (
                          <span style={{ fontSize: "0.75rem", color: "#800000", fontWeight: 600 }}>
                            📅 {fmtDate(item.event_date)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                        <button
                          onClick={() => handleToggleActive(item)}
                          style={{
                            padding: "4px 8px",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: item.is_active ? "#dcfce7" : "#f1f5f9",
                            color: item.is_active ? "#15803d" : "#64748b",
                          }}
                        >
                          {item.is_active ? "เผยแพร่" : "ซ่อน"}
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          style={{ padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "white", cursor: "pointer", fontSize: "0.75rem" }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ padding: "4px 8px", border: "none", borderRadius: "6px", background: "#fee2e2", cursor: "pointer", fontSize: "0.75rem" }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "banner" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1.2fr", gap: "24px", alignItems: "start" }}>
          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>🖼️ เพิ่มแบนเนอร์ใหม่</h3>
            <p style={{ marginTop: "-4px", color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
              หน้าแรกจะสลับแบนเนอร์อัตโนมัติทุก 5 วินาที และจะแสดงเฉพาะรายการที่เปิดการแสดงผลอยู่ แนะนำขนาด 1600x600 px หรือ 1920x720 px
            </p>

            {bannerPreview ? (
              <div style={{ position: "relative", marginBottom: "16px", borderRadius: "12px", overflow: "hidden", backgroundColor: "#0f172a" }}>
                <img src={bannerPreview} alt="preview" style={{ width: "100%", height: "220px", objectFit: "contain", display: "block" }} />
                <button
                  onClick={() => {
                    setBannerFile(null);
                    setBannerPreview(null);
                  }}
                  style={{ position: "absolute", top: "8px", right: "8px", background: "rgba(15,23,42,0.7)", color: "white", border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer" }}
                >
                  x
                </button>
              </div>
            ) : (
              <div style={{ width: "100%", height: "220px", backgroundColor: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", marginBottom: "16px" }}>
                ยังไม่ได้เลือกรูปแบนเนอร์
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <label style={{ flex: 1, padding: "10px", border: "2px dashed #cbd5e1", borderRadius: "10px", textAlign: "center", cursor: "pointer", color: "#64748b", fontSize: "0.9rem" }}>
                📁 คลิกเลือกรูปภาพ (PNG, JPG ≤5MB)
                <input type="file" accept="image/*" onChange={handleBannerSelect} style={{ display: "none" }} />
              </label>
              <button
                onClick={handleBannerUpload}
                disabled={!bannerFile || uploadingBanner}
                style={{ padding: "10px 20px", backgroundColor: bannerFile ? "#800000" : "#94a3b8", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", cursor: bannerFile ? "pointer" : "not-allowed" }}
              >
                {uploadingBanner ? "กำลังอัปโหลด..." : "เพิ่มแบนเนอร์"}
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>
              รายการแบนเนอร์
              <span style={{ marginLeft: "8px", fontSize: "0.8rem", color: "#64748b", fontWeight: "normal" }}>
                ({banners.length} รายการ)
              </span>
            </h3>

            {banners.length === 0 ? (
              <div style={{ width: "100%", height: "220px", backgroundColor: "#f8fafc", border: "2px dashed #cbd5e1", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                ยังไม่มีแบนเนอร์
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxHeight: "620px", overflowY: "auto" }}>
                {banners.map((item, index) => (
                  <div key={item.id} style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px", backgroundColor: item.is_active ? "white" : "#f8fafc" }}>
                    <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", backgroundColor: "#0f172a", marginBottom: "12px" }}>
                      <img src={item.image_url} alt={`banner-${item.id}`} style={{ width: "100%", height: "180px", objectFit: "contain", display: "block" }} />
                      <div style={{ position: "absolute", top: "10px", left: "10px", padding: "4px 10px", borderRadius: "999px", backgroundColor: item.is_active ? "#dcfce7" : "#e2e8f0", color: item.is_active ? "#15803d" : "#64748b", fontSize: "0.75rem", fontWeight: 700 }}>
                        {item.is_active ? `แสดงผล #${index + 1}` : "ปิดไว้"}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        ID {item.id}
                        {item.updated_at ? ` • อัปเดต ${fmtDate(item.updated_at)}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={() => handleToggleBanner(item)}
                          style={{ padding: "8px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, backgroundColor: item.is_active ? "#fee2e2" : "#dcfce7", color: item.is_active ? "#b91c1c" : "#15803d" }}
                        >
                          {item.is_active ? "ปิดการแสดงผล" : "เปิดการแสดงผล"}
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(item)}
                          style={{ padding: "8px 12px", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700, backgroundColor: "#f1f5f9", color: "#475569" }}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
