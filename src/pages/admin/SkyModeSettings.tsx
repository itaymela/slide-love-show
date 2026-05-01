import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Cloud, Zap } from "lucide-react";

export default function SkyModeSettings() {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [interval, setIntervalMin] = useState<number>(30);
  const [duration, setDuration] = useState<number>(20);
  const [namesPerScreen, setNamesPerScreen] = useState<number>(8);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*").limit(1);
    const row = data?.[0] as any;
    if (!row) return;
    setSettingsId(row.id);
    setEnabled(row.sky_mode_enabled ?? false);
    setIntervalMin(row.sky_mode_interval_minutes ?? 30);
    setDuration(row.sky_mode_duration_seconds ?? 20);
    setNamesPerScreen(row.sky_mode_names_per_screen ?? 8);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const update = async (patch: Record<string, any>) => {
    if (!settingsId) return;
    await supabase.from("settings").update(patch as any).eq("id", settingsId);
  };

  const onToggle = async (val: boolean) => {
    setEnabled(val);
    await update({ sky_mode_enabled: val });
    toast.success(val ? "מצב שמיים הופעל" : "מצב שמיים כובה");
  };

  const onIntervalBlur = async () => {
    const v = Math.max(1, Math.floor(Number(interval) || 1));
    setIntervalMin(v);
    await update({ sky_mode_interval_minutes: v });
  };
  const onDurationBlur = async () => {
    const v = Math.max(3, Math.floor(Number(duration) || 3));
    setDuration(v);
    await update({ sky_mode_duration_seconds: v });
  };
  const onNamesBlur = async () => {
    const v = Math.max(1, Math.floor(Number(namesPerScreen) || 1));
    setNamesPerScreen(v);
    await update({ sky_mode_names_per_screen: v });
  };

  const triggerNow = async () => {
    if (!settingsId) return;
    const { data } = await supabase
      .from("settings")
      .select("sky_mode_manual_trigger")
      .eq("id", settingsId)
      .limit(1);
    const cur = ((data?.[0] as any)?.sky_mode_manual_trigger ?? 0) as number;
    await update({ sky_mode_manual_trigger: cur + 1 });
    toast.success("מצב שמיים מופעל עכשיו במסך");
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            <Label className="text-base font-medium">הפעל מצב שמיים</Label>
          </div>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          מציג שמות תלמידים כבועות צפות על רקע שמיים, לפי שעון פנימי או הפעלה ידנית.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm">תדירות הופעה (דקות)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={interval}
            onChange={(e) => setIntervalMin(Number(e.target.value))}
            onBlur={onIntervalBlur}
          />
          <p className="text-xs text-muted-foreground">כל כמה דקות המסך יעבור אוטומטית למצב שמיים.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">משך התצוגה (שניות)</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={3}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            onBlur={onDurationBlur}
          />
          <p className="text-xs text-muted-foreground">כמה זמן הבועות נשארות על המסך לפני חזרה למצגת.</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">מספר שמות בכל הופעה</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={namesPerScreen}
            onChange={(e) => setNamesPerScreen(Number(e.target.value))}
            onBlur={onNamesBlur}
          />
          <p className="text-xs text-muted-foreground">כמה תלמידים מופיעים יחד. השאר ייכנסו ברוטציה בהופעה הבאה.</p>
        </div>
      </div>

      <Button onClick={triggerNow} className="w-full gap-2 h-12 text-base" size="lg">
        <Zap className="w-5 h-5" />
        הפעל מצב שמיים עכשיו
      </Button>
    </div>
  );
}