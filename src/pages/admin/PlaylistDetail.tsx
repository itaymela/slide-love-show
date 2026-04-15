import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload, ArrowUp, ArrowDown, Trash2, Save,
  Image as ImageIcon, Check, Film, Pencil, Copy,
  MoreVertical, ArrowRightLeft, Repeat, Play,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Playlist = { id: string; name: string; is_active: boolean; created_at: string; play_mode: string };
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
    video.onloadedmetadata = () => { window.URL.revokeObjectURL(video.src); resolve(Math.round(video.duration * 10) / 10); };
    video.onerror = () => resolve(5);
    video.src = URL.createObjectURL(file);
  });
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [{ data: plData }, { data: allPl }, { data: slData }] = await Promise.all([
      supabase.from("playlists").select("*").eq("id", id).single(),
      supabase.from("playlists").select("*").order("created_at", { ascending: true }),
      supabase.from("slides").select("*").eq("playlist_id", id).order("sort_order", { ascending: true }),
    ]);
    if (plData) setPlaylist(plData);
    if (allPl) setAllPlaylists(allPl);
    if (slData) setSlides(slData);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setActive = async () => {
    if (!id) return;
    const { error } = await supabase.rpc("set_active_playlist", { playlist_id: id });
    if (error) { toast.error("שגיאה"); return; }
    setPlaylist(prev => prev ? { ...prev, is_active: true } : prev);
    setAllPlaylists(prev => prev.map(p => ({ ...p, is_active: p.id === id })));
    toast.success("פלייליסט הופעל");
  };

  const openRename = () => {
    if (playlist) { setRenameValue(playlist.name); setRenameDialogOpen(true); }
  };

  const confirmRename = async () => {
    const name = renameValue.trim();
    if (!name || !id) return;
    const { error } = await supabase.from("playlists").update({ name }).eq("id", id);
    if (error) { toast.error("שגיאה בשינוי שם"); return; }
    setPlaylist(prev => prev ? { ...prev, name } : prev);
    setRenameDialogOpen(false);
    toast.success("שם שונה");
  };

  const duplicatePlaylist = async () => {
    if (!playlist || !id) return;
    const { data: newPl, error } = await supabase.from("playlists").insert({ name: `${playlist.name} (עותק)` }).select().single();
    if (error || !newPl) { toast.error("שגיאה בשכפול"); return; }
    if (slides.length > 0) {
      const copies = slides.map(s => ({ image_url: s.image_url, duration: s.duration, sort_order: s.sort_order, object_fit: s.object_fit, media_type: s.media_type, playlist_id: newPl.id }));
      await supabase.from("slides").insert(copies);
    }
    toast.success(`שוכפל כ-"${newPl.name}"`);
    navigate(`/admin/playlists/${newPl.id}`);
  };

  const deletePlaylist = async () => {
    if (!playlist || !id) return;
    if (playlist.is_active) { toast.error("לא ניתן למחוק פלייליסט פעיל"); return; }
    await supabase.from("slides").delete().eq("playlist_id", id);
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) { toast.error("שגיאה במחיקה"); return; }
    toast.success(`"${playlist.name}" נמחק`);
    navigate("/admin/playlists");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const mediaType = isVideoFile(file.name) ? "video" : "image";
        const { error: uploadError } = await supabase.storage.from("images").upload(fileName, file);
        if (uploadError) { toast.error(`העלאה נכשלה: ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("images").getPublicUrl(fileName);
        let duration: number = 5;
        if (mediaType === "video") duration = await getVideoDuration(file);
        const { data, error } = await supabase.from("slides").insert({ image_url: urlData.publicUrl, duration, sort_order: slides.length + 1, object_fit: "contain", playlist_id: id, media_type: mediaType }).select().single();
        if (error) toast.error("שגיאה בשמירה");
        else if (data) setSlides(prev => [...prev, data]);
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
    setSlides(prev => prev.map((s, i) => (i === index ? { ...s, duration } : s)));
  };

  const deleteSlide = async (index: number) => {
    const slide = slides[index];
    const { error } = await supabase.from("slides").delete().eq("id", slide.id);
    if (error) { toast.error("מחיקה נכשלה"); return; }
    setSlides(prev => prev.filter((_, i) => i !== index));
    toast.success("שקף הוסר");
  };

  const copySlideToPlaylist = async (slide: Slide, targetPlaylistId: string) => {
    const { data: targetSlides } = await supabase.from("slides").select("sort_order").eq("playlist_id", targetPlaylistId).order("sort_order", { ascending: false }).limit(1);
    const nextOrder = (targetSlides?.[0]?.sort_order ?? -1) + 1;
    const { error } = await supabase.from("slides").insert({ image_url: slide.image_url, duration: slide.duration, sort_order: nextOrder, object_fit: slide.object_fit, media_type: slide.media_type, playlist_id: targetPlaylistId });
    if (error) { toast.error("שגיאה בהעתקה"); return; }
    const target = allPlaylists.find(p => p.id === targetPlaylistId);
    toast.success(`הועתק ל-"${target?.name}"`);
  };

  const moveSlideToPlaylist = async (slide: Slide, targetPlaylistId: string) => {
    const { error } = await supabase.from("slides").update({ playlist_id: targetPlaylistId }).eq("id", slide.id);
    if (error) { toast.error("שגיאה בהעברה"); return; }
    setSlides(prev => prev.filter(s => s.id !== slide.id));
    const target = allPlaylists.find(p => p.id === targetPlaylistId);
    toast.success(`הועבר ל-"${target?.name}"`);
  };

  const handleSync = async () => {
    setSaving(true);
    try {
      for (const [i, s] of slides.entries()) {
        const { error } = await supabase.from("slides").update({ duration: s.duration, sort_order: i }).eq("id", s.id);
        if (error) throw error;
      }
      toast.success("סונכרן לתצוגה!");
    } catch { toast.error("סנכרון נכשל"); }
    finally { setSaving(false); }
  };

  const otherPlaylists = allPlaylists.filter(p => p.id !== id);

  if (!playlist) {
    return <div className="text-center py-20 text-muted-foreground text-sm">טוען...</div>;
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold truncate">{playlist.name}</h2>
          {playlist.is_active && (
            <span className="text-[11px] font-bold bg-primary/15 text-primary px-2.5 py-1 rounded-full">⚡ פעיל</span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* Play Mode */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">מצב הפעלה</Label>
            <Select
              value={playlist.play_mode || "loop"}
              onValueChange={async (val) => {
                await supabase.from("playlists").update({ play_mode: val } as any).eq("id", id);
                setPlaylist(prev => prev ? { ...prev, play_mode: val } : prev);
                toast.success(val === "loop" ? "מצב: לופ" : "מצב: הפעלה חד-פעמית");
              }}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loop"><span className="flex items-center gap-2"><Repeat className="w-4 h-4" /> לופ (חזרה)</span></SelectItem>
                <SelectItem value="play_once"><span className="flex items-center gap-2"><Play className="w-4 h-4" /> הפעל פעם אחת</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant={playlist.is_active ? "secondary" : "default"} disabled={playlist.is_active} onClick={setActive} className="w-full h-12 text-base gap-2">
            <Check className="w-5 h-5" />
            {playlist.is_active ? "פלייליסט פעיל" : "הפעל פלייליסט זה"}
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 h-11 gap-2" onClick={openRename}><Pencil className="w-4 h-4" /> שינוי שם</Button>
            <Button variant="outline" className="flex-1 h-11 gap-2" onClick={duplicatePlaylist}><Copy className="w-4 h-4" /> שכפול</Button>
          </div>
          {!playlist.is_active && (
            <Button variant="ghost" className="w-full h-11 text-destructive hover:text-destructive gap-2" onClick={deletePlaylist}><Trash2 className="w-4 h-4" /> מחק פלייליסט</Button>
          )}
        </div>
      </div>

      <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
        <Upload className="w-8 h-8 text-primary" />
        <span className="text-sm font-medium text-primary">{uploading ? "מעלה..." : "לחץ להעלאת תמונות או סרטונים"}</span>
        <span className="text-[10px] text-muted-foreground">JPG, PNG, MP4, WEBM</span>
        <input type="file" accept="image/*,video/mp4,video/webm,video/ogg" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
      </label>

      {slides.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-sm">אין שקפים עדיין. העלה מדיה כדי להתחיל.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">שקפים ({slides.length})</h3>
          {slides.map((slide, index) => (
            <div key={slide.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="flex gap-3 p-3">
                <div className="w-24 h-16 rounded-lg bg-muted overflow-hidden shrink-0 relative">
                  {slide.media_type === "video" ? (
                    <video src={slide.image_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    <img src={slide.image_url} alt={`שקף ${index + 1}`} className="w-full h-full object-cover" />
                  )}
                  <span className="absolute top-1 right-1 bg-foreground/70 text-background text-[9px] font-bold px-1 py-0.5 rounded">#{index + 1}</span>
                  {slide.media_type === "video" && (
                    <span className="absolute bottom-1 left-1 bg-primary/80 text-primary-foreground text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5">
                      <Film className="w-2.5 h-2.5" /> וידאו
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={0.1}
                      max={300}
                      value={slide.duration}
                      onChange={(e) => updateDuration(index, parseFloat(e.target.value) || 5)}
                      className="h-9 w-20 text-center text-sm font-semibold"
                    />
                    <span className="text-xs text-muted-foreground">שניות</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSlide(index, "up")} disabled={index === 0}><ArrowUp className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveSlide(index, "down")} disabled={index === slides.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                    <div className="flex-1" />
                    {otherPlaylists.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Copy className="w-4 h-4 ml-2" /> העתק ל…</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {otherPlaylists.map(p => (
                                <DropdownMenuItem key={p.id} onClick={() => copySlideToPlaylist(slide, p.id)}>{p.name} {p.is_active ? "⚡" : ""}</DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><ArrowRightLeft className="w-4 h-4 ml-2" /> העבר ל…</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {otherPlaylists.map(p => (
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
            </div>
          ))}
        </div>
      )}

      {slides.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border z-40">
          <Button onClick={handleSync} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
            <Save className="w-5 h-5" /> {saving ? "מסנכרן..." : "סנכרן לתצוגה"}
          </Button>
        </div>
      )}

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>שינוי שם פלייליסט</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmRename()} className="h-12 text-base" autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>ביטול</Button>
            <Button onClick={confirmRename} disabled={!renameValue.trim()}>שמירה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
