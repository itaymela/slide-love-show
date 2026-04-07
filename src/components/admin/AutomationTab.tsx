import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Zap, CalendarDays, ShieldOff, Shield } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Playlist = { id: string; name: string; is_active: boolean };
type Macro = { id: string; trigger_time: string; trigger_date: string | null; target_playlist_id: string; is_enabled: boolean };

export default function AutomationTab() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newTime, setNewTime] = useState("08:00");
  const [newDate, setNewDate] = useState("");
  const [newTargetId, setNewTargetId] = useState("");
  const [manualOverride, setManualOverride] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("macros").select("*").order("trigger_time", { ascending: true }),
      supabase.from("playlists").select("*").order("created_at", { ascending: true }),
    ]);
    if (m) setMacros(m as Macro[]);
    if (p) {
      setPlaylists(p);
      if (!newTargetId && p.length > 0) setNewTargetId(p[0].id);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addMacro = async () => {
    if (!newTargetId) return;
    const insertData: any = { trigger_time: newTime, target_playlist_id: newTargetId };
    if (newDate) insertData.trigger_date = newDate;
    const { data, error } = await supabase.from("macros").insert(insertData).select().single();
    if (error) { toast.error("שגיאה בהוספת מאקרו"); return; }
    setMacros(prev => [...prev, data as Macro].sort((a, b) => a.trigger_time.localeCompare(b.trigger_time)));
    setNewDate("");
    toast.success("מאקרו נוסף");
  };

  const deleteMacro = async (id: string) => {
    await supabase.from("macros").delete().eq("id", id);
    setMacros(prev => prev.filter(m => m.id !== id));
    toast.success("מאקרו נמחק");
  };

  const toggleMacro = async (id: string, enabled: boolean) => {
    await supabase.from("macros").update({ is_enabled: enabled }).eq("id", id);
    setMacros(prev => prev.map(m => m.id === id ? { ...m, is_enabled: enabled } : m));
  };

  const getPlaylistName = (id: string) => playlists.find(p => p.id === id)?.name || "לא ידוע";

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-5">
      <div className="bg-card rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">מאקרואים מתוזמנים</span>
        </div>
        <p className="text-xs text-muted-foreground">
          תזמון החלפת פלייליסט אוטומטית. ניתן להשבית דרך "עקיפה ידנית" בלוח הבקרה.
        </p>

        {/* Add new macro - vertical stacked layout */}
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">שעה</span>
            <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="h-10 text-sm w-full" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">תאריך (אופציונלי)</span>
            <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="h-10 text-sm w-full" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">החלף לפלייליסט</span>
            <Select value={newTargetId} onValueChange={setNewTargetId}>
              <SelectTrigger className="h-10 text-sm w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {playlists.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full h-10 gap-1" onClick={addMacro}>
            <Plus className="w-4 h-4" /> הוסף מאקרו
          </Button>
        </div>
      </div>

      {/* Macro list */}
      {macros.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">אין מאקרואים עדיין. הוסף אחד למעלה.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {macros.map(macro => (
            <div key={macro.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
              <p className="text-sm font-medium">
                בשעה <span className="font-bold text-primary">{macro.trigger_time}</span>
                {macro.trigger_date && (
                  <span className="text-muted-foreground"> ({formatDate(macro.trigger_date)})</span>
                )}
                {" "}החלף ל-<span className="font-semibold">{getPlaylistName(macro.target_playlist_id)}</span>
              </p>
              <div className="flex items-center justify-between">
                <Switch checked={macro.is_enabled} onCheckedChange={(v) => toggleMacro(macro.id, v)} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMacro(macro.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
