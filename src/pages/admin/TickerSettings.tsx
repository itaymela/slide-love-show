import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Type } from "lucide-react";

export default function TickerSettings() {
  const [id, setId] = useState("");
  const [tickerText, setTickerText] = useState("");
  const [tickerEnabled, setTickerEnabled] = useState(false);
  const [tickerFontSize, setTickerFontSize] = useState(14);
  const [tickerSpeed, setTickerSpeed] = useState(30);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, ticker_text, ticker_enabled, ticker_font_size, ticker_speed").limit(1);
    if (data?.[0]) {
      setId(data[0].id);
      setTickerText(data[0].ticker_text);
      setTickerEnabled(data[0].ticker_enabled);
      setTickerFontSize(data[0].ticker_font_size);
      setTickerSpeed(data[0].ticker_speed);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async () => {
    setSaving(true);
    await supabase.from("settings").update({
      ticker_text: tickerText,
      ticker_enabled: tickerEnabled,
      ticker_font_size: tickerFontSize,
      ticker_speed: tickerSpeed,
    }).eq("id", id);
    setSaving(false);
    toast.success("הגדרות פס רץ נשמרו");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-primary" />
            <span className="text-base font-semibold">פס רץ</span>
          </div>
          <Switch checked={tickerEnabled} onCheckedChange={setTickerEnabled} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">טקסט</Label>
          <Textarea
            placeholder="הכנס טקסט לפס רץ…&#10;שורה חדשה = נקודה מפרידה ●"
            value={tickerText}
            onChange={(e) => setTickerText(e.target.value)}
            className="text-sm min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground">שורות חדשות (Enter) יוצגו כ- " ● " בפס הרץ.</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">גודל גופן</Label>
            <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{tickerFontSize}px</span>
          </div>
          <Slider min={12} max={32} step={1} value={[tickerFontSize]} onValueChange={([v]) => setTickerFontSize(v)} className="py-2" />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">מהירות גלילה</Label>
            <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{tickerSpeed}s</span>
          </div>
          <Slider min={10} max={120} step={5} value={[tickerSpeed]} onValueChange={([v]) => setTickerSpeed(v)} className="py-2" />
          <p className="text-xs text-muted-foreground">זמן סיבוב מלא בשניות (נמוך = מהיר יותר).</p>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירה"}
      </Button>
    </div>
  );
}
