"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 15000): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง")), timeoutMs);
    }),
  ]);
}

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const checkExistingSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      router.replace(profile?.role === "admin" ? "/admin" : "/");
    };

    void checkExistingSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!supabaseUrl || !supabaseAnonKey) {
      setErrorMsg("ยังไม่ได้ตั้งค่า Supabase environment variables ให้ครบ โดยเฉพาะ NEXT_PUBLIC_SUPABASE_ANON_KEY");
      setLoading(false);
      return;
    }

    const fullEmail = emailPrefix.includes("@")
      ? emailPrefix.trim()
      : `${emailPrefix.trim()}@dome.tu.ac.th`;

    try {
      if (isRegister) {
        const { data: authData, error: authError } = await withTimeout(
          supabase.auth.signUp({
            email: fullEmail,
            password,
            options: { data: { full_name: fullName } },
          }),
          15000,
        );

        if (authError) throw authError;

        if (authData.user) {
          const { error: signInErr } = await withTimeout(
            supabase.auth.signInWithPassword({
              email: fullEmail,
              password,
            }),
            15000,
          );

          if (signInErr) throw signInErr;

          const { error: profileError } = await withTimeout(
            supabase.from("profiles").upsert({
              id: authData.user.id,
              full_name: fullName,
              faculty,
              student_id: studentId,
              phone,
              email: fullEmail,
              role: "student",
            }),
            15000,
          );

          if (profileError) throw profileError;

          router.replace("/");
        }
      } else {
        const { data: loginData, error: loginError } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: fullEmail,
            password,
          }),
          15000,
        );

        if (loginError) {
          if (loginError.message.includes("Invalid login credentials")) {
            throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
          }
          throw loginError;
        }

        const userId = loginData.session?.user.id;
        if (userId) {
          const { data: profile } = await withTimeout(
            supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
            15000,
          );

          router.replace(profile?.role === "admin" ? "/admin" : "/");
        } else {
          router.replace("/");
        }
      }
    } catch (error: unknown) {
      console.error(error);
      const err = error as Error;
      const msg: Record<string, string> = {
        "User already registered": "อีเมลนี้ลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ",
        "Password should be at least 6 characters": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร",
        "Unable to validate email address: invalid format": "รูปแบบอีเมลไม่ถูกต้อง",
      };
      setErrorMsg(msg[err.message] ?? err.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell" style={{ minHeight: "100dvh", width: "100%", display: "flex", backgroundColor: "#f8fafc", fontFamily: "sans-serif", overflowX: "hidden" }}>
      <div className="login-brand" style={{ flex: 1, color: "white", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px", background: "linear-gradient(135deg, #800000 0%, #4a0404 100%)" }}>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "bold", marginBottom: "20px", lineHeight: "1.1", wordBreak: "break-word", overflowWrap: "anywhere" }}>
          TU Student<br />Services
        </h1>
        <p style={{ fontSize: "1.2rem", opacity: 0.8, lineHeight: "1.7", maxWidth: "320px", wordBreak: "break-word", overflowWrap: "anywhere" }}>
          ระบบบริการนักศึกษาแบบครบวงจร คณะสังคมสงเคราะห์ศาสตร์ มหาวิทยาลัยธรรมศาสตร์ ศูนย์รังสิต
        </p>
      </div>

      <div className="login-form-wrap" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div className="login-card" style={{ backgroundColor: "white", padding: "40px", borderRadius: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", width: "100%", maxWidth: "450px" }}>
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: "bold", color: "#1e293b", margin: "0 0 10px 0" }}>
              {isRegister ? "สมัครสมาชิกใหม่" : "เข้าสู่ระบบ"}
            </h2>
            <p style={{ color: "#64748b", margin: 0 }}>สำหรับนักศึกษาและบุคลากร มธ.</p>
          </div>

          {errorMsg && (
            <div style={{ backgroundColor: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", marginBottom: "20px", fontSize: "0.9rem", textAlign: "center" }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {isRegister && (
              <>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>ชื่อ-นามสกุล</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="กรอกชื่อ-นามสกุล" style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} required />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>คณะ / วิทยาลัย</label>
                  <select value={faculty} onChange={(e) => setFaculty(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box", backgroundColor: "white", cursor: "pointer", fontFamily: "inherit" }} required>
                    <option value="" disabled>-- โปรดเลือกคณะ --</option>
                    <option value="คณะนิติศาสตร์">คณะนิติศาสตร์</option>
                    <option value="คณะพาณิชยศาสตร์และการบัญชี">คณะพาณิชยศาสตร์และการบัญชี</option>
                    <option value="คณะรัฐศาสตร์">คณะรัฐศาสตร์</option>
                    <option value="คณะเศรษฐศาสตร์">คณะเศรษฐศาสตร์</option>
                    <option value="คณะสังคมสงเคราะห์ศาสตร์">คณะสังคมสงเคราะห์ศาสตร์</option>
                    <option value="คณะวิทยาศาสตร์และเทคโนโลยี">คณะวิทยาศาสตร์และเทคโนโลยี</option>
                    <option value="คณะวิศวกรรมศาสตร์">คณะวิศวกรรมศาสตร์</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>เลขทะเบียน</label>
                  <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="ตัวเลข 10 หลัก" maxLength={10} style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} required />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>เบอร์โทรศัพท์ติดต่อ</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08X-XXX-XXXX" maxLength={10} style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} required />
                </div>
              </>
            )}

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>อีเมลมหาวิทยาลัย</label>
              <div style={{ position: "relative" }}>
                <input type="text" value={emailPrefix} onChange={(e) => setEmailPrefix(e.target.value)} placeholder="อีเมลของคุณ" style={{ width: "100%", padding: "12px 130px 12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }} required />
                <span style={{ position: "absolute", right: "16px", top: "12px", color: "#64748b", fontSize: "0.9rem", pointerEvents: "none" }}>
                  @dome.tu.ac.th
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "0.9rem", color: "#334155", fontWeight: "bold" }}>
                รหัสผ่าน {isRegister ? "(อย่างน้อย 6 ตัวอักษร)" : ""}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  style={{ width: "100%", padding: "12px 50px 12px 16px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", boxSizing: "border-box" }}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: "absolute", right: "12px", top: "10px", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              type="submit"
              style={{ width: "100%", padding: "14px", backgroundColor: loading ? "#94a3b8" : "#800000", color: "white", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", marginTop: "10px" }}
            >
              {loading ? "กำลังดำเนินการ..." : (isRegister ? "ยืนยันการสมัครสมาชิก" : "เข้าสู่ระบบ")}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "24px", fontSize: "0.9rem", color: "#64748b" }}>
            {isRegister ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชีใช่หรือไม่? "}
            <button onClick={() => { setIsRegister(!isRegister); setErrorMsg(""); }} style={{ background: "none", border: "none", color: "#800000", fontWeight: "bold", cursor: "pointer", padding: 0 }}>
              {isRegister ? "เข้าสู่ระบบที่นี่" : "สมัครสมาชิกที่นี่"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1280px) {
          .login-shell {
            flex-direction: column;
            align-items: center;
            padding: 16px 0 24px;
          }

          .login-brand {
            flex: none;
            width: min(100% - 32px, 620px);
            min-height: 210px;
            padding: 28px 22px;
            justify-content: center;
            border-radius: 24px;
            box-sizing: border-box;
          }

          .login-brand h1 {
            font-size: clamp(2rem, 7vw, 2.8rem) !important;
            margin-bottom: 12px !important;
            line-height: 1.05 !important;
          }

          .login-brand p {
            font-size: 1rem !important;
            line-height: 1.6 !important;
            max-width: 100% !important;
          }

          .login-form-wrap {
            flex: none;
            width: min(100% - 32px, 620px);
            padding: 14px 0 0;
            align-items: stretch;
            box-sizing: border-box;
          }

          .login-card {
            max-width: none !important;
            padding: 28px 20px !important;
            border-radius: 22px !important;
            width: 100% !important;
            box-sizing: border-box;
          }
        }

        @media (max-width: 480px) {
          .login-brand {
            width: calc(100% - 20px);
            min-height: 180px;
            padding: 22px 16px;
          }

          .login-card {
            padding: 22px 14px !important;
          }

          .login-card input,
          .login-card select {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}
