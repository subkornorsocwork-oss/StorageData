// src/services/dbReport.ts
// ระบบแจ้งเรื่องร้องเรียน + ของหาย/เก็บได้

import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────
// COMPLAINTS
// ─────────────────────────────────────────

export type ComplaintCategory = "facility" | "welfare" | "academic" | "other";
export type ComplaintStatus = "received" | "in_progress" | "resolved" | "closed";
export type ComplaintSeverity = "urgent" | "normal" | "low";

export interface Complaint {
  id: number;
  user_id: string | null;
  category: ComplaintCategory;
  title: string;
  detail: string;
  is_anonymous: boolean;
  contact_info: string | null;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  admin_response: string | null;
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

/** ส่งเรื่องร้องเรียน */
export async function submitComplaint(params: {
  category: ComplaintCategory;
  title: string;
  detail: string;
  is_anonymous: boolean;
  contact_info?: string;
  severity?: ComplaintSeverity;
}) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("complaints")
    .insert({
      user_id: params.is_anonymous ? null : (user?.id ?? null),
      category: params.category,
      title: params.title,
      detail: params.detail,
      is_anonymous: params.is_anonymous,
      contact_info: params.contact_info ?? null,
      severity: params.severity ?? "normal",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ดูเรื่องร้องเรียนของตัวเอง */
export async function getMyComplaints(): Promise<Complaint[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  const { data, error } = await supabase
    .from("complaints")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Admin: ดึงเรื่องร้องเรียนทั้งหมด */
export async function getAllComplaints(params?: {
  status?: ComplaintStatus;
  category?: ComplaintCategory;
}) {
  let query = supabase
    .from("complaints")
    .select(`*, profiles ( full_name, student_id, phone )`)
    .order("created_at", { ascending: false });

  if (params?.status)   query = query.eq("status", params.status);
  if (params?.category) query = query.eq("category", params.category);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Admin: อัปเดตสถานะเรื่องร้องเรียน */
export async function updateComplaintStatus(
  complaintId: number,
  status: ComplaintStatus,
  adminResponse?: string
) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("complaints")
    .update({
      status,
      admin_response: adminResponse ?? null,
      handled_by: user?.id ?? null,
      handled_at: new Date().toISOString(),
    })
    .eq("id", complaintId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────
// LOST AND FOUND
// ─────────────────────────────────────────

export type LafType = "lost" | "found";

export interface LostAndFound {
  id: number;
  user_id: string | null;
  post_type: LafType;
  item_name: string;
  description: string | null;
  location_name: string | null;
  lost_date: string | null;
  contact_info: string | null;
  image_url: string | null;
  is_resolved: boolean;
  created_at: string;
}

/** ดึงโพสต์ของหายทั้งหมด */
export async function getLostAndFound(params?: {
  post_type?: LafType;
  is_resolved?: boolean;
}): Promise<LostAndFound[]> {
  let query = supabase
    .from("lost_and_found")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.post_type !== undefined)
    query = query.eq("post_type", params.post_type);
  if (params?.is_resolved !== undefined)
    query = query.eq("is_resolved", params.is_resolved);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** สร้างโพสต์ของหาย / เก็บได้ */
export async function createLafPost(params: {
  post_type: LafType;
  item_name: string;
  description?: string;
  location_name?: string;
  lost_date?: string;
  contact_info?: string;
  image_file?: File;
}) {
  const { data: { user } } = await supabase.auth.getUser();

  let image_url: string | null = null;
  if (params.image_file) {
    const ext = params.image_file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("laf-images")
      .upload(fileName, params.image_file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage
      .from("laf-images")
      .getPublicUrl(fileName);
    image_url = data.publicUrl;
  }

  const { data, error } = await supabase
    .from("lost_and_found")
    .insert({
      user_id: user?.id ?? null,
      post_type: params.post_type,
      item_name: params.item_name,
      description: params.description ?? null,
      location_name: params.location_name ?? null,
      lost_date: params.lost_date ?? null,
      contact_info: params.contact_info ?? null,
      image_url,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ทำเครื่องหมายว่าเจอ/คืนแล้ว */
export async function resolveLafPost(postId: number) {
  const { data, error } = await supabase
    .from("lost_and_found")
    .update({ is_resolved: true })
    .eq("id", postId)
    .select()
    .single();
  if (error) throw error;
  return data;
}