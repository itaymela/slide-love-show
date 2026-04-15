import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Zap, Pencil, Copy, Clock, Calendar, ListMusic, CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Playlist = { id: string; name: string; is_active: boolean; play_mode: string };
type Macro = {
  id: string; name: string; is_active: boolean;
  condition_type: string; condition_value: string;
  recurrence_interval_minutes: number | null;
  last_run_at: string | null;
  action_type: string; action_target_id: string | null;
};

const CONDITION_LABELS: Record<string, string> = {
  time_daily: "כל יום בשעה",
  datetime_exact: "תאריך ושעה מדויקים",
  playlist_started: "כשפלייליסט מתחיל",
  playlist_finished: "כשפלייליסט מסתיים",
};

const ACTION_LABELS: Record<string, string> = {
  play_specific: "הפעל פלייליסט",
  play_previous: "חזור לפלייליסט הקודם",
  toggle_single_image_on: "הפעל תמונה בודדת",
  toggle_single_image_off: "כבה תמונה בודדת",
  toggle_ticker_on: "הפעל פס רץ",
  toggle_ticker_off: "כבה פס רץ",
  toggle_overlay_on: "הפעל שכבה גרפית",
  toggle_overlay_off: "כבה שכבה גרפית",
};

const EMPTY_MACRO: Omit<Macro, "id"> = {
  name: "", is_active: true,
  condition_type: "time_daily", condition_value: "08:00",
  recurrence_interval_minutes: null, last_run_at: null,
  action_type: "play_specific", action_target_id: null,
};

export default function AutomationTab() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [manualOverride, setManualOverride] = useState(false);
  const [fallbackId, setFallbackId] = useState<string>("");

  // Wizard state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<Macro, "id">>(EMPTY_MACRO);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [{ data: m }, { data: p }, { data: s }] = await Promise.all([
      supabase.from("macros").select("*").order("created_at", { ascending: true }),
      supabase.from("playlists").select("*").order("created_at", { ascending: true }),
      supabase.from("settings").select("manual_override, default_fallback_playlist_id").limit(1),
    ]);
    if (m) setMacros(m as unknown as Macro[]);
    if (p) setPlaylists(p as unknown as Playlist[]);
    if (s?.[0]) {
      setManualOverride((s[0] as any).manual_override);
      setFallbackId((s[0] as any).default_fallback_playlist_id || "");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleOverride = async (val: boolean) => {
    setManualOverride(val);
    const { data: rows } = await supabase.from("settings").select("id").limit(1);
    if (rows?.[0]) {
      await supabase.from("settings").update({ manual_override: val } as any).eq("id", rows[0].id);
    }
    toast.success(val ? "האוטומציה הושהתה" : "האוטומציה חודשה");
  };

  const updateFallback = async (val: string) => {
    setFallbackId(val);
    const { data: rows } = await supabase.from("settings").select("id").limit(1);
    if (rows?.[0]) {
      await supabase.from("settings").update({ default_fallback_playlist_id: val || null } as any).eq("id", rows[0].id);
    }
    toast.success("פלייליסט ברירת מחדל עודכן");
  };

  // --- Wizard helpers ---
  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_MACRO, action_target_id: playlists[0]?.id || null });
    setWizardStep(1);
    setSheetOpen(true);
  };

  const openEdit = (macro: Macro) => {
    setEditingId(macro.id);
    setDraft({ ...macro });
    setWizardStep(1);
    setSheetOpen(true);
  };

  const duplicateMacro = (macro: Macro) => {
    setEditingId(null);
    setDraft({ ...macro, name: `${macro.name} (עותק)` });
    setWizardStep(1);
    setSheetOpen(true);
  };

  const saveMacro = async () => {
    if (!draft.name.trim()) { toast.error("נדרש שם למאקרו"); return; }
    if (editingId) {
      const { error } = await supabase.from("macros").update(draft as any).eq("id", editingId);
      if (error) { toast.error("שגיאה בעדכון"); return; }
      setMacros(prev => prev.map(m => m.id === editingId ? { ...m, ...draft } : m));
      toast.success("מאקרו עודכן");
    } else {
      const { data, error } = await supabase.from("macros").insert(draft as any).select().single();
      if (error) { toast.error("שגיאה בהוספה"); return; }
      setMacros(prev => [...prev, data as unknown as Macro]);
      toast.success("מאקרו נוסף");
    }
    setSheetOpen(false);
  };

  const deleteMacro = async () => {
    if (!deleteId) return;
    await supabase.from("macros").delete().eq("id", deleteId);
    setMacros(prev => prev.filter(m => m.id !== deleteId));
    setDeleteId(null);
    toast.success("מאקרו נמחק");
  };

  const toggleMacro = async (id: string, active: boolean) => {
    await supabase.from("macros").update({ is_active: active } as any).eq("id", id);
    setMacros(prev => prev.map(m => m.id === id ? { ...m, is_active: active } : m));
  };

  // --- Readable sentence ---
  const describeCondition = (m: Macro) => {
    switch (m.condition_type) {
      case "time_daily": return `כל יום בשעה ${m.condition_value}`;
      case "datetime_exact": {
        const recur = m.recurrence_interval_minutes;
        const base = `ב-${formatDateTime(m.condition_value)}`;
        return recur ? `${base} (כל ${recur} דק׳)` : base;
      }
      case "playlist_started": return `כש-"${getPlaylistName(m.condition_value)}" מתחיל`;
      case "playlist_finished": return `כש-"${getPlaylistName(m.condition_value)}" מסתיים`;
      default: return m.condition_value;
    }
  };

  const describeAction = (m: Macro) => {
    switch (m.action_type) {
      case "play_specific": return `הפעל "${getPlaylistName(m.action_target_id || "")}"`;
      case "play_previous": return "חזור לפלייליסט הקודם";
      default: return ACTION_LABELS[m.action_type] || m.action_type;
    }
  };

  const getPlaylistName = (id: string) => playlists.find(p => p.id === id)?.name || "לא ידוע";

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch { return iso; }
  };

  // Filter playlists for "playlist_finished" condition: only play_once
  const getConditionPlaylists = () => {
    if (draft.condition_type === "playlist_finished") {
      return playlists.filter(p => p.play_mode === "play_once");
    }
    return playlists;
  };

  const needsConditionPlaylist = draft.condition_type === "playlist_started" || draft.condition_type === "playlist_finished";
  const needsActionTarget = draft.action_type === "play_specific";

  return (
    <div className="space-y-5">
      {/* Manual Override */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">עקיפה ידנית</Label>
          <Switch checked={manualOverride} onCheckedChange={toggleOverride} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {manualOverride ? "האוטומציה מושהית." : "האוטומציה פעילה."}
        </p>
      </div>

      {/* Default fallback playlist */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-2">
        <Label className="text-sm font-medium">פלייליסט ברירת מחדל (fallback)</Label>
        <Select value={fallbackId} onValueChange={updateFallback}>
          <SelectTrigger className="h-10 text-sm w-full"><SelectValue placeholder="ללא" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">ללא</SelectItem>
            {playlists.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">ישמש כאשר "חזור לקודם" לא מוצא פלייליסט שנקטע.</p>
      </div>

      {/* Macro list */}
      {macros.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">אין מאקרואים עדיין.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {macros.map(macro => (
            <div key={macro.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm truncate">{macro.name || "מאקרו ללא שם"}</span>
                <Switch checked={macro.is_active} onCheckedChange={(v) => toggleMacro(macro.id, v)} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {describeCondition(macro)} → {describeAction(macro)}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => openEdit(macro)}>
                  <Pencil className="w-3.5 h-3.5" /> עריכה
                </Button>
                <Button variant="ghost" size="sm" className="h-8 gap-1" onClick={() => duplicateMacro(macro)}>
                  <Copy className="w-3.5 h-3.5" /> שכפול
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(macro.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 left-4 z-50">
        <Button className="h-14 w-14 rounded-full shadow-lg" onClick={openCreate}>
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Wizard Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "עריכת מאקרו" : "מאקרו חדש"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 mt-4 pb-24">
            {/* Name */}
            <div className="space-y-1">
              <Label className="text-sm">שם</Label>
              <Input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                placeholder="למשל: הפסקת צהריים"
                className="h-11"
              />
            </div>

            {/* Step indicator */}
            <div className="flex gap-2">
              <button
                onClick={() => setWizardStep(1)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${wizardStep === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                1. טריגר
              </button>
              <button
                onClick={() => setWizardStep(2)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${wizardStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                2. פעולה
              </button>
            </div>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-sm">סוג טריגר</Label>
                  <Select
                    value={draft.condition_type}
                    onValueChange={v => setDraft(d => ({ ...d, condition_type: v, condition_value: v === "time_daily" ? "08:00" : "" }))}
                  >
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          <span className="flex items-center gap-2">
                            {k === "time_daily" && <Clock className="w-4 h-4" />}
                            {k === "datetime_exact" && <Calendar className="w-4 h-4" />}
                            {k === "playlist_started" && <ListMusic className="w-4 h-4" />}
                            {k === "playlist_finished" && <CheckCircle2 className="w-4 h-4" />}
                            {v}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {draft.condition_type === "time_daily" && (
                  <div className="space-y-1">
                    <Label className="text-sm">שעה</Label>
                    <Input
                      type="time"
                      value={draft.condition_value}
                      onChange={e => setDraft(d => ({ ...d, condition_value: e.target.value }))}
                      className="h-11"
                    />
                  </div>
                )}

                {draft.condition_type === "datetime_exact" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-sm">תאריך ושעה</Label>
                      <Input
                        type="datetime-local"
                        value={draft.condition_value}
                        onChange={e => setDraft(d => ({ ...d, condition_value: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">חזרה כל X דקות (אופציונלי)</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={draft.recurrence_interval_minutes ?? ""}
                        onChange={e => setDraft(d => ({ ...d, recurrence_interval_minutes: e.target.value ? parseInt(e.target.value) : null }))}
                        placeholder="0 = חד-פעמי"
                        className="h-11"
                      />
                    </div>
                  </>
                )}

                {needsConditionPlaylist && (
                  <div className="space-y-1">
                    <Label className="text-sm">פלייליסט</Label>
                    {draft.condition_type === "playlist_finished" && getConditionPlaylists().length === 0 && (
                      <p className="text-xs text-destructive">אין פלייליסטים במצב "הפעל פעם אחת". שנה מצב פלייליסט קודם.</p>
                    )}
                    <Select
                      value={draft.condition_value}
                      onValueChange={v => setDraft(d => ({ ...d, condition_value: v }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue placeholder="בחר פלייליסט" /></SelectTrigger>
                      <SelectContent>
                        {getConditionPlaylists().map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button className="w-full h-11" onClick={() => setWizardStep(2)}>
                  הבא: בחר פעולה →
                </Button>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-sm">סוג פעולה</Label>
                  <Select
                    value={draft.action_type}
                    onValueChange={v => setDraft(d => ({ ...d, action_type: v }))}
                  >
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTION_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {needsActionTarget && (
                  <div className="space-y-1">
                    <Label className="text-sm">פלייליסט יעד</Label>
                    <Select
                      value={draft.action_target_id || ""}
                      onValueChange={v => setDraft(d => ({ ...d, action_target_id: v }))}
                    >
                      <SelectTrigger className="h-11"><SelectValue placeholder="בחר פלייליסט" /></SelectTrigger>
                      <SelectContent>
                        {playlists.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button className="w-full h-12 text-base font-semibold" onClick={saveMacro}>
                  {editingId ? "שמור שינויים" : "צור מאקרו"}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מאקרו</AlertDialogTitle>
            <AlertDialogDescription>האם למחוק מאקרו זה? לא ניתן לשחזר.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMacro} className="bg-destructive text-destructive-foreground">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
