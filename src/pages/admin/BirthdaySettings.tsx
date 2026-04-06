import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Cake, RefreshCw } from "lucide-react";

export default function BirthdaySettings() {
  const [id, setId] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [names, setNames] = useState<string[]>([]);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, birthday_sheet_url, birthday_enabled").limit(1);
    if (data?.[0]) {
      setId(data[0].id);
      setSheetUrl(data[0].birthday_sheet_url);
      setEnabled(data[0].birthday_enabled);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const fetchNames = async (url: string) => {
    if (!url) { setNames([]); setStatus("idle"); return; }
    setFetching(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const rows = text.split("\n").slice(1);
      const parsed = rows
        .map(row => (row.split(",")[4] || "").replace(/^"|"$/g, "").trim())
        .filter(Boolean);
      setNames(parsed);
      setStatus("success");
    } catch {
      setNames([]);
      setStatus("error");
    }
    setFetching(false);
  };

  useEffect(() => {
    if (enabled && sheetUrl) fetchNames(sheetUrl);
  }, [enabled, sheetUrl]);

  const save = async () => {
    setSaving(true);
    await supabase.from("settings").update({
      birthday_sheet_url: sheetUrl,
      birthday_enabled: enabled,
    }).eq("id", id);
    setSaving(false);
    toast.success("הגדרות ימי הולדת נשמרו");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cake className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold">ימי הולדת מ-Google Sheets</span>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">קישור CSV (פרסום לאינטרנט)</Label>
          <Input
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            className="h-12 text-sm"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">הדבק את קישור ה-CSV מ-Google Sheets → קובץ → פרסום לאינטרנט.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="default"
            onClick={() => fetchNames(sheetUrl)}
            disabled={fetching || !sheetUrl}
            className="gap-2 h-10"
          >
            <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
            רענון ידני
          </Button>
          {status === "success" && (
            <span className="text-xs text-green-600">✓ {names.length} שמות נמצאו</span>
          )}
          {status === "error" && (
            <span className="text-xs text-destructive">✗ שגיאה במשיכת נתונים</span>
          )}
        </div>

        {names.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1.5">תצוגה מקדימה:</p>
            <p className="text-sm leading-relaxed" dir="rtl">🎂 {names.join(" ● ")}</p>
          </div>
        )}
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירה"}
      </Button>
    </div>
  );
}
