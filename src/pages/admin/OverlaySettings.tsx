import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Save, Image, Upload } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function OverlaySettings() {
  const [id, setId] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");
  const [overlayPosition, setOverlayPosition] = useState("top-right");
  const [overlaySize, setOverlaySize] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, overlay_url, overlay_position, overlay_size").limit(1);
    if (data?.[0]) {
      setId(data[0].id);
      setOverlayUrl(data[0].overlay_url);
      setOverlayPosition(data[0].overlay_position);
      setOverlaySize(data[0].overlay_size);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `overlay/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { upsert: true });
    if (error) { toast.error("שגיאה בהעלאת תמונה"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
    setOverlayUrl(urlData.publicUrl);
    setUploading(false);
    toast.success("התמונה הועלתה בהצלחה");
  };

  const save = async () => {
    setSaving(true);
    await supabase.from("settings").update({
      overlay_url: overlayUrl,
      overlay_position: overlayPosition,
      overlay_size: overlaySize,
    }).eq("id", id);
    setSaving(false);
    toast.success("הגדרות שכבה גרפית נשמרו");
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-primary" />
          <span className="text-base font-semibold">שכבה גרפית</span>
        </div>
        <p className="text-xs text-muted-foreground">העלה תמונה (PNG שקוף מומלץ) שתוצג מעל השקופיות.</p>

        <div className="space-y-2">
          <Label className="text-sm">העלאת תמונה</Label>
          <label className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
            <Upload className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">{uploading ? "מעלה..." : "בחר תמונה"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>

        {overlayUrl && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <img src={overlayUrl} alt="overlay" className="w-14 h-14 object-contain rounded-lg" />
            <span className="text-xs text-muted-foreground flex-1">תמונה נטענה</span>
            <Button variant="ghost" size="sm" onClick={() => setOverlayUrl("")} className="text-xs text-destructive">
              הסר
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm">מיקום</Label>
          <Select value={overlayPosition} onValueChange={setOverlayPosition}>
            <SelectTrigger className="h-12 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="top-right">למעלה מימין</SelectItem>
              <SelectItem value="top-left">למעלה משמאל</SelectItem>
              <SelectItem value="bottom-right">למטה מימין</SelectItem>
              <SelectItem value="bottom-left">למטה משמאל</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">גודל תמונה</Label>
            <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{overlaySize}px</span>
          </div>
          <Slider min={5} max={100} step={1} value={[overlaySize]} onValueChange={([v]) => setOverlaySize(v)} className="py-2" />
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 text-base font-semibold gap-2">
        <Save className="w-5 h-5" /> {saving ? "שומר..." : "שמירה"}
      </Button>
    </div>
  );
}
