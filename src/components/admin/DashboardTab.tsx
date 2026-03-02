import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Monitor, Wifi, WifiOff, Zap, ShieldOff, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Playlist = { id: string; name: string; is_active: boolean };
type Heartbeat = { last_seen: string; current_slide_url: string; current_slide_index: number };
type Settings = { manual_override: boolean };

export default function DashboardTab() {
  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: playlists }, { data: hb }, { data: settings }] = await Promise.all([
      supabase.from("playlists").select("*").eq("is_active", true).limit(1),
      supabase.from("display_heartbeat").select("*").limit(1),
      supabase.from("settings").select("manual_override").limit(1),
    ]);
    if (playlists?.[0]) setActivePlaylist(playlists[0]);
    if (hb?.[0]) {
      setHeartbeat(hb[0] as Heartbeat);
      const lastSeen = new Date(hb[0].last_seen).getTime();
      setIsLive(Date.now() - lastSeen < 30000);
    }
    if (settings?.[0]) setManualOverride(settings[0].manual_override);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Poll heartbeat status every 10s
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Realtime for heartbeat
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-heartbeat")
      .on("postgres_changes", { event: "*", schema: "public", table: "display_heartbeat" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const toggleOverride = async (val: boolean) => {
    setManualOverride(val);
    const { data: rows } = await supabase.from("settings").select("id").limit(1);
    if (rows?.[0]) {
      await supabase.from("settings").update({ manual_override: val }).eq("id", rows[0].id);
    }
    toast.success(val ? "Automation paused" : "Automation resumed");
  };

  return (
    <div className="space-y-4">
      {/* TV Status */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <Monitor className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">TV Status</span>
          <span className={`ml-auto flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            isLive ? "bg-accent/15 text-accent" : "bg-destructive/15 text-destructive"
          }`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? "Live" : "Offline"}
          </span>
        </div>
        {heartbeat && isLive && heartbeat.current_slide_url && (
          <div className="rounded-lg overflow-hidden bg-muted aspect-video max-w-[200px]">
            {heartbeat.current_slide_url.match(/\.(mp4|webm|ogg|mov)/) ? (
              <video src={heartbeat.current_slide_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <img src={heartbeat.current_slide_url} alt="Now playing" className="w-full h-full object-cover" />
            )}
          </div>
        )}
        {!isLive && (
          <p className="text-xs text-muted-foreground">No heartbeat received in the last 30 seconds.</p>
        )}
      </div>

      {/* Now Playing */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm">Now Playing</span>
        </div>
        {activePlaylist ? (
          <p className="text-sm text-muted-foreground">
            Active playlist: <span className="text-foreground font-medium">{activePlaylist.name}</span>
            {heartbeat && isLive && ` — Slide #${(heartbeat.current_slide_index || 0) + 1}`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No active playlist set.</p>
        )}
      </div>

      {/* Manual Override */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {manualOverride ? <ShieldOff className="w-4 h-4 text-destructive" /> : <Shield className="w-4 h-4 text-accent" />}
            <Label className="text-sm font-medium">Manual Override</Label>
          </div>
          <Switch checked={manualOverride} onCheckedChange={toggleOverride} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {manualOverride ? "Automation is paused. Time macros will not trigger." : "Automation is active. Time macros will run."}
        </p>
      </div>
    </div>
  );
}
