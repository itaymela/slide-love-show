import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Slide = {
  id: string;
  image_url: string;
  duration: number;
  sort_order: number;
  object_fit: string;
  playlist_id: string;
  media_type: string;
};

type DisplaySettings = {
  ticker_text: string;
  ticker_enabled: boolean;
  transition_type: string;
};

const DisplayPanel = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [slideA, setSlideA] = useState<Slide | null>(null);
  const [slideB, setSlideB] = useState<Slide | null>(null);
  const [objectFit, setObjectFit] = useState<"contain" | "cover">("contain");
  const [settings, setSettings] = useState<DisplaySettings>({ ticker_text: "", ticker_enabled: false, transition_type: "fade" });

  const slidesRef = useRef<Slide[]>([]);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLayerRef = useRef<"A" | "B">("A");
  const nextReadyRef = useRef(false);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("ticker_text, ticker_enabled, transition_type").limit(1);
    if (data?.[0]) {
      const s = data[0] as DisplaySettings;
      setSettings(s);
      settingsRef.current = s;
    }
  }, []);

  const fetchActiveSlides = useCallback(async () => {
    const { data: playlists } = await supabase.from("playlists").select("id").eq("is_active", true).limit(1);
    const activeId = playlists?.[0]?.id;
    if (!activeId) { slidesRef.current = []; setSlides([]); return; }
    const { data } = await supabase.from("slides").select("*").eq("playlist_id", activeId).order("sort_order", { ascending: true });
    if (data && data.length > 0) {
      slidesRef.current = data;
      setSlides(data);
      setObjectFit(data[0].object_fit as "contain" | "cover");
    } else { slidesRef.current = []; setSlides([]); }
  }, []);

  useEffect(() => { fetchActiveSlides(); fetchSettings(); }, [fetchActiveSlides, fetchSettings]);

  useEffect(() => {
    const channel = supabase
      .channel("display-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => fetchActiveSlides())
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, () => fetchActiveSlides())
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, () => fetchSettings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveSlides, fetchSettings]);

  useEffect(() => {
    const sendHeartbeat = async () => {
      const s = slidesRef.current;
      const idx = currentIndexRef.current;
      const currentUrl = s[idx]?.image_url || "";
      const { data: rows } = await supabase.from("display_heartbeat").select("id").limit(1);
      if (rows?.[0]) {
        await supabase.from("display_heartbeat").update({
          last_seen: new Date().toISOString(),
          current_slide_url: currentUrl,
          current_slide_index: idx,
          updated_at: new Date().toISOString(),
        }).eq("id", rows[0].id);
      }
    };
    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, 10000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [slides]);

  // Macro checker with date support
  useEffect(() => {
    const checkMacros = async () => {
      const { data: settingsData } = await supabase.from("settings").select("manual_override").limit(1);
      if (settingsData?.[0]?.manual_override) return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const currentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const { data: macros } = await supabase.from("macros").select("*").eq("is_enabled", true).eq("trigger_time", currentTime);
      if (macros && macros.length > 0) {
        for (const macro of macros) {
          // If trigger_date is set, only fire on that date
          const triggerDate = (macro as any).trigger_date;
          if (triggerDate && triggerDate !== currentDate) continue;

          const { data: pl } = await supabase.from("playlists").select("is_active").eq("id", macro.target_playlist_id).limit(1);
          if (pl?.[0] && !pl[0].is_active) {
            await supabase.rpc("set_active_playlist", { playlist_id: macro.target_playlist_id });
          }
          break; // Only fire the first matching macro
        }
      }
    };
    const interval = setInterval(checkMacros, 30000);
    checkMacros();
    return () => clearInterval(interval);
  }, []);

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
    const nextSlide = s[next];
    const currentLayer = activeLayerRef.current;
    const nextLayer = currentLayer === "A" ? "B" : "A";

    if (nextLayer === "A") setSlideA(nextSlide);
    else setSlideB(nextSlide);

    nextReadyRef.current = false;
    const waitForReady = () => {
      if (nextReadyRef.current) {
        doSwap(nextLayer, next, nextSlide);
      } else {
        setTimeout(waitForReady, nextSlide.media_type === "video" ? 100 : 50);
      }
    };
    setTimeout(waitForReady, 50);
  }, []);

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
    setSlideA(first);
    setSlideB(null);
    activeLayerRef.current = "A";
    setActiveLayer("A");
    currentIndexRef.current = 0;
    if (first.media_type === "video") {
      setTimeout(() => { videoARef.current?.play().catch(() => {}); }, 100);
    }
    if (slides.length > 1) scheduleAdvance(first);
    return () => clearTimer();
  }, [slides, scheduleAdvance]);

  const fitClass = objectFit === "cover" ? "object-cover" : "object-contain";
  const isFade = settings.transition_type === "fade";
  const transitionClass = isFade ? "transition-opacity duration-500 ease-in-out" : "";

  const renderMedia = (slide: Slide | null, videoRef: React.MutableRefObject<HTMLVideoElement | null>) => {
    if (!slide) return null;
    if (slide.media_type === "video") {
      return (
        <video
          ref={videoRef}
          src={slide.image_url}
          className={`w-full h-full ${fitClass}`}
          muted playsInline loop={slides.length === 1}
          onCanPlayThrough={onNextReady}
        />
      );
    }
    return <img src={slide.image_url} alt="" className={`w-full h-full ${fitClass}`} onLoad={onNextReady} />;
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: "hsl(0 0% 0%)", cursor: "none" }}>
      <div className="relative w-full h-full">
        <div
          className={`absolute inset-0 w-full h-full ${transitionClass}`}
          style={{
            opacity: activeLayer === "A" ? 1 : 0,
            zIndex: activeLayer === "A" ? 2 : 1,
            ...(isFade ? {} : { transition: "none" }),
          }}
        >
          {renderMedia(slideA, videoARef)}
        </div>
        <div
          className={`absolute inset-0 w-full h-full ${transitionClass}`}
          style={{
            opacity: activeLayer === "B" ? 1 : 0,
            zIndex: activeLayer === "B" ? 2 : 1,
            ...(isFade ? {} : { transition: "none" }),
          }}
        >
          {renderMedia(slideB, videoBRef)}
        </div>
      </div>

      {settings.ticker_enabled && settings.ticker_text && (
        <div className="fixed bottom-0 left-0 right-0 z-50" style={{ backgroundColor: "hsla(0, 0%, 0%, 0.7)" }}>
          <div className="overflow-hidden h-7 flex items-center">
            <div
              className="whitespace-nowrap text-xs font-medium"
              style={{ color: "hsl(0 0% 95%)", animation: "ticker 30s linear infinite" }}
            >
              {settings.ticker_text}
              <span className="mx-16">{settings.ticker_text}</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
};

export default DisplayPanel;
