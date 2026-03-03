import { useState } from "react";
import { Monitor, LayoutDashboard, ListMusic, Zap, Settings, Lock } from "lucide-react";
import DashboardTab from "@/components/admin/DashboardTab";
import PlaylistsTab from "@/components/admin/PlaylistsTab";
import AutomationTab from "@/components/admin/AutomationTab";
import SettingsTab from "@/components/admin/SettingsTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ADMIN_PIN = "8888";

const tabs = [
  { id: "dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { id: "playlists", label: "פלייליסטים", icon: ListMusic },
  { id: "automation", label: "אוטומציה", icon: Zap },
  { id: "settings", label: "הגדרות", icon: Settings },
] as const;

type TabId = typeof tabs[number]["id"];

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem("admin_unlocked") === "true");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const handlePinSubmit = () => {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem("admin_unlocked", "true");
      setIsUnlocked(true);
    } else {
      setPinError(true);
      setPin("");
      setTimeout(() => setPinError(false), 2000);
    }
  };

  if (!isUnlocked) {
    return (
      <div dir="rtl" className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold">כניסה לניהול</h1>
            <p className="text-sm text-muted-foreground">הזן קוד גישה</p>
          </div>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
            placeholder="● ● ● ●"
            className={`h-14 text-center text-2xl tracking-[0.5em] font-mono ${pinError ? "border-destructive" : ""}`}
            autoFocus
          />
          {pinError && <p className="text-sm text-destructive">קוד שגוי, נסה שנית</p>}
          <Button onClick={handlePinSubmit} className="w-full h-12 text-base font-semibold">
            כניסה
          </Button>
        </div>
      </div>
    );
  }

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
