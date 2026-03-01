import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Slide = {
  id: string;
  image_url: string;
  duration: number;
  sort_order: number;
  object_fit: string;
  playlist_id: string;
};

const DisplayPanel = () => {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showA, setShowA] = useState(true);
  const [imageA, setImageA] = useState("");
  const [imageB, setImageB] = useState("");
  const [objectFit, setObjectFit] = useState<"contain" | "cover">("contain");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preloadRef = useRef<HTMLImageElement | null>(null);
  const slidesRef = useRef<Slide[]>([]);
  const currentIndexRef = useRef(0);
  const activePlaylistIdRef = useRef<string | null>(null);

  const fetchActiveSlides = useCallback(async () => {
    // Get active playlist
    const { data: playlists } = await supabase
      .from("playlists")
      .select("id")
      .eq("is_active", true)
      .limit(1);

    const activeId = playlists?.[0]?.id;
    activePlaylistIdRef.current = activeId || null;

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

  // Realtime: listen for changes on both playlists and slides
  useEffect(() => {
    const channel = supabase
      .channel("display-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playlists" },
        () => fetchActiveSlides()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "slides" },
        () => fetchActiveSlides()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveSlides]);

  // Preload next image
  const preloadNext = useCallback((nextIdx: number) => {
    const s = slidesRef.current;
    if (s.length === 0) return;
    const img = new Image();
    img.src = s[nextIdx % s.length].image_url;
    preloadRef.current = img;
  }, []);

  // Initialize first image
  useEffect(() => {
    if (slides.length > 0) {
      setImageA(slides[0].image_url);
      setImageB(slides.length > 1 ? slides[1].image_url : slides[0].image_url);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setShowA(true);
      preloadNext(1);
    }
  }, [slides, preloadNext]);

  // Slideshow timer
  useEffect(() => {
    if (slides.length === 0) return;

    const advance = () => {
      const s = slidesRef.current;
      if (s.length === 0) return;

      const cur = currentIndexRef.current;
      const next = (cur + 1) % s.length;

      setShowA((prev) => {
        if (prev) {
          setImageB(s[next].image_url);
        } else {
          setImageA(s[next].image_url);
        }
        return !prev;
      });

      currentIndexRef.current = next;
      setCurrentIndex(next);
      preloadNext((next + 1) % s.length);
      timerRef.current = setTimeout(advance, s[next].duration * 1000);
    };

    timerRef.current = setTimeout(
      advance,
      slides[currentIndexRef.current]?.duration * 1000 || 5000
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [slides, preloadNext]);

  const fitClass = objectFit === "cover" ? "object-cover" : "object-contain";

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: "hsl(0 0% 0%)", cursor: "none" }}
    >
      <div className="relative w-full h-full">
        <img
          src={imageA}
          alt=""
          className={`absolute inset-0 w-full h-full ${fitClass} transition-opacity duration-1000 ease-in-out`}
          style={{ opacity: showA ? 1 : 0 }}
        />
        <img
          src={imageB}
          alt=""
          className={`absolute inset-0 w-full h-full ${fitClass} transition-opacity duration-1000 ease-in-out`}
          style={{ opacity: showA ? 0 : 1 }}
        />
      </div>
    </div>
  );
};

export default DisplayPanel;
