// src/services/dbAuth.ts
// ระบบ Login / Register / Profile ด้วย Supabase Auth

import { supabase } from "@/lib/supabase";

export type UserRole = "student" | "admin" | "super_admin";

export interface Profile {
  id: string;
  student_id: string | null;
  full_name: string;
  faculty: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  department: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

/** สมัครสมาชิก */
export async function signUp(
  email: string,       // เฉพาะ username ไม่ต้องใส่ @dome.tu.ac.th
  password: string,
  fullName: string,
  faculty: string,
  studentId: string
) {
  const { data, error } = await supabase.auth.signUp({
    email: `${email}@dome.tu.ac.th`,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ faculty, student_id: studentId, full_name: fullName })
      .eq("id", data.user.id);
    if (profileError) throw profileError;
  }

  return data;
}

/** เข้าสู่ระบบ */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${email}@dome.tu.ac.th`,
    password,
  });
  if (error) throw error;
  return data;
}

/** ออกจากระบบ */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** ดึง session ปัจจุบัน */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ─────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────

/** ดึง profile ของตัวเอง */
export async function getMyProfile(): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้งาน");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return data;
}

/** ดึง profile โดย id (admin ใช้) */
export async function getProfileById(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

/** แก้ไขข้อมูลส่วนตัว */
export async function updateProfile(updates: Partial<Profile>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้งาน");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** เปลี่ยนรหัสผ่าน */
export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** อัปโหลดรูปโปรไฟล์ */
export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("ไม่พบผู้ใช้งาน");

  const ext = file.name.split(".").pop();
  const filePath = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

  await supabase
    .from("profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", user.id);

  return data.publicUrl;
}