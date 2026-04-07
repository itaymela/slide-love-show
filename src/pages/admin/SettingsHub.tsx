import { useNavigate } from "react-router-dom";
import { Sparkles, Type, Image, Monitor, Cake, ImageIcon } from "lucide-react";

const settingsCards = [
  {
    icon: Sparkles,
    label: "סגנון מעבר",
    description: "סוג ומהירות אנימציית המעבר בין שקפים",
    path: "/admin/settings/transitions",
  },
  {
    icon: Type,
    label: "פס רץ",
    description: "טקסט, גודל גופן ומהירות הפס הרץ",
    path: "/admin/settings/ticker",
  },
  {
    icon: Cake,
    label: "ימי הולדת",
    description: "חיבור Google Sheets להצגת שמות אוטומטית",
    path: "/admin/settings/birthdays",
  },
  {
    icon: Image,
    label: "שכבה גרפית",
    description: "תמונת לוגו/מיתוג מעל השקפים",
    path: "/admin/settings/overlay",
  },
  {
    icon: Monitor,
    label: "כיול תצוגה",
    description: "תיקון חיתוך קצוות במסכי טלוויזיה",
    path: "/admin/settings/calibration",
  },
];

export default function SettingsHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {settingsCards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.path}
            onClick={() => navigate(card.path)}
            className="w-full bg-card rounded-xl border border-border p-4 flex items-center gap-4 text-right active:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{card.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
            </div>
            <span className="text-muted-foreground text-lg">‹</span>
          </button>
        );
      })}
    </div>
  );
}
