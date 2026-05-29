"use client";
import { useState } from "react";
import AdminDashboard from "@/components/AdminDashboard";
import AdminBooking from "@/components/AdminBooking";
import AdminBorrow from "@/components/AdminBorrow";
import AdminComplaint from "@/components/AdminComplaint";
import AdminLostFound from "@/components/AdminLostFound";
import AdminAnnouncements from "@/components/AdminAnnouncements";
import AdminUsers from "@/components/AdminUsers";
import AdminProfile from "@/components/AdminProfile";
import { useRole } from "@/context/RoleContext";

type AdminTab = "dashboard"|"booking"|"borrow"|"complaint"|"lostfound"|"announcements"|"users"|"profile";

const MENU: { key: AdminTab; icon: string; label: string }[] = [
  { key: "dashboard",     icon: "📊", label: "แดชบอร์ด" },
  { key: "booking",       icon: "📅", label: "จองสถานที่" },
  { key: "borrow",        icon: "📦", label: "ยืม-คืน" },
  { key: "complaint",     icon: "📢", label: "ร้องเรียน" },
  { key: "lostfound",     icon: "🔍", label: "ของหาย" },
  { key: "announcements", icon: "📣", label: "ประกาศ" },
  { key: "users",         icon: "👥", label: "ผู้ใช้งาน" },
  { key: "profile",       icon: "👤", label: "โปรไฟล์" },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { fullName } = useRole();

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":     return <AdminDashboard />;
      case "booking":       return <AdminBooking />;
      case "borrow":        return <AdminBorrow />;
      case "complaint":     return <AdminComplaint />;
      case "lostfound":     return <AdminLostFound />;
      case "announcements": return <AdminAnnouncements />;
      case "users":         return <AdminUsers />;
      case "profile":       return <AdminProfile />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f1f5f9" }}>

      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? "240px" : "64px",
        backgroundColor: "#1e293b", color: "white",
        display: "flex", flexDirection: "column", flexShrink: 0,
        transition: "width 0.25s ease", overflow: "hidden",
      }}>

        {/* Logo + Toggle */}
        <div style={{ padding: "16px 12px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: "72px" }}>
          {sidebarOpen && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", backgroundColor: "#800000", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.85rem", flexShrink: 0 }}>
                SOC
              </div>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Admin Panel</div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>กน.สค. Services</div>
              </div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(p => !p)}
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem", padding: "4px", flexShrink: 0, marginLeft: sidebarOpen ? "auto" : "auto", marginRight: "auto" }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* User */}
        {sidebarOpen && (
          <div style={{ padding: "10px 20px", fontSize: "0.78rem", color: "#64748b", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            👤 {fullName || "ผู้ดูแลระบบ"}
          </div>
        )}

        {/* Menu */}
        <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
          {MENU.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              title={!sidebarOpen ? item.label : undefined}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: sidebarOpen ? "12px" : "0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                padding: "12px 20px", border: "none", background: "none", cursor: "pointer",
                color: activeTab === item.key ? "white" : "#94a3b8",
                backgroundColor: activeTab === item.key ? "rgba(128,0,0,0.4)" : "transparent",
                borderLeft: activeTab === item.key ? "3px solid #800000" : "3px solid transparent",
                fontWeight: activeTab === item.key ? "bold" : "normal",
                fontSize: "0.9rem", textAlign: "left", transition: "all 0.15s",
              }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "0.75rem", color: "#475569", textAlign: "center" }}>
          {sidebarOpen ? "🔒 Admin Access Only" : "🔒"}
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        {renderContent()}
      </main>
    </div>
  );
}