import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import SkyMode from "@/components/display/SkyMode";

type Slide = {
  id: string; image_url: string; duration: number; sort_order: number;
  object_fit: string; playlist_id: string; media_type: string;
};

type DisplaySettings = {
  ticker_text: string; ticker_enabled: boolean; transition_type: string;
  ticker_font_size: number; ticker_speed: number; ticker_offset_y: number;
  transition_duration: number; display_scale: number; display_offset_x: number;
  display_offset_y: number; overlay_url: string; overlay_position: string;
  overlay_size: number; overlay_offset_x: number; overlay_offset_y: number;
  birthday_sheet_url: string; birthday_enabled: boolean;
  single_image_url: string; single_image_active: boolean;
  global_object_fit: string;
  sky_mode_enabled: boolean;
  sky_mode_interval_minutes: number;
  sky_mode_duration_seconds: number;
  sky_mode_names_per_screen: number;
  sky_mode_manual_trigger: number;
};

type Macro = {
  id: string; name: string; is_active: boolean;
  condition_type: string; condition_value: string;
  recurrence_interval_minutes: number | null;
  last_run_at: string | null;
  action_type: string; action_target_id: string | null;
};

const defaultSettings: DisplaySettings = {
  ticker_text: "", ticker_enabled: false, transition_type: "fade",
  ticker_font_size: 14, ticker_speed: 30, ticker_offset_y: 0, transition_duration: 0.5,
  display_scale: 100, display_offset_x: 0, display_offset_y: 0,
  overlay_url: "", overlay_position: "top-right", overlay_size: 50,
  overlay_offset_x: 0, overlay_offset_y: 0,
  birthday_sheet_url: "", birthday_enabled: false,
  single_image_url: "", single_image_active: false,
  global_object_fit: "contain",
  sky_mode_enabled: false, sky_mode_interval_minutes: 30,
  sky_mode_duration_seconds: 20, sky_mode_names_per_screen: 8,
  sky_mode_manual_trigger: 0,
};

const LoadingScreen = () => (
  <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "hsl(0 0% 0%)" }}>
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      <p className="text-white/60 text-sm">טוען תוכן...</p>
    </div>
  </div>
);

function preloadImages(slides: Slide[]): Promise<void> {
  const imageSlides = slides.filter(s => s.media_type !== "video");
  if (imageSlides.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= imageSlides.length) resolve(); };
    imageSlides.forEach((slide) => {
      const img = new window.Image();
      img.onload = done; img.onerror = done;
      img.src = slide.image_url;
    });
    setTimeout(resolve, 15000);
  });
}

const DisplayPanel = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [slideA, setSlideA] = useState<Slide | null>(null);
  const [slideB, setSlideB] = useState<Slide | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);
  const [birthdayNames, setBirthdayNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activePlayMode, setActivePlayMode] = useState<string>("loop");
  const birthdayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Sky Mode state ---
  const [skyActive, setSkyActive] = useState(false);
  const [skySession, setSkySession] = useState(0);
  const skyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skyIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastManualTriggerRef = useRef<number>(0);

  const slidesRef = useRef<Slide[]>([]);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLayerRef = useRef<"A" | "B">("A");
  const nextReadyRef = useRef(false);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const settingsRef = useRef(settings);
  const playModeRef = useRef("loop");
  const activePlaylistIdRef = useRef<string | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*").limit(1);
    if (data?.[0]) {
      const raw = data[0] as any;
      const s: DisplaySettings = {
        ticker_text: raw.ticker_text || "", ticker_enabled: raw.ticker_enabled ?? false,
        transition_type: raw.transition_type || "fade", ticker_font_size: raw.ticker_font_size ?? 14,
        ticker_speed: raw.ticker_speed ?? 30, ticker_offset_y: raw.ticker_offset_y ?? 0,
        transition_duration: raw.transition_duration ?? 0.5, display_scale: raw.display_scale ?? 100,
        display_offset_x: raw.display_offset_x ?? 0, display_offset_y: raw.display_offset_y ?? 0,
        overlay_url: raw.overlay_url || "", birthday_sheet_url: raw.birthday_sheet_url || "",
        birthday_enabled: raw.birthday_enabled ?? false, overlay_position: raw.overlay_position || "top-right",
        overlay_size: raw.overlay_size ?? 50, overlay_offset_x: raw.overlay_offset_x ?? 0,
        overlay_offset_y: raw.overlay_offset_y ?? 0, single_image_url: raw.single_image_url || "",
        single_image_active: raw.single_image_active ?? false, global_object_fit: raw.global_object_fit || "contain",
        sky_mode_enabled: raw.sky_mode_enabled ?? false,
        sky_mode_interval_minutes: raw.sky_mode_interval_minutes ?? 30,
        sky_mode_duration_seconds: raw.sky_mode_duration_seconds ?? 20,
        sky_mode_names_per_screen: raw.sky_mode_names_per_screen ?? 8,
        sky_mode_manual_trigger: raw.sky_mode_manual_trigger ?? 0,
      };
      setSettings(s);
      settingsRef.current = s;
    }
  }, []);

  const fetchActiveSlides = useCallback(async () => {
    const { data: playlists } = await supabase.from("playlists").select("id, play_mode").eq("is_active", true).limit(1);
    const active = playlists?.[0];
    if (!active) { slidesRef.current = []; setSlides([]); setActivePlaylistId(null); setLoading(false); return; }
    setActivePlaylistId(active.id);
    activePlaylistIdRef.current = active.id;
    setActivePlayMode((active as any).play_mode || "loop");
    playModeRef.current = (active as any).play_mode || "loop";
    const { data } = await supabase.from("slides").select("*").eq("playlist_id", active.id).order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      setLoading(true);
      await preloadImages(data);
      slidesRef.current = data;
      setSlides(data);
      setLoading(false);
    } else {
      slidesRef.current = []; setSlides([]); setLoading(false);
    }
  }, []);

  const fetchBirthdays = useCallback(async () => {
    const url = settingsRef.current.birthday_sheet_url;
    const enabled = settingsRef.current.birthday_enabled;
    if (!enabled || !url) { setBirthdayNames([]); return; }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const rows = text.split("\n").slice(1);
      const names = rows.map(row => { const cols = row.split(","); return (cols[4] || "").replace(/^"|"$/g, "").trim(); }).filter(Boolean);
      setBirthdayNames(names);
    } catch { setBirthdayNames([]); }
  }, []);

  useEffect(() => { fetchActiveSlides(); fetchSettings(); }, [fetchActiveSlides, fetchSettings]);

  // --- Sky Mode driver: scheduled interval + manual trigger reaction ---
  const startSkySession = useCallback(() => {
    if (skyTimerRef.current) clearTimeout(skyTimerRef.current);
    setSkySession((k) => k + 1);
    setSkyActive(true);
    const durationMs = Math.max(3, settingsRef.current.sky_mode_duration_seconds || 20) * 1000;
    skyTimerRef.current = setTimeout(() => {
      setSkyActive(false);
    }, durationMs);
  }, []);

  // Schedule periodic Sky Mode based on interval_minutes
  useEffect(() => {
    if (skyIntervalRef.current) {
      clearInterval(skyIntervalRef.current);
      skyIntervalRef.current = null;
    }
    if (!settings.sky_mode_enabled) {
      setSkyActive(false);
      if (skyTimerRef.current) { clearTimeout(skyTimerRef.current); skyTimerRef.current = null; }
      return;
    }
    const minutes = Math.max(1, settings.sky_mode_interval_minutes || 30);
    skyIntervalRef.current = setInterval(() => {
      startSkySession();
    }, minutes * 60 * 1000);
    return () => {
      if (skyIntervalRef.current) clearInterval(skyIntervalRef.current);
    };
  }, [settings.sky_mode_enabled, settings.sky_mode_interval_minutes, startSkySession]);

  // React to manual trigger increments (works even when sky_mode_enabled=false)
  useEffect(() => {
    const cur = settings.sky_mode_manual_trigger || 0;
    if (lastManualTriggerRef.current === 0) {
      // initial sync — don't fire on first load
      lastManualTriggerRef.current = cur;
      return;
    }
    if (cur !== lastManualTriggerRef.current) {
      lastManualTriggerRef.current = cur;
      startSkySession();
    }
  }, [settings.sky_mode_manual_trigger, startSkySession]);

  useEffect(() => {
    return () => {
      if (skyTimerRef.current) clearTimeout(skyTimerRef.current);
      if (skyIntervalRef.current) clearInterval(skyIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    fetchBirthdays();
    birthdayIntervalRef.current = setInterval(fetchBirthdays, 3600000);
    return () => { if (birthdayIntervalRef.current) clearInterval(birthdayIntervalRef.current); };
  }, [settings.birthday_enabled, settings.birthday_sheet_url, fetchBirthdays]);

  useEffect(() => {
    const channel = supabase.channel("display-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => fetchActiveSlides())
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, () => fetchActiveSlides())
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => fetchSettings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveSlides, fetchSettings]);

  // Heartbeat via Presence
  useEffect(() => {
    const channel = supabase.channel("display-presence", { config: { presence: { key: "display-kiosk" } } });
    const trackPresence = () => {
      const s = slidesRef.current; const idx = currentIndexRef.current;
      channel.track({ current_slide_url: s[idx]?.image_url || "", current_slide_index: idx, last_seen: new Date().toISOString() });
    };
    channel.on("presence", { event: "sync" }, () => {}).subscribe((status) => { if (status === "SUBSCRIBED") trackPresence(); });
    presenceChannelRef.current = channel;
    const interval = setInterval(trackPresence, 30000);
    return () => { clearInterval(interval); supabase.removeChannel(channel); presenceChannelRef.current = null; };
  }, [slides]);

  // --- Macro Engine ---
  const executeMacroAction = useCallback(async (macro: Macro) => {
    const { action_type, action_target_id } = macro;
    const { data: sRows } = await supabase.from("settings").select("id").limit(1);
    const settingsId = sRows?.[0]?.id;

    switch (action_type) {
      case "play_specific":
        if (!action_target_id) return;
        // Save interrupted playlist
        if (settingsId && activePlaylistIdRef.current) {
          await supabase.from("settings").update({ interrupted_playlist_id: activePlaylistIdRef.current } as any).eq("id", settingsId);
        }
        await supabase.rpc("set_active_playlist", { playlist_id: action_target_id });
        break;
      case "play_previous": {
        const { data: s } = await supabase.from("settings").select("interrupted_playlist_id, default_fallback_playlist_id").limit(1);
        const row = s?.[0] as any;
        const targetId = row?.interrupted_playlist_id || row?.default_fallback_playlist_id;
        if (targetId) {
          await supabase.rpc("set_active_playlist", { playlist_id: targetId });
          if (settingsId) await supabase.from("settings").update({ interrupted_playlist_id: null } as any).eq("id", settingsId);
        }
        break;
      }
      case "toggle_single_image_on":
        if (settingsId) await supabase.from("settings").update({ single_image_active: true } as any).eq("id", settingsId);
        break;
      case "toggle_single_image_off":
        if (settingsId) await supabase.from("settings").update({ single_image_active: false } as any).eq("id", settingsId);
        break;
      case "toggle_ticker_on":
        if (settingsId) await supabase.from("settings").update({ ticker_enabled: true } as any).eq("id", settingsId);
        break;
      case "toggle_ticker_off":
        if (settingsId) await supabase.from("settings").update({ ticker_enabled: false } as any).eq("id", settingsId);
        break;
      case "toggle_overlay_on":
        if (settingsId) await supabase.from("settings").update({ overlay_url: settingsRef.current.overlay_url || "on" } as any).eq("id", settingsId);
        break;
      case "toggle_overlay_off":
        // We don't clear overlay_url, just hide it by clearing via a flag approach. For now, no-op since overlay is URL-based.
        break;
    }
  }, []);

  // Time-based macro checker
  useEffect(() => {
    const checkTimeMacros = async () => {
      const { data: sData } = await supabase.from("settings").select("manual_override").limit(1);
      if ((sData?.[0] as any)?.manual_override) return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const { data: macros } = await supabase.from("macros").select("*").eq("is_active", true);
      if (!macros) return;

      for (const raw of macros) {
        const macro = raw as unknown as Macro;
        // Prevent duplicate runs within 60s
        if (macro.last_run_at) {
          const lastRun = new Date(macro.last_run_at).getTime();
          if (now.getTime() - lastRun < 60000) continue;
        }

        let shouldRun = false;

        if (macro.condition_type === "time_daily") {
          shouldRun = macro.condition_value === currentTime;
        } else if (macro.condition_type === "datetime_exact") {
          const target = new Date(macro.condition_value);
          const diffMs = now.getTime() - target.getTime();
          if (diffMs >= 0 && diffMs < 15000) {
            shouldRun = true;
            // If recurring, update condition_value to next occurrence
            if (macro.recurrence_interval_minutes && macro.recurrence_interval_minutes > 0) {
              const next = new Date(target.getTime() + macro.recurrence_interval_minutes * 60000);
              await supabase.from("macros").update({ condition_value: next.toISOString() } as any).eq("id", macro.id);
            }
          }
        }
        // playlist_started/finished are event-driven, not time-based

        if (shouldRun) {
          await supabase.from("macros").update({ last_run_at: now.toISOString() } as any).eq("id", macro.id);
          await executeMacroAction(macro);
        }
      }
    };

    const interval = setInterval(checkTimeMacros, 10000);
    checkTimeMacros();
    return () => clearInterval(interval);
  }, [executeMacroAction]);

  // Event: playlist finished (play_once mode, reached last slide)
  const handlePlaylistFinished = useCallback(async () => {
    const playlistId = activePlaylistIdRef.current;
    if (!playlistId) return;

    const { data: macros } = await supabase.from("macros").select("*").eq("is_active", true);
    if (!macros) return;

    for (const raw of macros) {
      const macro = raw as unknown as Macro;
      if (macro.condition_type === "playlist_finished" && macro.condition_value === playlistId) {
        await supabase.from("macros").update({ last_run_at: new Date().toISOString() } as any).eq("id", macro.id);
        await executeMacroAction(macro);
        break;
      }
    }
  }, [executeMacroAction]);

  const scheduleAdvance = useCallback((slide: Slide) => {
    clearTimer();
    timerRef.current = setTimeout(() => { advance(); }, slide.duration * 1000);
  }, []);

  const onNextReady = useCallback(() => { nextReadyRef.current = true; }, []);

  const advance = useCallback(() => {
    const s = slidesRef.current;
    if (s.length === 0) return;
    const cur = currentIndexRef.current;
    const next = (cur + 1) % s.length;

    // If play_once and we've reached the end, trigger playlist_finished
    if (playModeRef.current === "play_once" && next === 0) {
      handlePlaylistFinished();
      return; // Don't loop
    }

    const nextSlide = s[next];
    const currentLayer = activeLayerRef.current;
    const nextLayer = currentLayer === "A" ? "B" : "A";
    if (nextLayer === "A") setSlideA(nextSlide); else setSlideB(nextSlide);
    nextReadyRef.current = false;
    const waitForReady = () => {
      if (nextReadyRef.current) {
        doSwap(nextLayer, next, nextSlide);
      } else {
        setTimeout(waitForReady, nextSlide.media_type === "video" ? 100 : 50);
      }
    };
    setTimeout(waitForReady, 50);
  }, [handlePlaylistFinished]);

  const doSwap = useCallback((nextLayer: "A" | "B", nextIndex: number, nextSlide: Slide) => {
    if (nextSlide.media_type === "video") {
      const videoEl = nextLayer === "A" ? videoARef.current : videoBRef.current;
      if (videoEl) { videoEl.currentTime = 0; videoEl.play().catch(() => {}); }
    }
    activeLayerRef.current = nextLayer;
    setActiveLayer(nextLayer);
    currentIndexRef.current = nextIndex;
    const oldVideo = (nextLayer === "A" ? videoBRef : videoARef).current;
    if (oldVideo) oldVideo.pause();
    scheduleAdvance(nextSlide);
  }, [scheduleAdvance]);

  useEffect(() => {
    if (slides.length === 0) return;
    clearTimer();
    const first = slides[0];
    setSlideA(first); setSlideB(null);
    activeLayerRef.current = "A"; setActiveLayer("A"); currentIndexRef.current = 0;
    if (first.media_type === "video") setTimeout(() => { videoARef.current?.play().catch(() => {}); }, 100);
    if (slides.length > 1) scheduleAdvance(first);
    return () => clearTimer();
  }, [slides, scheduleAdvance]);

  // Event: playlist started
  useEffect(() => {
    if (!activePlaylistId) return;
    (async () => {
      const { data: macros } = await supabase.from("macros").select("*").eq("is_active", true);
      if (!macros) return;
      for (const raw of macros) {
        const macro = raw as unknown as Macro;
        if (macro.condition_type === "playlist_started" && macro.condition_value === activePlaylistId) {
          await supabase.from("macros").update({ last_run_at: new Date().toISOString() } as any).eq("id", macro.id);
          await executeMacroAction(macro);
          break;
        }
      }
    })();
  }, [activePlaylistId, executeMacroAction]);

  const getSlideFitClass = (slide: Slide | null) => {
    const fit = (slide?.object_fit && (slide.object_fit === "contain" || slide.object_fit === "cover"))
      ? slide.object_fit : settings.global_object_fit;
    return fit === "cover" ? "object-cover" : "object-contain";
  };
  const fitClass = settings.global_object_fit === "cover" ? "object-cover" : "object-contain";
  const isFade = settings.transition_type === "fade";
  const transitionDur = isFade ? `${settings.transition_duration}s` : "0s";

  const layerStyle = (isActive: boolean): React.CSSProperties => ({
    opacity: isActive ? 1 : 0, zIndex: isActive ? 2 : 1,
    transition: `opacity ${transitionDur} ease-in-out`,
    willChange: "opacity", transform: "translateZ(0)",
  });

  const renderMedia = (slide: Slide | null, videoRef: React.MutableRefObject<HTMLVideoElement | null>) => {
    if (!slide) return null;
    const slideFit = getSlideFitClass(slide);
    if (slide.media_type === "video") {
      return (
        <video ref={videoRef} src={slide.image_url} className={`w-full h-full ${slideFit}`}
          muted playsInline loop={slides.length === 1 && playModeRef.current === "loop"}
          onCanPlayThrough={onNextReady} />
      );
    }
    return <img src={slide.image_url} alt="" className={`w-full h-full ${slideFit}`} onLoad={onNextReady} onError={onNextReady} />;
  };

  const customTickerPart = settings.ticker_text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).join(" ● ");
  const birthdayPart = birthdayNames.length > 0 ? "🎂 " + birthdayNames.join(" ● ") : "";
  const tickerParts = [customTickerPart, birthdayPart].filter(Boolean);
  const tickerDisplayText = tickerParts.length > 0 ? tickerParts.join(" ● ") + " ● " : "";
  const tickerHeight = settings.ticker_font_size + 16;
  const scaleFactor = (settings.display_scale || 100) / 100;
  const offsetX = settings.display_offset_x || 0;
  const offsetY = settings.display_offset_y || 0;
  const calibrationTransform = `scale(${scaleFactor}) translate(${offsetX}px, ${offsetY}px)`;
  const oX = settings.overlay_offset_x || 0;
  const oY = settings.overlay_offset_y || 0;
  const overlayPositionStyles: Record<string, React.CSSProperties> = {
    "top-right": { top: 12 + oY, right: 12 - oX },
    "top-left": { top: 12 + oY, left: 12 + oX },
    "bottom-right": { bottom: (settings.ticker_enabled ? tickerHeight + 12 : 12) - oY, right: 12 - oX },
    "bottom-left": { bottom: (settings.ticker_enabled ? tickerHeight + 12 : 12) - oY, left: 12 + oX },
  };

  if (loading) return <LoadingScreen />;

  if (settings.single_image_active && settings.single_image_url) {
    return (
      <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: "hsl(0 0% 0%)", cursor: "none" }}>
        <div style={{ width: "100%", height: "100%", transform: calibrationTransform, transformOrigin: "center center" }}>
          <img src={settings.single_image_url} alt="" className={`w-full h-full ${fitClass}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: "hsl(0 0% 0%)", cursor: "none" }}>
      <div style={{ width: "100%", height: "100%", transform: calibrationTransform, transformOrigin: "center center" }}>
        <div className="relative w-full" style={{ height: settings.ticker_enabled && tickerDisplayText.length > 3 ? `calc(100% - ${tickerHeight}px)` : "100%" }}>
          <div className="absolute inset-0 w-full h-full" style={layerStyle(activeLayer === "A")}>{renderMedia(slideA, videoARef)}</div>
          <div className="absolute inset-0 w-full h-full" style={layerStyle(activeLayer === "B")}>{renderMedia(slideB, videoBRef)}</div>
        </div>
        {settings.overlay_url && (
          <img src={settings.overlay_url} alt="" style={{ position: "absolute", zIndex: 40, width: `${settings.overlay_size}px`, height: "auto", pointerEvents: "none", ...overlayPositionStyles[settings.overlay_position] }} />
        )}
        {settings.ticker_enabled && tickerDisplayText.length > 3 && (
          <div className="absolute left-0 right-0 z-50 flex items-center overflow-hidden"
            style={{ backgroundColor: "hsla(0, 0%, 0%, 0.75)", height: `${tickerHeight}px`, bottom: `${settings.ticker_offset_y || 0}px` }}>
            <div className="whitespace-nowrap font-medium"
              style={{ color: "hsl(0 0% 95%)", fontSize: `${settings.ticker_font_size}px`, animation: `ticker-rtl ${settings.ticker_speed}s linear infinite` }}>
              {tickerDisplayText}
              <span className="mx-24">{tickerDisplayText}</span>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes ticker-rtl { 0% { transform: translateX(-100%); } 100% { transform: translateX(100vw); } }`}</style>
    </div>
  );
};

export default DisplayPanel;
