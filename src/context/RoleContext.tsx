"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<"student" | "admin" | null>(null);
  const [fullName, setFullName] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const clearProfileState = () => {
      if (!isMounted) return;
      setRole(null);
      setFullName("");
      setProfile(null);
    };

    const applyProfileState = (data: UserProfile) => {
      if (!isMounted) return;
      setRole(data.role);
      setFullName(data.full_name);
      setProfile(data);
    };

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          try {
            const userProfile = await loadProfile(session.user.id);
            applyProfileState(userProfile);
          } catch (profileError) {
            console.error("bootstrap profile error:", profileError);
            clearProfileState();
          }
        } else {
          clearProfileState();
        }
      } catch (sessionError) {
        console.error("bootstrap session error:", sessionError);
        clearProfileState();
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_OUT") {
          clearProfileState();
          if (isMounted) setLoading(false);
          return;
        }

        if (session?.user) {
          if (isMounted) setLoading(true);
          const userProfile = await loadProfile(session.user.id);
          applyProfileState(userProfile);
        } else {
          clearProfileState();
        }
      } catch (profileError) {
        console.error("auth state profile error:", profileError);
        clearProfileState();
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
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
