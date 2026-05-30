"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  full_name: string;
  student_id: string;
  faculty: string;
  email: string;
  role: "student" | "admin";
}

const RoleContext = createContext<{
  role: "student" | "admin" | null;
  setRole: (role: "student" | "admin" | null) => void;
  fullName: string;
  profile: UserProfile | null;
  loading: boolean;
} | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<"student" | "admin" | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // ✅ ใช้ onAuthStateChange เป็นตัวหลัก
    // INITIAL_SESSION จะ fire เสมอเป็น event แรก ไม่ว่าจะมี session หรือไม่
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") {
          if (session?.user) {
            const { data } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();
            if (data) {
              setRole(data.role as "student" | "admin");
              setFullName(data.full_name);
              setProfile(data as UserProfile);
            }
          }
          setLoading(false); // ✅ setLoading(false) หลัง INITIAL_SESSION เสมอ ไม่ว่าจะมี session หรือไม่
        }

        if (event === "SIGNED_IN" && session?.user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (data) {
            setRole(data.role as "student" | "admin");
            setFullName(data.full_name);
            setProfile(data as UserProfile);
          }
        }

        if (event === "SIGNED_OUT") {
          setRole(null);
          setFullName("");
          setProfile(null);
          setLoading(false);
          window.location.href = "/login";
        }
      }
    );

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  return (
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