import { createClient } from '@supabase/supabase-js'

// 1. ดึงค่า URL (คุณน่าจะลืมบรรทัดนี้ หรือพิมพ์ชื่อตัวแปรผิด)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// 2. ดึงค่า Key
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 3. สร้าง Client โดยส่งไปทั้ง 2 ค่า
export const supabase = createClient(supabaseUrl, supabaseAnonKey);