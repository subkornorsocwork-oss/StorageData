"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/context/RoleContext";

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { role } = useRole();

  // ✅ ซ่อน Sidebar เมื่ออยู่หน้า admin (admin มี sidebar ของตัวเอง)
  if (pathname.startsWith("/admin")) return null;

  const isActive = (path: string) => pathname === path;

  const linkStyle = (path: string): React.CSSProperties => ({
    padding: "12px 15px",
    backgroundColor: isActive(path) ? "#800000" : "transparent",
    color: isActive(path) ? "white" : "#64748b",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: isActive(path) ? "bold" : "normal",
    transition: "0.2s",
    display: "block",
    fontSize: "0.95rem",
  });

  // ✅ student links เท่านั้น (admin จะถูก redirect ไป /admin อยู่แล้ว)
  const studentLinks = [
    { href: "/",             label: "🏠 หน้าแรก" },
    { href: "/booking",      label: "🏛️ จองสถานที่" },
    { href: "/borrow",       label: "📦 ยืม-คืน อุปกรณ์" },
    { href: "/complaint",    label: "📢 แจ้งเรื่องร้องเรียน" },
    { href: "/lostandfound", label: "🔍 แจ้งของหาย" },
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-wrapper {
          width: 250px;
          background-color: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: sticky;
          top: 0;
          flex-shrink: 0;
        }
        .hamburger-btn {
          display: none;
          position: fixed;
          top: 14px;
          left: 16px;
          z-index: 1100;
          background: #800000;
          color: white;
          border: none;
          border-radius: 8px;
          width: 40px;
          height: 40px;
          font-size: 1.3rem;
          cursor: pointer;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(128,0,0,0.3);
        }
        .backdrop { display: none; }
        @media (max-width: 768px) {
          .sidebar-wrapper {
            position: fixed;
            left: -260px;
            top: 0;
            transition: left 0.3s ease-in-out;
            z-index: 1050;
            box-shadow: 4px 0 15px rgba(0,0,0,0.1);
          }
          .sidebar-wrapper.open { left: 0; }
          .hamburger-btn { display: flex; }
          .backdrop.open {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            z-index: 1040;
          }
        }
      `}} />

      <button className="hamburger-btn" onClick={() => setIsOpen(true)} aria-label="เปิดเมนู">☰</button>
      <div className={`backdrop ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)} />

      <aside className={`sidebar-wrapper ${isOpen ? "open" : ""}`}>
        <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "35px", height: "35px", backgroundColor: "#800000", color: "white", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "bold", flexShrink: 0 }}>
              SOC
            </div>
            <span style={{ fontWeight: "bold", color: "#1e293b" }}>กน.สค. Services</span>
          </div>
          <button onClick={() => setIsOpen(false)}
            style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#64748b", display: isOpen ? "block" : "none" }}>
            ✕
          </button>
        </div>

        <nav style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "6px", flex: 1, overflowY: "auto" }}>
          {studentLinks.map((link) => (
            <Link key={link.href} href={link.href} style={linkStyle(link.href)} onClick={() => setIsOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}