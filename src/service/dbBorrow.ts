// src/services/dbBorrow.ts
// ระบบยืม-คืนพัสดุและอุปกรณ์

import { supabase } from "@/lib/supabase";

export type BorrowStatus =
  | "pending"
  | "borrowing"
  | "returned"
  | "overdue"
  | "cancelled";

export interface Equipment {
  id: number;
  name: string;
  name_en: string | null;
  barcode: string;
  emoji: string;
  total_qty: number;
  available_qty: number;
  description: string | null;
  is_active: boolean;
}

export interface BorrowItem {
  equipment_id: number;
  quantity: number;
}

export interface BorrowRequest {
  id: number;
  user_id: string;
  borrower_type: "student" | "organization";
  org_name: string | null;
  phone: string;
  borrow_date: string;
  return_due_date: string;
  actual_return: string | null;
  purpose: string | null;
  status: BorrowStatus;
  admin_note: string | null;
  created_at: string;
}

// ─────────────────────────────────────────
// EQUIPMENT
// ─────────────────────────────────────────

/** ดึงอุปกรณ์ทั้งหมด */
export async function getEquipment(): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data;
}

/** ค้นหาอุปกรณ์ด้วยบาร์โค้ด */
export async function getEquipmentByBarcode(
  barcode: string
): Promise<Equipment | null> {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("barcode", barcode)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Admin: เพิ่มอุปกรณ์ใหม่ */
export async function addEquipment(
  equipment: Omit<Equipment, "id" | "available_qty">
) {
  const { data, error } = await supabase
    .from("equipment")
    .insert({ ...equipment, available_qty: equipment.total_qty })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Admin: แก้ไขอุปกรณ์ */
export async function updateEquipment(id: number, updates: Partial<Equipment>) {
  const { data, error } = await supabase
    .from("equipment")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────
// BORROW REQUESTS - Student
// ─────────────────────────────────────────

/** ส่งคำขอยืมอุปกรณ์ */
export async function createBorrowRequest(params: {
  borrower_type: "student" | "organization";
  org_name?: string;
  phone: string;
  borrow_date: string;
  return_due_date: string;
  purpose?: string;
  items: BorrowItem[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  const { data: request, error: reqError } = await supabase
    .from("borrow_requests")
    .insert({
      user_id: user.id,
      borrower_type: params.borrower_type,
      org_name: params.org_name ?? null,
      phone: params.phone,
      borrow_date: params.borrow_date,
      return_due_date: params.return_due_date,
      purpose: params.purpose ?? null,
    })
    .select()
    .single();
  if (reqError) throw reqError;

  const items = params.items.map((item) => ({
    borrow_request_id: request.id,
    equipment_id: item.equipment_id,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("borrow_items")
    .insert(items);
  if (itemsError) throw itemsError;

  return request;
}

/** ดึงรายการยืมของตัวเอง */
export async function getMyBorrows() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อน");

  const { data, error } = await supabase
    .from("borrow_requests")
    .select(`
      *,
      borrow_items (
        quantity,
        equipment ( name, emoji, barcode )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────
// BORROW REQUESTS - Admin
// ─────────────────────────────────────────

/** ดึงคำขอยืมทั้งหมด */
export async function getAllBorrows(params?: {
  status?: BorrowStatus;
  search?: string;
}) {
  let query = supabase
    .from("borrow_details")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.status) query = query.eq("status", params.status);
  if (params?.search) query = query.ilike("user_name", `%${params.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** อนุมัติ / เริ่มให้ยืม (pending → borrowing) */
export async function approveBorrow(borrowId: number) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("borrow_requests")
    .update({ status: "borrowing", approved_by: user?.id ?? null })
    .eq("id", borrowId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** รับคืนอุปกรณ์ (borrowing → returned) */
export async function returnEquipment(borrowId: number) {
  const { data, error } = await supabase
    .from("borrow_requests")
    .update({ status: "returned" })
    .eq("id", borrowId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ดึงรายการอุปกรณ์เกินกำหนดคืน */
export async function getOverdueBorrows() {
  const { data, error } = await supabase
    .from("borrow_requests")
    .select(`
      *,
      profiles ( full_name, student_id, phone ),
      borrow_items ( quantity, equipment ( name ) )
    `)
    .eq("status", "borrowing")
    .lt("return_due_date", new Date().toISOString());
  if (error) throw error;
  return data;
}