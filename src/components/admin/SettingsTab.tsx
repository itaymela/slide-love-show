import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Type, Sparkles, Timer, Monitor, Image, Upload, Cake, RefreshCw } from "lucide-react";
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
  display_scale: number;
  display_offset_x: number;
  display_offset_y: number;
  overlay_url: string;
  overlay_position: string;
  overlay_size: number;
  birthday_sheet_url: string;
  birthday_enabled: boolean;
};

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [birthdayStatus, setBirthdayStatus] = useState<"idle" | "success" | "error">("idle");
  const [birthdayNames, setBirthdayNames] = useState<string[]>([]);
  const [fetchingBirthdays, setFetchingBirthdays] = useState(false);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*").limit(1);
    if (data?.[0]) setSettings(data[0] as unknown as Settings);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleOverlayUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `overlay/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { upsert: true });
    if (error) { toast.error("שגיאה בהעלאת תמונה"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
    setSettings(s => s ? { ...s, overlay_url: urlData.publicUrl } : s);
    setUploading(false);
    toast.success("התמונה הועלתה בהצלחה");
  };

  const fetchBirthdayNames = useCallback(async (url: string) => {
    if (!url) { setBirthdayNames([]); setBirthdayStatus("idle"); return; }
    setFetchingBirthdays(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const rows = text.split("\n").slice(1); // skip header
      const names = rows
        .map(row => {
          const cols = row.split(",");
          return (cols[4] || "").replace(/^"|"$/g, "").trim();
        })
        .filter(Boolean);
      setBirthdayNames(names);
      setBirthdayStatus("success");
    } catch {
      setBirthdayNames([]);
      setBirthdayStatus("error");
    }
    setFetchingBirthdays(false);
  }, []);

  useEffect(() => {
    if (settings?.birthday_enabled && settings?.birthday_sheet_url) {
      fetchBirthdayNames(settings.birthday_sheet_url);
    }
  }, [settings?.birthday_enabled, settings?.birthday_sheet_url, fetchBirthdayNames]);

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
      display_scale: settings.display_scale,
      display_offset_x: settings.display_offset_x,
      display_offset_y: settings.display_offset_y,
      overlay_url: settings.overlay_url,
      overlay_position: settings.overlay_position,
      overlay_size: settings.overlay_size,
      birthday_sheet_url: settings.birthday_sheet_url,
      birthday_enabled: settings.birthday_enabled,
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm">מהירות מעבר</Label>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{settings.transition_duration}s</span>
          </div>
          <Slider
            min={1} max={20} step={1}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">גודל גופן פס רץ</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.ticker_font_size}px</span>
          </div>
          <Slider min={12} max={32} step={1} value={[settings.ticker_font_size]} onValueChange={([v]) => setSettings(s => s ? { ...s, ticker_font_size: v } : s)} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">מהירות גלילה</Label>
            <span className="text-xs font-mono text-muted-foreground">{settings.ticker_speed}s</span>
          </div>
          <Slider min={10} max={120} step={5} value={[settings.ticker_speed]} onValueChange={([v]) => setSettings(s => s ? { ...s, ticker_speed: v } : s)} />
          <p className="text-[11px] text-muted-foreground">זמן סיבוב מלא בשניות (נמוך = מהיר יותר).</p>
        </div>
      </div>

      {/* Birthday Google Sheets */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cake className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">חיבור ימי הולדת מ-Google Sheets</span>
          </div>
          <Switch checked={settings.birthday_enabled} onCheckedChange={(v) => setSettings(s => s ? { ...s, birthday_enabled: v } : s)} />
        </div>

        <div className="space-y-1">
          <Label className="text-sm">קישור CSV (פרסום לאינטרנט)</Label>
          <Input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            value={settings.birthday_sheet_url}
            onChange={(e) => setSettings(s => s ? { ...s, birthday_sheet_url: e.target.value } : s)}
            className="h-10 text-sm"
            dir="ltr"
          />
          <p className="text-[11px] text-muted-foreground">הדבק את קישור ה-CSV מ-Google Sheets → קובץ → פרסום לאינטרנט.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchBirthdayNames(settings.birthday_sheet_url)}
            disabled={fetchingBirthdays || !settings.birthday_sheet_url}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingBirthdays ? "animate-spin" : ""}`} />
            רענון ידני
          </Button>
          {birthdayStatus === "success" && (
            <span className="text-xs text-green-600">✓ נתונים נמשכו בהצלחה ({birthdayNames.length} שמות)</span>
          )}
          {birthdayStatus === "error" && (
            <span className="text-xs text-destructive">✗ שגיאה במשיכת נתונים</span>
          )}
        </div>

        {birthdayNames.length > 0 && (
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">תצוגה מקדימה:</p>
            <p className="text-sm" dir="rtl">🎂 {birthdayNames.join(" ● ")}</p>
          </div>
        )}
      </div>

      {/* Graphic Overlay */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">שכבה גרפית</span>
        </div>
        <p className="text-[11px] text-muted-foreground">העלה תמונה (PNG שקוף מומלץ) שתוצג מעל השקופיות.</p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">העלאת תמונה</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 h-10 rounded-md border border-input bg-background px-3 text-sm cursor-pointer hover:bg-accent transition-colors">
                <Upload className="w-4 h-4" />
                <span>{uploading ? "מעלה..." : "בחר תמונה"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleOverlayUpload} disabled={uploading} />
              </label>
            </div>
            {settings.overlay_url && (
              <div className="flex items-center gap-3 mt-2 p-2 rounded-lg bg-muted/50">
                <img src={settings.overlay_url} alt="overlay" className="w-12 h-12 object-contain rounded" />
                <span className="text-xs text-muted-foreground truncate flex-1">תמונה נטענה</span>
                <Button variant="ghost" size="sm" onClick={() => setSettings(s => s ? { ...s, overlay_url: "" } : s)} className="text-xs text-destructive">
                  הסר
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-sm">מיקום</Label>
            <Select value={settings.overlay_position} onValueChange={(v) => setSettings(s => s ? { ...s, overlay_position: v } : s)}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top-right">למעלה מימין</SelectItem>
                <SelectItem value="top-left">למעלה משמאל</SelectItem>
                <SelectItem value="bottom-right">למטה מימין</SelectItem>
                <SelectItem value="bottom-left">למטה משמאל</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">גודל תמונה</Label>
              <span className="text-xs font-mono text-muted-foreground">{settings.overlay_size}px</span>
            </div>
            <Slider min={5} max={100} step={1} value={[settings.overlay_size]} onValueChange={([v]) => setSettings(s => s ? { ...s, overlay_size: v } : s)} />
          </div>
        </div>
      </div>

      {/* Display Calibration */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">כיול תצוגה</span>
        </div>
        <p className="text-[11px] text-muted-foreground">תיקון חיתוך קצוות במסכי טלוויזיה (Overscan).</p>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm">קנה מידה (%)</Label>
            <Input type="number" inputMode="numeric" value={settings.display_scale} onChange={(e) => setSettings(s => s ? { ...s, display_scale: Number(e.target.value) || 100 } : s)} className="h-10 text-sm" min={50} max={100} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">הזזה אופקית (פיקסלים)</Label>
            <Input type="number" inputMode="numeric" value={settings.display_offset_x} onChange={(e) => setSettings(s => s ? { ...s, display_offset_x: Number(e.target.value) || 0 } : s)} className="h-10 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">הזזה אנכית (פיקסלים)</Label>
            <Input type="number" inputMode="numeric" value={settings.display_offset_y} onChange={(e) => setSettings(s => s ? { ...s, display_offset_y: Number(e.target.value) || 0 } : s)} className="h-10 text-sm" />
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירת הגדרות"}
      </Button>
    </div>
  );
}
