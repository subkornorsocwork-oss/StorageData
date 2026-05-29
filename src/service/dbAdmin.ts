// src/services/dbAdmin.ts
// ระบบประกาศ + ปฏิทินกิจกรรม + Admin functions

import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────

export type PostType = "announcement" | "event";

export interface Announcement {
  id: number;
  created_by: string | null;
  post_type: PostType;
  title: string;
  detail: string | null;
  event_date: string | null;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
}

/** ดึงประกาศ / กิจกรรมทั้งหมด */
export async function getAnnouncements(params?: {
  post_type?: PostType;
}): Promise<Announcement[]> {
  let query = supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (params?.post_type) query = query.eq("post_type", params.post_type);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Admin: สร้างประกาศ */
export async function createAnnouncement(params: {
  post_type: PostType;
  title: string;
  detail?: string;
  event_date?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      created_by: user?.id ?? null,
      post_type: params.post_type,
      title: params.title,
      detail: params.detail ?? null,
      event_date: params.event_date ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin: ลบประกาศ (soft delete) */
export async function deleteAnnouncement(id: number) {
  const { error } = await supabase
    .from("announcements")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw error;
}

// ─────────────────────────────────────────
// ADMIN - Dashboard
// ─────────────────────────────────────────

/** ดึง stats สำหรับ Dashboard */
export async function getAdminDashboardStats() {
  const { data, error } = await supabase
    .from("admin_dashboard_stats")
    .select("*")
    .single();
  if (error) throw error;
  return data as {
    pending_bookings: number;
    overdue_equipment: number;
    total_users: number;
    lost_this_month: number;
  };
}

// ─────────────────────────────────────────
// ADMIN - Users
// ─────────────────────────────────────────

/** ดึง users ทั้งหมด */
export async function getAllUsers(search?: string) {
  let query = supabase
    .from("profiles")
    .select("*")
    .eq("role", "student")
    .order("full_name");

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,student_id.ilike.%${search}%,faculty.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** ดู profile นักศึกษาพร้อมประวัติทั้งหมด */
export async function getUserWithHistory(userId: string) {
  const [profileRes, bookingsRes, borrowsRes, complaintsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single(),
      supabase
        .from("bookings")
        .select("*, locations(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("borrow_requests")
        .select("*, borrow_items(quantity, equipment(name))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("complaints")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (profileRes.error)    throw profileRes.error;
  if (bookingsRes.error)   throw bookingsRes.error;
  if (borrowsRes.error)    throw borrowsRes.error;
  if (complaintsRes.error) throw complaintsRes.error;

  return {
    profile:    profileRes.data,
    bookings:   bookingsRes.data,
    borrows:    borrowsRes.data,
    complaints: complaintsRes.data,
  };
}

// ─────────────────────────────────────────
// ADMIN - Banner
// ─────────────────────────────────────────

/** อัปโหลดรูปแบนเนอร์หน้าแรก */
export async function uploadBanner(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  const ext = file.name.split(".").pop();
  const fileName = `banner_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(fileName, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("banners").getPublicUrl(fileName);

  await supabase.from("banners").insert({
    image_url: data.publicUrl,
    updated_by: user.id,
  });

  return data.publicUrl;
}

/** ดึงแบนเนอร์ปัจจุบัน */
export async function getActiveBanner() {
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────
// ADMIN - Activity Logs
// ─────────────────────────────────────────

/** ดึง activity logs */
export async function getActivityLogs(limit = 20) {
  const { data, error } = await supabase
    .from("activity_logs")
    .select(`*, profiles ( full_name )`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}