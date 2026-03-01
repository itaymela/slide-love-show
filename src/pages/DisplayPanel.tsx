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

/**
 * Double-buffer display with video preloading.
 * Two layers (A/B) alternate. The "next" layer preloads while the "current" plays.
 * For videos, we wait for onCanPlayThrough before transitioning.
 */
const DisplayPanel = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeLayer, setActiveLayer] = useState<"A" | "B">("A");
  const [slideA, setSlideA] = useState<Slide | null>(null);
  const [slideB, setSlideB] = useState<Slide | null>(null);
  const [objectFit, setObjectFit] = useState<"contain" | "cover">("contain");

  const slidesRef = useRef<Slide[]>([]);
  const currentIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeLayerRef = useRef<"A" | "B">("A");
  const nextReadyRef = useRef(false);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Fetch active playlist slides
  const fetchActiveSlides = useCallback(async () => {
    const { data: playlists } = await supabase
      .from("playlists")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    const activeId = playlists?.[0]?.id;
    if (!activeId) {
      slidesRef.current = [];
      setSlides([]);
      return;
    }

    const { data } = await supabase
      .from("slides")
      .select("*")
      .eq("playlist_id", activeId)
      .order("sort_order", { ascending: true });

    if (data && data.length > 0) {
      slidesRef.current = data;
      setSlides(data);
      setObjectFit(data[0].object_fit as "contain" | "cover");
    } else {
      slidesRef.current = [];
      setSlides([]);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchActiveSlides();
  }, [fetchActiveSlides]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("display-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "playlists" }, () => fetchActiveSlides())
      .on("postgres_changes", { event: "*", schema: "public", table: "slides" }, () => fetchActiveSlides())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveSlides]);

  // Schedule the next advance after the current slide's duration
  const scheduleAdvance = useCallback((slide: Slide) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      advance();
    }, slide.duration * 1000);
  }, []);

  // Called when the "next" layer signals it's ready
  const onNextReady = useCallback(() => {
    nextReadyRef.current = true;
  }, []);

  // Core advance function
  const advance = useCallback(() => {
    const s = slidesRef.current;
    if (s.length === 0) return;

    const cur = currentIndexRef.current;
    const next = (cur + 1) % s.length;
    const nextSlide = s[next];
    const currentLayer = activeLayerRef.current;
    const nextLayer = currentLayer === "A" ? "B" : "A";

    // Preload next slide into the inactive layer
    if (nextLayer === "A") {
      setSlideA(nextSlide);
    } else {
      setSlideB(nextSlide);
    }

    // If next is an image, it's ready immediately via onLoad
    // If next is a video, we wait for onCanPlayThrough
    if (nextSlide.media_type === "video") {
      nextReadyRef.current = false;
      // Poll until the video signals ready, then swap
      const waitForReady = () => {
        if (nextReadyRef.current) {
          doSwap(nextLayer, next, nextSlide);
        } else {
          // Keep current slide visible, check again in 100ms
          setTimeout(waitForReady, 100);
        }
      };
      // Give a small delay for the video element to start loading
      setTimeout(waitForReady, 50);
    } else {
      // For images, swap after a brief moment for the img to render
      nextReadyRef.current = false;
      const waitForReady = () => {
        if (nextReadyRef.current) {
          doSwap(nextLayer, next, nextSlide);
        } else {
          setTimeout(waitForReady, 50);
        }
      };
      setTimeout(waitForReady, 50);
    }
  }, []);

  const doSwap = useCallback((nextLayer: "A" | "B", nextIndex: number, nextSlide: Slide) => {
    // Start playing video if applicable
    if (nextSlide.media_type === "video") {
      const videoEl = nextLayer === "A" ? videoARef.current : videoBRef.current;
      if (videoEl) {
        videoEl.currentTime = 0;
        videoEl.play().catch(() => {});
      }
    }

    activeLayerRef.current = nextLayer;
    setActiveLayer(nextLayer);
    currentIndexRef.current = nextIndex;

    // Pause old video
    const oldLayer = nextLayer === "A" ? "B" : "A";
    const oldVideo = oldLayer === "A" ? videoARef.current : videoBRef.current;
    if (oldVideo) {
      oldVideo.pause();
    }

    scheduleAdvance(nextSlide);
  }, [scheduleAdvance]);

  // Wire scheduleAdvance to use advance
  useEffect(() => {
    // Re-bind scheduleAdvance's closure reference
    // This is handled by the timeout calling advance() directly
  }, [advance]);

  // Initialize first slide
  useEffect(() => {
    if (slides.length === 0) return;
    clearTimer();

    const first = slides[0];
    setSlideA(first);
    setSlideB(null);
    activeLayerRef.current = "A";
    setActiveLayer("A");
    currentIndexRef.current = 0;

    // Start playing if video
    if (first.media_type === "video") {
      setTimeout(() => {
        videoARef.current?.play().catch(() => {});
      }, 100);
    }

    // If only one slide and it's a video, let it loop naturally
    if (slides.length > 1) {
      scheduleAdvance(first);
    }

    return () => clearTimer();
  }, [slides, scheduleAdvance]);

  const fitClass = objectFit === "cover" ? "object-cover" : "object-contain";

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: "hsl(0 0% 0%)", cursor: "none" }}
    >
      <div className="relative w-full h-full">
        {/* Layer A */}
        <div
          className="absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out"
          style={{ opacity: activeLayer === "A" ? 1 : 0, zIndex: activeLayer === "A" ? 2 : 1 }}
        >
          {slideA && slideA.media_type === "video" ? (
            <video
              ref={videoARef}
              src={slideA.image_url}
              className={`w-full h-full ${fitClass}`}
              muted
              playsInline
              loop={slides.length === 1}
              onCanPlayThrough={onNextReady}
            />
          ) : slideA ? (
            <img
              src={slideA.image_url}
              alt=""
              className={`w-full h-full ${fitClass}`}
              onLoad={onNextReady}
            />
          ) : null}
        </div>

        {/* Layer B */}
        <div
          className="absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out"
          style={{ opacity: activeLayer === "B" ? 1 : 0, zIndex: activeLayer === "B" ? 2 : 1 }}
        >
          {slideB && slideB.media_type === "video" ? (
            <video
              ref={videoBRef}
              src={slideB.image_url}
              className={`w-full h-full ${fitClass}`}
              muted
              playsInline
              loop={slides.length === 1}
              onCanPlayThrough={onNextReady}
            />
          ) : slideB ? (
            <img
              src={slideB.image_url}
              alt=""
              className={`w-full h-full ${fitClass}`}
              onLoad={onNextReady}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DisplayPanel;
