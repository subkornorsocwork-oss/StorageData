"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AnnouncementItem {
  id: number;
  title: string;
  detail: string | null;
  created_at: string;
}

export default function AnnouncementPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, detail, created_at")
        .eq("post_type", "announcement")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error.message);
        setAnnouncements([]);
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setAnnouncements((data as AnnouncementItem[] | null) ?? []);
      setErrorMessage("");
      setLoading(false);
    };

    void fetchAnnouncements();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-6 text-3xl font-bold">ข่าวประกาศประชาสัมพันธ์</h1>

      {loading ? (
        <div className="p-10 text-gray-500">กำลังโหลดข้อมูล...</div>
      ) : errorMessage ? (
        <div className="p-10 text-red-600">เกิดข้อผิดพลาดในการโหลดข้อมูล: {errorMessage}</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {announcements.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-lg border shadow-sm transition hover:shadow-md">
              <div className="p-4">
                <span className="text-sm text-gray-500">
                  {new Date(item.created_at).toLocaleDateString("th-TH")}
                </span>
                <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 line-clamp-3 text-gray-600">{item.detail ?? "-"}</p>
              </div>
            </div>
          ))}

          {announcements.length === 0 && <p>ขณะนี้ยังไม่มีประกาศใหม่</p>}
        </div>
      )}
    </div>
  );
}
