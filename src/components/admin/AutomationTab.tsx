import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Clock, Zap } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Playlist = { id: string; name: string; is_active: boolean };
type Macro = { id: string; trigger_time: string; target_playlist_id: string; is_enabled: boolean };

export default function AutomationTab() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newTime, setNewTime] = useState("08:00");
  const [newTargetId, setNewTargetId] = useState("");

  const fetchData = useCallback(async () => {
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from("macros").select("*").order("trigger_time", { ascending: true }),
      supabase.from("playlists").select("*").order("created_at", { ascending: true }),
    ]);
    if (m) setMacros(m);
    if (p) {
      setPlaylists(p);
      if (!newTargetId && p.length > 0) setNewTargetId(p[0].id);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addMacro = async () => {
    if (!newTargetId) return;
    const { data, error } = await supabase.from("macros").insert({ trigger_time: newTime, target_playlist_id: newTargetId }).select().single();
    if (error) { toast.error("Failed to add macro"); return; }
    setMacros(prev => [...prev, data].sort((a, b) => a.trigger_time.localeCompare(b.trigger_time)));
    toast.success("Macro added");
  };

  const deleteMacro = async (id: string) => {
    await supabase.from("macros").delete().eq("id", id);
    setMacros(prev => prev.filter(m => m.id !== id));
    toast.success("Macro deleted");
  };

  const toggleMacro = async (id: string, enabled: boolean) => {
    await supabase.from("macros").update({ is_enabled: enabled }).eq("id", id);
    setMacros(prev => prev.map(m => m.id === id ? { ...m, is_enabled: enabled } : m));
  };

  const getPlaylistName = (id: string) => playlists.find(p => p.id === id)?.name || "Unknown";

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Time Macros</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Schedule automatic playlist switches at specific times. Disable via "Manual Override" on Dashboard.
        </p>

        {/* Add new macro */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Time</span>
            <Input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Switch to</span>
            <Select value={newTargetId} onValueChange={setNewTargetId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {playlists.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" className="h-9 gap-1 shrink-0" onClick={addMacro}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      {/* Macro list */}
      {macros.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No macros yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {macros.map(macro => (
            <div key={macro.id} className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  At <span className="font-bold text-primary">{macro.trigger_time}</span>, switch to{" "}
                  <span className="font-semibold">{getPlaylistName(macro.target_playlist_id)}</span>
                </p>
              </div>
              <Switch checked={macro.is_enabled} onCheckedChange={(v) => toggleMacro(macro.id, v)} />
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMacro(macro.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
