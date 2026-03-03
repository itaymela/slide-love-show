import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Save, Type, Sparkles, Timer } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  id: string;
  ticker_text: string;
  ticker_enabled: boolean;
  transition_type: string;
  manual_override: boolean;
  ticker_font_size: number;
  ticker_speed: number;
  transition_duration: number;
};

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*").limit(1);
    if (data?.[0]) setSettings(data[0] as unknown as Settings);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("settings").update({
      ticker_text: settings.ticker_text,
      ticker_enabled: settings.ticker_enabled,
      transition_type: settings.transition_type,
      ticker_font_size: settings.ticker_font_size,
      ticker_speed: settings.ticker_speed,
      transition_duration: settings.transition_duration,
    } as any).eq("id", settings.id);
    setSaving(false);
    if (error) { toast.error("שגיאה בשמירת הגדרות"); return; }
    toast.success("ההגדרות נשמרו — התצוגה תתעדכן אוטומטית");
  };

  if (!settings) return null;

  return (
    <div className="space-y-5">
      {/* Transition Type */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">סגנון מעבר</span>
        </div>
        <Select value={settings.transition_type} onValueChange={(v) => setSettings(s => s ? { ...s, transition_type: v } : s)}>
          <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fade">עמעום (Cross-dissolve)</SelectItem>
            <SelectItem value="cut">קטיעה (מיידי)</SelectItem>
          </SelectContent>
        </Select>

        {/* Transition Duration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm">מהירות מעבר</Label>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{settings.transition_duration}s</span>
          </div>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[settings.transition_duration * 10]}
            onValueChange={([v]) => setSettings(s => s ? { ...s, transition_duration: v / 10 } : s)}
          />
          <p className="text-[11px] text-muted-foreground">0.1 – 2.0 שניות. חל רק על סגנון "עמעום".</p>
        </div>
      </div>

      {/* News Ticker */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">פס רץ</span>
          </div>
          <Switch checked={settings.ticker_enabled} onCheckedChange={(v) => setSettings(s => s ? { ...s, ticker_enabled: v } : s)} />
        </div>
        <Textarea
          placeholder="הכנס טקסט לפס רץ…&#10;שורה חדשה = נקודה מפרידה ●"
          value={settings.ticker_text}
          onChange={(e) => setSettings(s => s ? { ...s, ticker_text: e.target.value } : s)}
          className="text-sm min-h-[80px]"
        />
        <p className="text-[11px] text-muted-foreground">שורות חדשות (Enter) יוצגו כ- " ● " בפס הרץ.</p>

        {/* Font size slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">גודל גופן פס רץ</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.ticker_font_size}px</span>
          </div>
          <Slider
            min={12}
            max={32}
            step={1}
            value={[settings.ticker_font_size]}
            onValueChange={([v]) => setSettings(s => s ? { ...s, ticker_font_size: v } : s)}
          />
        </div>

        {/* Speed slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">מהירות גלילה</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.ticker_speed}s</span>
          </div>
          <Slider
            min={10}
            max={120}
            step={5}
            value={[settings.ticker_speed]}
            onValueChange={([v]) => setSettings(s => s ? { ...s, ticker_speed: v } : s)}
          />
          <p className="text-[11px] text-muted-foreground">זמן סיבוב מלא בשניות (נמוך = מהיר יותר).</p>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירת הגדרות"}
      </Button>
    </div>
  );
}
