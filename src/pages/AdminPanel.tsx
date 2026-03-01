import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Upload, ArrowUp, ArrowDown, Trash2, Save, Monitor,
  Image as ImageIcon, Plus, Check, List,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Playlist = {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type Slide = {
  id: string;
  image_url: string;
  duration: number;
  sort_order: number;
  object_fit: string;
  playlist_id: string;
};

const AdminPanel = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalObjectFit, setGlobalObjectFit] = useState<"contain" | "cover">("contain");

  const fetchPlaylists = useCallback(async () => {
    const { data } = await supabase
      .from("playlists")
      .select("*")
      .order("created_at", { ascending: true });
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
    const { data } = await supabase
      .from("slides")
      .select("*")
      .eq("playlist_id", selectedPlaylistId)
      .order("sort_order", { ascending: true });
    setSlides(data || []);
    if (data && data.length > 0) {
      setGlobalObjectFit(data[0].object_fit as "contain" | "cover");
    }
  }, [selectedPlaylistId]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const createPlaylist = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("playlists")
      .insert({ name })
      .select()
      .single();
    if (error) {
      toast.error("Failed to create playlist");
      return;
    }
    setPlaylists((prev) => [...prev, data]);
    setSelectedPlaylistId(data.id);
    setNewPlaylistName("");
    toast.success(`Playlist "${name}" created`);
  };

  const setActivePlaylist = async (id: string) => {
    // Deactivate all, then activate selected
    await supabase.from("playlists").update({ is_active: false }).neq("id", "");
    const { error } = await supabase.from("playlists").update({ is_active: true }).eq("id", id);
    if (error) {
      toast.error("Failed to set active playlist");
      return;
    }
    setPlaylists((prev) =>
      prev.map((p) => ({ ...p, is_active: p.id === id }))
    );
    toast.success("Active playlist updated — display will refresh automatically");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedPlaylistId) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(fileName);

        const { data, error } = await supabase
          .from("slides")
          .insert({
            image_url: urlData.publicUrl,
            duration: 5,
            sort_order: slides.length + 1,
            object_fit: globalObjectFit,
            playlist_id: selectedPlaylistId,
          })
          .select()
          .single();

        if (error) {
          toast.error("Failed to save slide");
        } else if (data) {
          setSlides((prev) => [...prev, data]);
        }
      }
      toast.success("Images uploaded!");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, duration } : s))
    );
  };

  const deleteSlide = async (index: number) => {
    const slide = slides[index];
    const { error } = await supabase.from("slides").delete().eq("id", slide.id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    setSlides((prev) => prev.filter((_, i) => i !== index));
    toast.success("Slide removed");
  };

  const handleSync = async () => {
    setSaving(true);
    try {
      for (const [i, s] of slides.entries()) {
        const { error } = await supabase
          .from("slides")
          .update({ duration: s.duration, sort_order: i, object_fit: globalObjectFit })
          .eq("id", s.id);
        if (error) throw error;
      }
      toast.success("Slides synced to display!");
    } catch {
      toast.error("Sync failed");
    } finally {
      setSaving(false);
    }
  };

  const activePlaylist = playlists.find((p) => p.is_active);
  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId);
  const isSelectedActive = selectedPlaylist?.is_active;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold tracking-tight">Signage Admin</h1>
          </div>
          <a
            href="/display"
            target="_blank"
            className="text-xs font-medium text-primary hover:underline"
          >
            Open Display ↗
          </a>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Playlist Management */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <List className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Playlists</span>
            {activePlaylist && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                Live: {activePlaylist.name}
              </span>
            )}
          </div>

          {/* Create new playlist */}
          <div className="flex gap-2">
            <Input
              placeholder="New playlist name…"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
              className="h-9 text-sm"
            />
            <Button size="sm" className="h-9 gap-1 shrink-0" onClick={createPlaylist} disabled={!newPlaylistName.trim()}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          {/* Select playlist */}
          {playlists.length > 0 && (
            <div className="flex gap-2 items-center">
              <Select value={selectedPlaylistId} onValueChange={setSelectedPlaylistId}>
                <SelectTrigger className="h-9 text-sm flex-1">
                  <SelectValue placeholder="Select playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.is_active ? "⚡" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                className="h-9 gap-1 shrink-0"
                variant={isSelectedActive ? "secondary" : "default"}
                disabled={isSelectedActive}
                onClick={() => setActivePlaylist(selectedPlaylistId)}
              >
                <Check className="w-3.5 h-3.5" />
                {isSelectedActive ? "Active" : "Set Active"}
              </Button>
            </div>
          )}
        </div>

        {/* Upload area */}
        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
          <Upload className="w-8 h-8 text-primary" />
          <span className="text-sm font-medium text-primary">
            {uploading ? "Uploading..." : "Tap to upload images"}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading || !selectedPlaylistId}
            className="hidden"
          />
        </label>

        {/* Object fit toggle */}
        <div className="flex items-center justify-between bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Image Scaling</Label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fit</span>
            <Switch
              checked={globalObjectFit === "cover"}
              onCheckedChange={(checked) =>
                setGlobalObjectFit(checked ? "cover" : "contain")
              }
            />
            <span className="text-xs text-muted-foreground">Fill</span>
          </div>
        </div>

        {/* Slides grid */}
        {slides.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No slides yet. Upload images to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
              >
                <div className="aspect-video bg-muted relative">
                  <img
                    src={slide.image_url}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 left-1.5 bg-foreground/70 text-background text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    #{index + 1}
                  </span>
                </div>
                <div className="p-2.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={300}
                      value={slide.duration}
                      onChange={(e) =>
                        updateDuration(index, parseInt(e.target.value) || 5)
                      }
                      className="h-10 text-base text-center font-semibold"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">sec</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveSlide(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveSlide(index, "down")}
                      disabled={index === slides.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteSlide(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky sync button */}
      {slides.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/80 backdrop-blur-xl border-t border-border">
          <Button
            onClick={handleSync}
            disabled={saving}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? "Syncing..." : "Sync to Display"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
