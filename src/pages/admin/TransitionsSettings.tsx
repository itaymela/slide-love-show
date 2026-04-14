import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Sparkles, Timer } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function TransitionsSettings() {
  const [id, setId] = useState("");
  const [transitionType, setTransitionType] = useState("fade");
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, transition_type, transition_duration").limit(1);
    if (data?.[0]) {
      setId(data[0].id);
      setTransitionType(data[0].transition_type);
      setTransitionDuration(data[0].transition_duration);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    setSaving(true);
    await supabase.from("settings").update({ transition_type: transitionType, transition_duration: transitionDuration }).eq("id", id);
    setSaving(false);
    toast.success("הגדרות מעבר נשמרו");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-base font-semibold">סגנון מעבר</span>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">סוג מעבר</Label>
          <Select value={transitionType} onValueChange={setTransitionType}>
            <SelectTrigger className="h-12 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fade">עמעום (Cross-dissolve)</SelectItem>
              <SelectItem value="cut">קטיעה (מיידי)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm">מהירות מעבר (שניות)</Label>
          </div>
          <Input type="number" inputMode="decimal" step="0.1" min={0.1} max={2.0} value={transitionDuration} onChange={(e) => setTransitionDuration(Number(e.target.value) || 0.5)} className="h-12 text-base" />
          <p className="text-xs text-muted-foreground">0.1 – 2.0 שניות. חל רק על סגנון "עמעום".</p>
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירה"}
      </Button>
    </div>
  );
}
