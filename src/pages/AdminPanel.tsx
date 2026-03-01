import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, ArrowUp, ArrowDown, Trash2, Save, Monitor, Image as ImageIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Slide = {
  id: string;
  image_url: string;
  duration: number;
  sort_order: number;
  object_fit: string;
};

const AdminPanel = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [globalObjectFit, setGlobalObjectFit] = useState<"contain" | "cover">("contain");

  const fetchSlides = useCallback(async () => {
    const { data, error } = await supabase
      .from("slides")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error("Failed to load slides");
      return;
    }
    setSlides(data || []);
    if (data && data.length > 0) {
      setGlobalObjectFit(data[0].object_fit as "contain" | "cover");
    }
  }, []);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
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

        const newSlide: Omit<Slide, "id"> = {
          image_url: urlData.publicUrl,
          duration: 5,
          sort_order: slides.length + 1,
          object_fit: globalObjectFit,
        };

        const { data, error } = await supabase
          .from("slides")
          .insert(newSlide)
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
      const updates = slides.map((s, i) => ({
        id: s.id,
        image_url: s.image_url,
        duration: s.duration,
        sort_order: i,
        object_fit: globalObjectFit,
      }));

      for (const u of updates) {
        const { error } = await supabase
          .from("slides")
          .update({ duration: u.duration, sort_order: u.sort_order, object_fit: u.object_fit })
          .eq("id", u.id);
        if (error) throw error;
      }

      toast.success("Slides synced to display!");
    } catch {
      toast.error("Sync failed");
    } finally {
      setSaving(false);
    }
  };

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
            disabled={uploading}
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
                      min={1}
                      max={300}
                      value={slide.duration}
                      onChange={(e) =>
                        updateDuration(index, parseInt(e.target.value) || 5)
                      }
                      className="h-8 text-xs text-center"
                    />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">sec</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveSlide(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveSlide(index, "down")}
                      disabled={index === slides.length - 1}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => deleteSlide(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
