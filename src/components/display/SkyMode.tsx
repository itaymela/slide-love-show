import { useEffect, useMemo, useRef, useState } from "react";
import { fetchStudents, type Student } from "@/integrations/students/client";

type Props = {
  active: boolean;
  namesPerScreen: number;
  /** Increments each time a new Sky Mode session starts (timer or manual). Used to advance rotation. */
  sessionKey: number;
};

// Module-level rotation cursor so refresh resets it (per spec).
let rotationCursor = 0;

const BASE_SIZE = 110;          // px — minimum bubble diameter
const SCALING_FACTOR = 14;      // px per point
const MAX_SIZE = 320;

export default function SkyMode({ active, namesPerScreen, sessionKey }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [batch, setBatch] = useState<Student[]>([]);
  const lastSessionRef = useRef<number>(-1);

  // Fetch student list when SkyMode becomes active (and on session changes if list is empty).
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const list = await fetchStudents();
      if (!cancelled) setStudents(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  // Pick the next batch when a new session starts.
  useEffect(() => {
    if (!active) return;
    if (students.length === 0) {
      setBatch([]);
      return;
    }
    if (lastSessionRef.current === sessionKey) return;
    lastSessionRef.current = sessionKey;

    const t = Math.max(1, namesPerScreen);
    const next: Student[] = [];
    for (let i = 0; i < Math.min(t, students.length); i++) {
      next.push(students[rotationCursor % students.length]);
      rotationCursor = (rotationCursor + 1) % students.length;
    }
    setBatch(next);
  }, [active, sessionKey, students, namesPerScreen]);

  const bubbles = useMemo(() => {
    return batch.map((s, i) => {
      const size = Math.min(MAX_SIZE, BASE_SIZE + s.points * SCALING_FACTOR);
      const left = Math.random() * 90; // vw %
      const delay = Math.random() * 6; // s
      const duration = 14 + Math.random() * 10; // s, float-up
      const drift = 6 + Math.random() * 8; // s, side drift
      return { key: `${sessionKey}-${i}-${s.full_name}`, name: s.full_name, size, left, delay, duration, drift };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch, sessionKey]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        zIndex: 100,
        background:
          "linear-gradient(180deg, hsl(205 90% 55%) 0%, hsl(210 85% 45%) 55%, hsl(215 80% 35%) 100%)",
        cursor: "none",
      }}
    >
      {/* Animated CSS clouds */}
      <div className="sky-clouds" aria-hidden="true">
        <div className="sky-cloud sky-cloud-1" />
        <div className="sky-cloud sky-cloud-2" />
        <div className="sky-cloud sky-cloud-3" />
        <div className="sky-cloud sky-cloud-4" />
      </div>

      {/* Bubbles */}
      <div className="absolute inset-0">
        {bubbles.map((b) => (
          <div
            key={b.key}
            className="sky-bubble"
            style={{
              width: `${b.size}px`,
              height: `${b.size}px`,
              left: `${b.left}vw`,
              animationDuration: `${b.duration}s, ${b.drift}s`,
              animationDelay: `${b.delay}s, ${b.delay}s`,
            }}
          >
            <span
              className="sky-bubble-label"
              style={{ fontSize: `${Math.max(16, b.size * 0.16)}px` }}
            >
              {b.name}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .sky-clouds { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .sky-cloud {
          position: absolute;
          background: radial-gradient(ellipse at center, hsla(0,0%,100%,0.85) 0%, hsla(0,0%,100%,0.55) 45%, hsla(0,0%,100%,0) 70%);
          border-radius: 50%;
          filter: blur(6px);
          will-change: transform;
          animation: sky-cloud-drift linear infinite;
        }
        .sky-cloud-1 { width: 420px; height: 140px; top: 12%; animation-duration: 90s; }
        .sky-cloud-2 { width: 320px; height: 110px; top: 32%; animation-duration: 120s; animation-delay: -30s; opacity: 0.8; }
        .sky-cloud-3 { width: 500px; height: 160px; top: 58%; animation-duration: 110s; animation-delay: -60s; opacity: 0.7; }
        .sky-cloud-4 { width: 280px; height: 100px; top: 78%; animation-duration: 140s; animation-delay: -15s; opacity: 0.65; }

        @keyframes sky-cloud-drift {
          0%   { transform: translate3d(-30vw, 0, 0); }
          100% { transform: translate3d(130vw, 0, 0); }
        }

        .sky-bubble {
          position: absolute;
          bottom: -25vh;
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 28%, hsla(0,0%,100%,0.55), hsla(0,0%,100%,0.18) 45%, hsla(0,0%,100%,0.08) 70%);
          border: 1.5px solid hsla(0,0%,100%,0.55);
          box-shadow:
            inset 0 0 24px hsla(0,0%,100%,0.35),
            0 8px 32px hsla(220,60%,20%,0.25);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 8%;
          will-change: transform;
          animation-name: sky-float-up, sky-drift-x;
          animation-timing-function: linear, ease-in-out;
          animation-iteration-count: infinite, infinite;
          animation-direction: normal, alternate;
        }
        .sky-bubble-label {
          color: hsl(0 0% 100%);
          font-weight: 700;
          line-height: 1.1;
          text-shadow: 0 2px 6px hsla(220,60%,15%,0.55);
          word-break: break-word;
        }

        @keyframes sky-float-up {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translate3d(0, -140vh, 0); opacity: 0; }
        }
        @keyframes sky-drift-x {
          0%   { margin-left: -28px; }
          100% { margin-left: 28px; }
        }
      `}</style>
    </div>
  );
}