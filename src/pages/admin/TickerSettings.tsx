import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Type } from "lucide-react";

export default function TickerSettings() {
  const [id, setId] = useState("");
  const [tickerText, setTickerText] = useState("");
  const [tickerEnabled, setTickerEnabled] = useState(false);
  const [tickerFontSize, setTickerFontSize] = useState(14);
  const [tickerSpeed, setTickerSpeed] = useState(30);
  const [tickerOffsetY, setTickerOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, ticker_text, ticker_enabled, ticker_font_size, ticker_speed, ticker_offset_y").limit(1);
    if (data?.[0]) {
      const r = data[0] as any;
      setId(r.id);
      setTickerText(r.ticker_text);
      setTickerEnabled(r.ticker_enabled);
      setTickerFontSize(r.ticker_font_size);
      setTickerSpeed(r.ticker_speed);
      setTickerOffsetY(r.ticker_offset_y ?? 0);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    setSaving(true);
    await supabase.from("settings").update({
      ticker_text: tickerText,
      ticker_enabled: tickerEnabled,
      ticker_font_size: tickerFontSize,
      ticker_speed: tickerSpeed,
      ticker_offset_y: tickerOffsetY,
    } as any).eq("id", id);
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

        <div className="space-y-2">
          <Label className="text-sm">גודל גופן (px)</Label>
          <Input type="number" inputMode="numeric" min={12} max={32} step={1} value={tickerFontSize} onChange={(e) => setTickerFontSize(Number(e.target.value) || 14)} className="h-12 text-base" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">מהירות גלילה (שניות לסיבוב מלא)</Label>
          <Input type="number" inputMode="numeric" min={10} max={120} step={5} value={tickerSpeed} onChange={(e) => setTickerSpeed(Number(e.target.value) || 30)} className="h-12 text-base" />
          <p className="text-xs text-muted-foreground">נמוך = מהיר יותר.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">הזזה אנכית (פיקסלים)</Label>
          <Input type="number" inputMode="numeric" value={tickerOffsetY} onChange={(e) => setTickerOffsetY(Number(e.target.value))} className="h-12 text-base" />
          <p className="text-xs text-muted-foreground">ערך שלילי מעלה את הפס למעלה.</p>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירה"}
      </Button>
    </div>
  );
}
