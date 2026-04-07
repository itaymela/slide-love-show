import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImageIcon, Upload, Trash2 } from "lucide-react";

export default function SingleImageSettings() {
  const [active, setActive] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("id, single_image_active, single_image_url").limit(1);
    if (data?.[0]) {
      setSettingsId(data[0].id);
      setActive((data[0] as any).single_image_active ?? false);
      setImageUrl((data[0] as any).single_image_url ?? "");
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateField = async (field: string, value: any) => {
    if (!settingsId) return;
    await supabase.from("settings").update({ [field]: value } as any).eq("id", settingsId);
  };

  const toggleActive = async (val: boolean) => {
    setActive(val);
    await updateField("single_image_active", val);
    toast.success(val ? "תמונה בודדת הופעלה" : "תמונה בודדת כובתה");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `single-image/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("images").upload(path, file, { upsert: true });
    if (error) {
      toast.error("שגיאה בהעלאה");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);
    const url = urlData.publicUrl;
    setImageUrl(url);
    await updateField("single_image_url", url);
    toast.success("התמונה הועלתה בהצלחה");
    setUploading(false);
  };

  const removeImage = async () => {
    setImageUrl("");
    setActive(false);
    await supabase.from("settings").update({ single_image_url: "", single_image_active: false } as any).eq("id", settingsId!);
    toast.success("התמונה הוסרה");
  };

  return (
    <div className="space-y-5">
      {/* Toggle */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <Label className="text-base font-medium">הפעל תמונה בודדת</Label>
          </div>
          <Switch checked={active} onCheckedChange={toggleActive} disabled={!imageUrl} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          כאשר פעיל, התמונה תוצג על כל המסך ותחליף את הפלייליסט הפעיל.
        </p>
        {!imageUrl && active === false && (
          <p className="text-xs text-destructive mt-1">יש להעלות תמונה לפני ההפעלה.</p>
        )}
      </div>

      {/* Upload / Preview */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <p className="text-sm font-semibold">תמונה</p>

        {imageUrl ? (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-muted aspect-video">
              <img src={imageUrl} alt="תמונה בודדת" className="w-full h-full object-contain" />
            </div>
            <div className="flex gap-2">
              <label className="flex-1">
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <Button variant="outline" className="w-full gap-2" asChild disabled={uploading}>
                  <span><Upload className="w-4 h-4" />{uploading ? "מעלה..." : "החלף תמונה"}</span>
                </Button>
              </label>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={removeImage}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <label>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer active:bg-muted/50 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{uploading ? "מעלה..." : "לחץ להעלאת תמונה"}</p>
            </div>
          </label>
        )}
      </div>
    </div>
  );
}
