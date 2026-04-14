import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Monitor, ImageIcon } from "lucide-react";

export default function CalibrationSettings() {
  const [id, setId] = useState("");
  const [scale, setScale] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [globalObjectFit, setGlobalObjectFit] = useState("contain");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, display_scale, display_offset_x, display_offset_y, global_object_fit").limit(1);
    if (data?.[0]) {
      const r = data[0] as any;
      setId(r.id);
      setScale(r.display_scale);
      setOffsetX(r.display_offset_x);
      setOffsetY(r.display_offset_y);
      setGlobalObjectFit(r.global_object_fit || "contain");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    setSaving(true);
    await supabase.from("settings").update({
      display_scale: scale,
      display_offset_x: offsetX,
      display_offset_y: offsetY,
      global_object_fit: globalObjectFit,
    } as any).eq("id", id);
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
          <Input type="number" inputMode="decimal" step="0.1" value={scale} onChange={(e) => setScale(Number(e.target.value) || 100)} className="h-12 text-base" min={50} max={100} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">הזזה אופקית (פיקסלים)</Label>
          <Input type="number" inputMode="numeric" value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} className="h-12 text-base" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">הזזה אנכית (פיקסלים)</Label>
          <Input type="number" inputMode="numeric" value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} className="h-12 text-base" />
        </div>
      </div>

      {/* Global Object Fit */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <Label className="text-sm font-semibold">סקילת מדיה גלובלית</Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">התאם</span>
            <Switch checked={globalObjectFit === "cover"} onCheckedChange={(checked) => setGlobalObjectFit(checked ? "cover" : "contain")} />
            <span className="text-xs text-muted-foreground">מלא</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">חל על כל הפלייליסטים והתמונה הבודדת.</p>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירה"}
      </Button>
    </div>
  );
}
