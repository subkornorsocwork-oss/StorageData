  "use client";
  import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
  import { supabase } from "@/lib/supabase"; 

  // 🟢 1. สร้าง Type สำหรับ Profile ให้ชัดเจน (ถ้ามีฟิลด์อื่นในฐานข้อมูลเพิ่มเข้ามาได้ครับ)
  export interface UserProfile {
    id: string;
    full_name: string;
    student_id: string;
    faculty: string;
    email: string;
    role: "student" | "admin";
  }

  // 🟢 2. เพิ่ม profile เข้าไปใน Context เพื่อให้หน้าอื่นเรียกใช้ได้
  const RoleContext = createContext<{
    role: "student" | "admin" | null;
    setRole: (role: "student" | "admin" | null) => void;
    fullName: string;
    profile: UserProfile | null; // เพิ่มตรงนี้
    loading: boolean;
  } | undefined>(undefined);

  export function RoleProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<"student" | "admin" | null>(null);
    const [fullName, setFullName] = useState<string>("");
    const [profile, setProfile] = useState<UserProfile | null>(null); // State เก็บข้อมูล Profile เต็มๆ
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
      const fetchUserProfile = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          // 🟢 3. เปลี่ยนเป็น select("*") เพื่อดึงข้อมูลมาทั้งหมด
          const { data, error } = await supabase
            .from("profiles")
            .select("*") 
            .eq("id", session.user.id)
            .single();

          if (data && !error) {
            setRole(data.role as "student" | "admin");
            setFullName(data.full_name);
            setProfile(data as UserProfile); // เก็บข้อมูลโปรไฟล์ทั้งหมด
          }
        }
        setLoading(false);
      };

      fetchUserProfile();

      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === "SIGNED_IN" && session) {
            const { data } = await supabase
              .from("profiles")
              .select("*") // ดึงทั้งหมดเช่นกัน
              .eq("id", session.user.id)
              .single();
            if (data) {
              setRole(data.role as "student" | "admin");
              setFullName(data.full_name);
              setProfile(data as UserProfile); // เก็บข้อมูลโปรไฟล์ทั้งหมด
            }
          } else if (event === "SIGNED_OUT") {
            setRole(null);
            setFullName("");
            setProfile(null); // เคลียร์ข้อมูลตอนล็อกเอาท์
          }
        }
      );

      return () => {
        // 🟢 4. ใส่ ? ไว้ให้ด้วยครับ จะได้ไม่ติด Error null ที่เราเพิ่งแก้กันไป
        authListener?.subscription?.unsubscribe();
      };
    }, []);

    return (
      // 🟢 5. โยน profile ออกไปให้ component อื่นใช้งาน
      <RoleContext.Provider value={{ role, setRole, fullName, profile, loading }}>
        {children}
      </RoleContext.Provider>
    );
  }

  export function useRole() {
    const context = useContext(RoleContext);
    if (context === undefined) {
      throw new Error("useRole must be used within a RoleProvider");
    }
    return context;
  }