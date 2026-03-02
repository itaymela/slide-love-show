import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload, ArrowUp, ArrowDown, Trash2, Save,
  Image as ImageIcon, Plus, Check, List, Film,
  Pencil, Copy, MoreVertical, ArrowRightLeft,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Playlist = { id: string; name: string; is_active: boolean; created_at: string };
type Slide = { id: string; image_url: string; duration: number; sort_order: number; object_fit: string; playlist_id: string; media_type: string };

const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov"];
function isVideoFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return VIDEO_EXTENSIONS.includes(ext);
}
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { window.URL.revokeObjectURL(video.src); resolve(Math.ceil(video.duration)); };
    video.onerror = () => resolve(5);
    video.src = URL.createObjectURL(file);
  });
}

export default function PlaylistsTab() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalObjectFit, setGlobalObjectFit] = useState<"contain" | "cover">("contain");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamePlaylistId, setRenamePlaylistId] = useState("");
  const [renameValue, setRenameValue] = useState("");

  const fetchPlaylists = useCallback(async () => {
    const { data } = await supabase.from("playlists").select("*").order("created_at", { ascending: true });
    if (data) {
      setPlaylists(data);
      if (!selectedPlaylistId && data.length > 0) {
        const active = data.find((p) => p.is_active);
        setSelectedPlaylistId(active?.id || data[0].id);
      }
    }
  }, [selectedPlaylistId]);

  const fetchSlides = useCallback(async () => {
    if (!selectedPlaylistId) return;
    const { data } = await supabase.from("slides").select("*").eq("playlist_id", selectedPlaylistId).order("sort_order", { ascending: true });
    setSlides(data || []);
    if (data && data.length > 0) setGlobalObjectFit(data[0].object_fit as "contain" | "cover");
  }, [selectedPlaylistId]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);
  useEffect(() => { fetchSlides(); }, [fetchSlides]);

  const createPlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const { data, error } = await supabase.from("playlists").insert({ name }).select().single();
    if (error) { toast.error("שגיאה ביצירת פלייליסט"); return; }
    setPlaylists((prev) => [...prev, data]);
    setSelectedPlaylistId(data.id);
    setNewPlaylistName("");
    toast.success(`פלייליסט "${name}" נוצר`);
  };

  const setActivePlaylist = async (id: string) => {
    const { error } = await supabase.rpc("set_active_playlist", { playlist_id: id });
    if (error) { toast.error("שגיאה בהגדרת פלייליסט פעיל"); return; }
    setPlaylists((prev) => prev.map((p) => ({ ...p, is_active: p.id === id })));
    toast.success("פלייליסט פעיל עודכן");
  };

  const openRenameDialog = (playlist: Playlist) => {
    setRenamePlaylistId(playlist.id);
    setRenameValue(playlist.name);
    setRenameDialogOpen(true);
  };

  const confirmRename = async () => {
    const name = renameValue.trim();
    if (!name) return;
    const { error } = await supabase.from("playlists").update({ name }).eq("id", renamePlaylistId);
    if (error) { toast.error("שגיאה בשינוי שם"); return; }
    setPlaylists((prev) => prev.map((p) => (p.id === renamePlaylistId ? { ...p, name } : p)));
    setRenameDialogOpen(false);
    toast.success("שם הפלייליסט שונה");
  };

  const duplicatePlaylist = async (sourceId: string) => {
    const source = playlists.find((p) => p.id === sourceId);
    if (!source) return;
    const { data: newPl, error } = await supabase.from("playlists").insert({ name: `${source.name} (עותק)` }).select().single();
    if (error || !newPl) { toast.error("שגיאה בשכפול"); return; }
    const { data: sourceSlides } = await supabase.from("slides").select("*").eq("playlist_id", sourceId).order("sort_order", { ascending: true });
    if (sourceSlides && sourceSlides.length > 0) {
      const copies = sourceSlides.map((s) => ({ image_url: s.image_url, duration: s.duration, sort_order: s.sort_order, object_fit: s.object_fit, media_type: s.media_type, playlist_id: newPl.id }));
      await supabase.from("slides").insert(copies);
    }
    setPlaylists((prev) => [...prev, newPl]);
    setSelectedPlaylistId(newPl.id);
    toast.success(`שוכפל כ-"${newPl.name}"`);
  };

  const deletePlaylist = async (id: string) => {
    const pl = playlists.find(p => p.id === id);
    if (pl?.is_active) { toast.error("לא ניתן למחוק את הפלייליסט הפעיל"); return; }
    await supabase.from("slides").delete().eq("playlist_id", id);
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) { toast.error("שגיאה במחיקה"); return; }
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (selectedPlaylistId === id) {
      const remaining = playlists.filter(p => p.id !== id);
      setSelectedPlaylistId(remaining[0]?.id || "");
    }
    toast.success(`"${pl?.name}" נמחק`);
  };

  const copySlideToPlaylist = async (slide: Slide, targetPlaylistId: string) => {
    const { data: targetSlides } = await supabase.from("slides").select("sort_order").eq("playlist_id", targetPlaylistId).order("sort_order", { ascending: false }).limit(1);
    const nextOrder = (targetSlides?.[0]?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("slides").insert({ image_url: slide.image_url, duration: slide.duration, sort_order: nextOrder, object_fit: slide.object_fit, media_type: slide.media_type, playlist_id: targetPlaylistId });
    if (error) { toast.error("שגיאה בהעתקה"); return; }
    const target = playlists.find((p) => p.id === targetPlaylistId);
    toast.success(`הועתק ל-"${target?.name}"`);
  };

  const moveSlideToPlaylist = async (slide: Slide, targetPlaylistId: string) => {
    const { error } = await supabase.from("slides").update({ playlist_id: targetPlaylistId }).eq("id", slide.id);
    if (error) { toast.error("שגיאה בהעברה"); return; }
    setSlides((prev) => prev.filter((s) => s.id !== slide.id));
    const target = playlists.find((p) => p.id === targetPlaylistId);
    toast.success(`הועבר ל-"${target?.name}"`);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedPlaylistId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const mediaType = isVideoFile(file.name) ? "video" : "image";
        const { error: uploadError } = await supabase.storage.from("images").upload(fileName, file);
        if (uploadError) { toast.error(`העלאה נכשלה: ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        let duration = 5;
        if (mediaType === "video") duration = await getVideoDuration(file);
        const { data, error } = await supabase.from("slides").insert({ image_url: urlData.publicUrl, duration, sort_order: slides.length + 1, object_fit: globalObjectFit, playlist_id: selectedPlaylistId, media_type: mediaType }).select().single();
        if (error) toast.error("שגיאה בשמירת שקף");
        else if (data) setSlides((prev) => [...prev, data]);
      }
      toast.success("מדיה הועלתה!");
    } finally { setUploading(false); e.target.value = ""; }
  };

  const moveSlide = (index: number, direction: "up" | "down") => {
    const newSlides = [...slides];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newSlides.length) return;
    [newSlides[index], newSlides[swapIdx]] = [newSlides[swapIdx], newSlides[index]];
    newSlides.forEach((s, i) => (s.sort_order = i));
    setSlides(newSlides);
  };

  const updateDuration = (index: number, duration: number) => {
    setSlides((prev) => prev.map((s, i) => (i === index ? { ...s, duration } : s)));
  };

  const deleteSlide = async (index: number) => {
    const slide = slides[index];
    const { error } = await supabase.from("slides").delete().eq("id", slide.id);
    if (error) { toast.error("מחיקה נכשלה"); return; }
    setSlides((prev) => prev.filter((_, i) => i !== index));
    toast.success("שקף הוסר");
  };

  const handleSync = async () => {
    setSaving(true);
    try {
      for (const [i, s] of slides.entries()) {
        const { error } = await supabase.from("slides").update({ duration: s.duration, sort_order: i, object_fit: globalObjectFit }).eq("id", s.id);
        if (error) throw error;
      }
      toast.success("שוקפים סונכרנו לתצוגה!");
    } catch { toast.error("סנכרון נכשל"); }
    finally { setSaving(false); }
  };

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const isSelectedActive = selectedPlaylist?.is_active;
  const otherPlaylists = playlists.filter((p) => p.id !== selectedPlaylistId);

  return (
    <div className="space-y-4 pb-20">
      {/* Playlist Management */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <List className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">פלייליסטים</span>
          {playlists.find(p => p.is_active) && (
            <span className="mr-auto text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              פעיל: {playlists.find(p => p.is_active)?.name}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Input placeholder="שם פלייליסט חדש…" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createPlaylist()} className="h-9 text-sm" />
          <Button size="sm" className="h-9 gap-1 shrink-0" onClick={createPlaylist} disabled={!newPlaylistName.trim()}>
            <Plus className="w-3.5 h-3.5" /> הוסף
          </Button>
        </div>
        {playlists.length > 0 && (
          <div className="flex gap-2 items-center">
            <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
              <SelectTrigger className="h-9 text-sm flex-1"><SelectValue placeholder="בחר פלייליסט" /></SelectTrigger>
              <SelectContent>
                {playlists.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} {p.is_active ? "⚡" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0"><MoreVertical className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => { const pl = playlists.find((p) => p.id === selectedPlaylistId); if (pl) openRenameDialog(pl); }}>
                  <Pencil className="w-4 h-4 ml-2" /> שינוי שם
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicatePlaylist(selectedPlaylistId)}>
                  <Copy className="w-4 h-4 ml-2" /> שכפול
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deletePlaylist(selectedPlaylistId)}>
                  <Trash2 className="w-4 h-4 ml-2" /> מחיקה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" className="h-9 gap-1 shrink-0" variant={isSelectedActive ? "secondary" : "default"} disabled={isSelectedActive} onClick={() => setActivePlaylist(selectedPlaylistId)}>
              <Check className="w-3.5 h-3.5" /> {isSelectedActive ? "פעיל" : "הפעל"}
            </Button>
          </div>
        )}
      </div>

      {/* Upload */}
      <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
        <Upload className="w-8 h-8 text-primary" />
        <span className="text-sm font-medium text-primary">{uploading ? "מעלה..." : "לחץ להעלאת תמונות או סרטונים"}</span>
        <span className="text-[10px] text-muted-foreground">JPG, PNG, MP4, WEBM</span>
        <input type="file" accept="image/*,video/mp4,video/webm,video/ogg" multiple onChange={handleUpload} disabled={uploading || !selectedPlaylistId} className="hidden" />
      </label>

      {/* Object fit toggle */}
      <div className="flex items-center justify-between bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-muted-foreground" />
          <Label className="text-sm font-medium">סקילת מדיה</Label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">התאם</span>
          <Switch checked={globalObjectFit === "cover"} onCheckedChange={(checked) => setGlobalObjectFit(checked ? "cover" : "contain")} />
          <span className="text-xs text-muted-foreground">מלא</span>
        </div>
      </div>

      {/* Slides grid */}
      {slides.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">אין שקפים עדיין. העלה מדיה כדי להתחיל.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {slides.map((slide, index) => (
            <div key={slide.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="aspect-video bg-muted relative">
                {slide.media_type === "video" ? (
                  <video src={slide.image_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={slide.image_url} alt={`שקף ${index + 1}`} className="w-full h-full object-cover" />
                )}
                <span className="absolute top-1.5 right-1.5 bg-foreground/70 text-background text-[10px] font-bold px-1.5 py-0.5 rounded-md">#{index + 1}</span>
                {slide.media_type === "video" && (
                  <span className="absolute top-1.5 left-1.5 bg-primary/80 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                    <Film className="w-3 h-3" /> וידאו
                  </span>
                )}
              </div>
              <div className="p-2.5 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Input type="number" inputMode="numeric" min={1} max={300} value={slide.duration} onChange={(e) => updateDuration(index, parseInt(e.target.value) || 5)} className="h-10 text-base text-center font-semibold" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">שניות</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSlide(index, "up")} disabled={index === 0}><ArrowUp className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSlide(index, "down")} disabled={index === slides.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                  <div className="flex-1" />
                  {otherPlaylists.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger><Copy className="w-4 h-4 ml-2" /> העתק ל…</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {otherPlaylists.map((p) => (
                              <DropdownMenuItem key={p.id} onClick={() => copySlideToPlaylist(slide, p.id)}>{p.name} {p.is_active ? "⚡" : ""}</DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger><ArrowRightLeft className="w-4 h-4 ml-2" /> העבר ל…</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {otherPlaylists.map((p) => (
                              <DropdownMenuItem key={p.id} onClick={() => moveSlideToPlaylist(slide, p.id)}>{p.name} {p.is_active ? "⚡" : ""}</DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteSlide(index)}>
                          <Trash2 className="w-4 h-4 ml-2" /> מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteSlide(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky sync button */}
      {slides.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border z-40">
          <Button onClick={handleSync} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
            <Save className="w-5 h-5" /> {saving ? "מסנכרן..." : "סנכרן לתצוגה"}
          </Button>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>שינוי שם פלייליסט</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmRename()} className="h-10" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>ביטול</Button>
            <Button onClick={confirmRename} disabled={!renameValue.trim()}>שמירה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
