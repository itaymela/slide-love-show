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
  ticker_font_size: number;
  ticker_speed: number;
  transition_duration: number;
  display_scale: number;
  display_offset_x: number;
  display_offset_y: number;
};

const DisplayPanel = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [slideA, setSlideA] = useState<Slide | null>(null);
  const [slideB, setSlideB] = useState<Slide | null>(null);
  const [objectFit, setObjectFit] = useState<"contain" | "cover">("contain");
  const [settings, setSettings] = useState<DisplaySettings>({
    ticker_text: "", ticker_enabled: false, transition_type: "fade",
    ticker_font_size: 14, ticker_speed: 30, transition_duration: 0.5,
    display_scale: 100, display_offset_x: 0, display_offset_y: 0,
  });

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
    const { data } = await supabase.from("settings").select("*").limit(1);
    if (data?.[0]) {
      const raw = data[0] as any;
      const s: DisplaySettings = {
        ticker_text: raw.ticker_text || "",
        ticker_enabled: raw.ticker_enabled ?? false,
        transition_type: raw.transition_type || "fade",
        ticker_font_size: raw.ticker_font_size ?? 14,
        ticker_speed: raw.ticker_speed ?? 30,
        transition_duration: raw.transition_duration ?? 0.5,
        display_scale: raw.display_scale ?? 100,
        display_offset_x: raw.display_offset_x ?? 0,
        display_offset_y: raw.display_offset_y ?? 0,
      };
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
          const triggerDate = (macro as any).trigger_date;
          if (triggerDate && triggerDate !== currentDate) continue;
          const { data: pl } = await supabase.from("playlists").select("is_active").eq("id", macro.target_playlist_id).limit(1);
          if (pl?.[0] && !pl[0].is_active) {
            await supabase.rpc("set_active_playlist", { playlist_id: macro.target_playlist_id });
          }
          break;
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
  const transitionDur = isFade ? `${settings.transition_duration}s` : "0s";

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

  // Prepare ticker text: replace newlines with bullet separator + trailing bullet for seamless loop
  const tickerDisplayText = settings.ticker_text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .join(" ● ") + " ● ";

  const tickerHeight = settings.ticker_font_size + 16;

  // Calibration transform
  const scaleFactor = (settings.display_scale || 100) / 100;
  const offsetX = settings.display_offset_x || 0;
  const offsetY = settings.display_offset_y || 0;
  const calibrationTransform = `scale(${scaleFactor}) translate(${offsetX}px, ${offsetY}px)`;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: "hsl(0 0% 0%)", cursor: "none" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: calibrationTransform,
          transformOrigin: "center center",
        }}
      >
        <div className="relative w-full" style={{ height: settings.ticker_enabled && tickerDisplayText.length > 3 ? `calc(100% - ${tickerHeight}px)` : "100%" }}>
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: activeLayer === "A" ? 1 : 0,
              zIndex: activeLayer === "A" ? 2 : 1,
              transition: `opacity ${transitionDur} ease-in-out`,
            }}
          >
            {renderMedia(slideA, videoARef)}
          </div>
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: activeLayer === "B" ? 1 : 0,
              zIndex: activeLayer === "B" ? 2 : 1,
              transition: `opacity ${transitionDur} ease-in-out`,
            }}
          >
            {renderMedia(slideB, videoBRef)}
          </div>
        </div>

        {settings.ticker_enabled && tickerDisplayText.length > 3 && (
          <div
            className="absolute bottom-0 left-0 right-0 z-50 flex items-center overflow-hidden"
            style={{
              backgroundColor: "hsla(0, 0%, 0%, 0.75)",
              height: `${tickerHeight}px`,
            }}
          >
            <div
              className="whitespace-nowrap font-medium"
              style={{
                color: "hsl(0 0% 95%)",
                fontSize: `${settings.ticker_font_size}px`,
                animation: `ticker-rtl ${settings.ticker_speed}s linear infinite`,
              }}
            >
              {tickerDisplayText}
              <span className="mx-24">{tickerDisplayText}</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ticker-rtl {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }
      `}</style>
    </div>
  );
};

export default DisplayPanel;
