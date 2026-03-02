import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Type, Sparkles } from "lucide-react";
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
};

export default function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*").limit(1);
    if (data?.[0]) setSettings(data[0] as Settings);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from("settings").update({
      ticker_text: settings.ticker_text,
      ticker_enabled: settings.ticker_enabled,
      transition_type: settings.transition_type,
    }).eq("id", settings.id);
    setSaving(false);
    if (error) { toast.error("Failed to save settings"); return; }
    toast.success("Settings saved — display will update automatically");
  };

  if (!settings) return null;

  return (
    <div className="space-y-4">
      {/* Transition Type */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Transition Style</span>
        </div>
        <Select value={settings.transition_type} onValueChange={(v) => setSettings(s => s ? { ...s, transition_type: v } : s)}>
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fade">Fade (Cross-dissolve)</SelectItem>
            <SelectItem value="cut">Cut (Instant switch)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* News Ticker */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">News Ticker</span>
          </div>
          <Switch checked={settings.ticker_enabled} onCheckedChange={(v) => setSettings(s => s ? { ...s, ticker_enabled: v } : s)} />
        </div>
        <Textarea
          placeholder="Enter ticker text…"
          value={settings.ticker_text}
          onChange={(e) => setSettings(s => s ? { ...s, ticker_text: e.target.value } : s)}
          className="text-sm min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground">This will scroll at the bottom of the display screen.</p>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
