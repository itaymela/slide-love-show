import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, ListMusic, Zap, Music2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Playlist = { id: string; name: string; is_active: boolean; created_at: string };

const MAX_PLAYLISTS = 5;

export default function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteOverflowOpen, setDeleteOverflowOpen] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState("");
  const [pendingName, setPendingName] = useState("");
  const navigate = useNavigate();

  const fetchPlaylists = useCallback(async () => {
    const { data } = await supabase.from("playlists").select("*").order("created_at", { ascending: true });
    if (data) setPlaylists(data);
  }, []);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  const handleCreateClick = () => {
    setNewName("");
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;

    if (playlists.length >= MAX_PLAYLISTS) {
      // Need to delete one first
      setPendingName(name);
      // Default to oldest non-active playlist
      const oldest = playlists.find(p => !p.is_active) || playlists[0];
      setPlaylistToDelete(oldest.id);
      setCreateDialogOpen(false);
      setDeleteOverflowOpen(true);
      return;
    }

    await createPlaylist(name);
  };

  const createPlaylist = async (name: string) => {
    const { data, error } = await supabase.from("playlists").insert({ name }).select().single();
    if (error) { toast.error("שגיאה ביצירת פלייליסט"); return; }
    toast.success(`פלייליסט "${name}" נוצר`);
    setCreateDialogOpen(false);
    navigate(`/admin/playlists/${data.id}`);
  };

  const handleOverflowConfirm = async () => {
    if (!playlistToDelete || !pendingName) return;

    const pl = playlists.find(p => p.id === playlistToDelete);
    if (pl?.is_active) {
      toast.error("לא ניתן למחוק את הפלייליסט הפעיל");
      return;
    }

    // Check which image_urls are used by other playlists before deleting slides
    const { data: slidesToDelete } = await supabase.from("slides").select("image_url").eq("playlist_id", playlistToDelete);
    
    // Delete slides records only (files stay in storage for shared references)
    await supabase.from("slides").delete().eq("playlist_id", playlistToDelete);
    await supabase.from("playlists").delete().eq("id", playlistToDelete);

    toast.success(`"${pl?.name}" נמחק`);
    setDeleteOverflowOpen(false);

    // Now create the new one
    await createPlaylist(pendingName);
    fetchPlaylists();
  };

  const activePlaylist = playlists.find(p => p.is_active);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListMusic className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">פלייליסטים</h2>
        </div>
        <span className="text-xs text-muted-foreground">{playlists.length}/{MAX_PLAYLISTS}</span>
      </div>

      {/* Active indicator */}
      {activePlaylist && (
        <div className="flex items-center gap-2 px-4 py-3 bg-primary/10 rounded-xl border border-primary/20">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">פעיל כעת: {activePlaylist.name}</span>
        </div>
      )}

      {/* Playlist list */}
      {playlists.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Music2 className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-sm">אין פלייליסטים עדיין</p>
          <p className="text-xs mt-1">לחץ על + כדי ליצור את הראשון</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => navigate(`/admin/playlists/${pl.id}`)}
              className="w-full text-right bg-card rounded-xl border border-border p-4 flex items-center gap-3 active:scale-[0.98] transition-transform"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                pl.is_active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <ListMusic className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{pl.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {pl.is_active ? "⚡ פעיל" : "לא פעיל"}
                </p>
              </div>
              <span className="text-muted-foreground text-lg">‹</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB + button */}
      <button
        onClick={handleCreateClick}
        className="fixed bottom-20 left-4 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>פלייליסט חדש</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="שם הפלייליסט"
            className="h-12 text-base"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>צור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overflow delete dialog */}
      <Dialog open={deleteOverflowOpen} onOpenChange={setDeleteOverflowOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>הגעת למגבלת {MAX_PLAYLISTS} פלייליסטים</DialogTitle>
            <DialogDescription>
              כדי ליצור פלייליסט חדש, צריך למחוק אחד קיים. בחר איזה פלייליסט למחוק:
            </DialogDescription>
          </DialogHeader>
          <Select value={playlistToDelete} onValueChange={setPlaylistToDelete}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="בחר פלייליסט למחיקה" />
            </SelectTrigger>
            <SelectContent>
              {playlists.filter(p => !p.is_active).map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOverflowOpen(false)}>ביטול</Button>
            <Button variant="destructive" onClick={handleOverflowConfirm} disabled={!playlistToDelete}>
              מחק וצור חדש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
