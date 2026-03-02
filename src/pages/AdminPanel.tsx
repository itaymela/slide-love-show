import { useState } from "react";
import { Monitor, LayoutDashboard, ListMusic, Zap, Settings } from "lucide-react";
import DashboardTab from "@/components/admin/DashboardTab";
import PlaylistsTab from "@/components/admin/PlaylistsTab";
import AutomationTab from "@/components/admin/AutomationTab";
import SettingsTab from "@/components/admin/SettingsTab";

const tabs = [
  { id: "dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { id: "playlists", label: "פלייליסטים", icon: ListMusic },
  { id: "automation", label: "אוטומציה", icon: Zap },
  { id: "settings", label: "הגדרות", icon: Settings },
] as const;

type TabId = typeof tabs[number]["id"];

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  return (
    <div dir="rtl" className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
              ניהול שילוט
            </h1>
          </div>
          <a href="/display" target="_blank" className="text-xs font-medium text-primary hover:underline">
            פתח תצוגה ↗
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-4">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "playlists" && <PlaylistsTab />}
        {activeTab === "automation" && <AutomationTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around h-14">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AdminPanel;
