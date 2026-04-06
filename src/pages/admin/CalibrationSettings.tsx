import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Monitor } from "lucide-react";

export default function CalibrationSettings() {
  const [id, setId] = useState("");
  const [scale, setScale] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, display_scale, display_offset_x, display_offset_y").limit(1);
    if (data?.[0]) {
      setId(data[0].id);
      setScale(data[0].display_scale);
      setOffsetX(data[0].display_offset_x);
      setOffsetY(data[0].display_offset_y);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const save = async () => {
    setSaving(true);
    await supabase.from("settings").update({
      display_scale: scale,
      display_offset_x: offsetX,
      display_offset_y: offsetY,
    }).eq("id", id);
    setSaving(false);
    toast.success("הגדרות כיול תצוגה נשמרו");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <span className="text-base font-semibold">כיול תצוגה</span>
        </div>
        <p className="text-xs text-muted-foreground">תיקון חיתוך קצוות במסכי טלוויזיה (Overscan).</p>

        <div className="space-y-2">
          <Label className="text-sm">קנה מידה (%)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value) || 100)}
            className="h-12 text-base"
            min={50}
            max={100}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">הזזה אופקית (פיקסלים)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={offsetX}
            onChange={(e) => setOffsetX(Number(e.target.value) || 0)}
            className="h-12 text-base"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">הזזה אנכית (פיקסלים)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={offsetY}
            onChange={(e) => setOffsetY(Number(e.target.value) || 0)}
            className="h-12 text-base"
          />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירה"}
      </Button>
    </div>
  );
}
