"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Banner = {
  id: number;
  image_url: string;
};

type AnnouncementItem = {
  id: number;
  date: string;
  title: string;
};

type EventItem = {
  id: number;
  day: string;
  month: string;
  title: string;
};

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

function formatThaiDate(dateStr: string) {
  const dt = new Date(dateStr);
  return `${dt.getDate()} ${THAI_MONTHS[dt.getMonth()]}`;
}

function splitThaiDate(dateStr: string) {
  const dt = new Date(dateStr);
  return {
    day: String(dt.getDate()).padStart(2, "0"),
    month: THAI_MONTHS[dt.getMonth()],
  };
}

export default function StudentHome() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("id, image_url")
        .eq("is_active", true)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false });

      if (error) {
        console.error("โหลดแบนเนอร์ไม่สำเร็จ:", error);
        return;
      }

      setBanners((data as Banner[] | null) ?? []);
      setCurrentSlide(0);
    };

    void fetchBanners();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const { data: annData, error: annError } = await supabase
          .from("announcements")
          .select("id, title, created_at")
          .eq("post_type", "announcement")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(8);

        if (annError) throw annError;

        setAnnouncements(
          (annData ?? []).map((item) => ({
            id: item.id,
            date: formatThaiDate(item.created_at),
            title: item.title,
          })),
        );

        const { data: eventData, error: eventError } = await supabase
          .from("announcements")
          .select("id, title, event_date, created_at")
          .eq("post_type", "event")
          .eq("is_active", true)
          .order("event_date", { ascending: true })
          .limit(5);

        if (eventError) throw eventError;

        setEvents(
          (eventData ?? []).map((item) => ({
            id: item.id,
            ...splitThaiDate(item.event_date ?? item.created_at),
            title: item.title,
          })),
        );
      } catch (error) {
        console.error("โหลดข้อมูลหน้าแรกไม่สำเร็จ:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  return (
    <div style={{ width: "100%", backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
      <div style={{ padding: "30px" }}>
        <div
          style={{
            width: "100%",
            height: "320px",
            backgroundColor: "#0f172a",
            borderRadius: "16px",
            overflow: "hidden",
            position: "relative",
            marginBottom: "30px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {banners.length > 0 ? (
            banners.map((banner, index) => (
              <div
                key={banner.id}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: index === currentSlide ? 1 : 0,
                  transition: "opacity 0.45s ease-in-out",
                  pointerEvents: index === currentSlide ? "auto" : "none",
                }}
              >
                <img
                  src={banner.image_url}
                  alt={`banner-${banner.id}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center",
                    display: "block",
                  }}
                />
              </div>
            ))
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                color: "white",
              }}
            >
              ไม่มีรูปแบนเนอร์ หรือกำลังโหลด...
            </div>
          )}

          {banners.length > 1 && (
            <div
              style={{
                position: "absolute",
                bottom: "15px",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                zIndex: 10,
              }}
            >
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  style={{
                    width: currentSlide === index ? "30px" : "10px",
                    height: "10px",
                    borderRadius: "10px",
                    backgroundColor: currentSlide === index ? "#ffffff" : "rgba(255,255,255,0.4)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    padding: 0,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "30px", flexWrap: "wrap" }}>
          <div
            style={{
              flex: "2 1 400px",
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "25px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#1e293b",
                borderBottom: "2px solid #f1f5f9",
                paddingBottom: "15px",
              }}
            >
              📢 ประกาศล่าสุด
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {loading ? (
                <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>กำลังโหลด...</p>
              ) : announcements.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "0.95rem" }}>ยังไม่มีประกาศในขณะนี้</p>
              ) : (
                announcements.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "15px",
                      alignItems: "center",
                      padding: "10px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "8px",
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: "#800000",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "0.85rem",
                        fontWeight: "bold",
                        minWidth: "70px",
                        textAlign: "center",
                      }}
                    >
                      {item.date}
                    </span>
                    <span style={{ color: "#334155", fontSize: "0.95rem" }}>{item.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              flex: "1 1 300px",
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "25px",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                color: "#1e293b",
                borderBottom: "2px solid #f1f5f9",
                paddingBottom: "15px",
              }}
            >
              📅 ปฏิทินกิจกรรม
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {loading ? (
                <p style={{ color: "#94a3b8", fontSize: "0.95rem" }}>กำลังโหลด...</p>
              ) : events.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "0.95rem" }}>ยังไม่มีกิจกรรม</p>
              ) : (
                events.map((item) => (
                  <div key={item.id} style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                    <div style={{ textAlign: "center", minWidth: "50px" }}>
                      <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#800000" }}>
                        {item.day}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{item.month}</div>
                    </div>
                    <div style={{ color: "#334155", fontSize: "0.95rem" }}>{item.title}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
