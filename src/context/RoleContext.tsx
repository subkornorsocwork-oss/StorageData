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
  phone?: string | null;
  department?: string | null;
  contact_location?: string | null;
  contact_phone?: string | null;
  contact_hours?: string | null;
  contact_email?: string | null;
  instagram_url?: string | null;
}

const RoleContext = createContext<{
  role: "student" | "admin" | null;
  setRole: (role: "student" | "admin" | null) => void;
  fullName: string;
  profile: UserProfile | null;
  loading: boolean;
} | undefined>(undefined);

const PROFILE_CACHE_KEY = "student-system:profile";

async function loadProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as UserProfile;
}

function readCachedProfile(userId: string): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as UserProfile;
    return cached.id === userId ? cached : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // ignore cache write failures
  }
}

function clearCachedProfile() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // ignore cache clear failures
  }
}

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 10000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("profile load timeout")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
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

    const applyProfileState = (data: UserProfile, persist = true) => {
      if (!isMounted) return;
      setRole(data.role);
      setFullName(data.full_name);
      setProfile(data);
      if (persist) writeCachedProfile(data);
    };

    const bootstrap = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession(), 8000);

        if (session?.user) {
          const cachedProfile = readCachedProfile(session.user.id);
          if (cachedProfile) {
            applyProfileState(cachedProfile, false);
          }

          try {
            const userProfile = await withTimeout(loadProfile(session.user.id), 10000);
            applyProfileState(userProfile);
          } catch (profileError) {
            console.error("bootstrap profile error:", profileError);
            if (!cachedProfile) {
              clearProfileState();
            }
          }
        } else {
          clearProfileState();
          clearCachedProfile();
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
          clearCachedProfile();
          if (isMounted) setLoading(false);
          return;
        }

        if (session?.user) {
          const cachedProfile = readCachedProfile(session.user.id);
          if (cachedProfile) {
            applyProfileState(cachedProfile, false);
          }

          const userProfile = await withTimeout(loadProfile(session.user.id), 10000);
          applyProfileState(userProfile);
        } else {
          clearProfileState();
          clearCachedProfile();
        }
      } catch (profileError) {
        console.error("auth state profile error:", profileError);
        if (!profileError || !session?.user || !readCachedProfile(session.user.id)) {
          clearProfileState();
        }
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
