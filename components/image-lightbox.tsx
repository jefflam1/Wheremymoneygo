"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  /** Class applied to the inline thumbnail image. */
  className?: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

function distance(a: React.Touch, b: React.Touch) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

export function ImageLightbox({ src, alt = "", className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
      />
      {open && <Viewer src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function Viewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [t, setT] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [gesturing, setGesturing] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  // Gesture bookkeeping that shouldn't trigger re-renders.
  const g = useRef({
    mode: "none" as "none" | "pan" | "pinch",
    startDist: 0,
    startScale: 1,
    startTx: 0,
    startTy: 0,
    startPx: 0,
    startPy: 0,
    midX: 0,
    midY: 0,
    lastTap: 0,
    moved: false,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const clamp = (s: number) => Math.min(Math.max(s, MIN_SCALE), MAX_SCALE);
  const center = () => {
    const r = stageRef.current!.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  // Zoom while keeping the point (px,py — relative to stage centre) anchored.
  const zoomAround = (
    nextScale: number,
    px: number,
    py: number,
    fromScale: number,
    fromTx: number,
    fromTy: number
  ) => {
    const f = nextScale / fromScale;
    return {
      scale: nextScale,
      x: px - (px - fromTx) * f,
      y: py - (py - fromTy) * f,
    };
  };

  const reset = () => setT({ scale: 1, x: 0, y: 0 });

  const onTouchStart = (e: React.TouchEvent) => {
    const cur = g.current;
    cur.moved = false;
    if (e.touches.length === 2) {
      const { cx, cy } = center();
      cur.mode = "pinch";
      setGesturing(true);
      cur.startDist = distance(e.touches[0], e.touches[1]);
      cur.startScale = t.scale;
      cur.startTx = t.x;
      cur.startTy = t.y;
      cur.midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - cx;
      cur.midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - cy;
    } else if (e.touches.length === 1) {
      const now = e.timeStamp;
      if (now - cur.lastTap < 300) {
        // Double-tap: toggle between fit and zoomed-in at the tap point.
        const { cx, cy } = center();
        if (t.scale > 1) {
          reset();
        } else {
          const px = e.touches[0].clientX - cx;
          const py = e.touches[0].clientY - cy;
          setT(zoomAround(DOUBLE_TAP_SCALE, px, py, 1, 0, 0));
        }
        cur.lastTap = 0;
        cur.mode = "none";
        return;
      }
      cur.lastTap = now;
      cur.mode = "pan";
      setGesturing(true);
      cur.startPx = e.touches[0].clientX;
      cur.startPy = e.touches[0].clientY;
      cur.startTx = t.x;
      cur.startTy = t.y;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const cur = g.current;
    if (cur.mode === "pinch" && e.touches.length === 2) {
      const d = distance(e.touches[0], e.touches[1]);
      const next = clamp((cur.startScale * d) / cur.startDist);
      cur.moved = true;
      setT(
        zoomAround(next, cur.midX, cur.midY, cur.startScale, cur.startTx, cur.startTy)
      );
    } else if (cur.mode === "pan" && e.touches.length === 1) {
      if (t.scale <= 1) return; // nothing to pan when fit-to-screen
      cur.moved = true;
      setT({
        scale: t.scale,
        x: cur.startTx + (e.touches[0].clientX - cur.startPx),
        y: cur.startTy + (e.touches[0].clientY - cur.startPy),
      });
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const cur = g.current;
    if (e.touches.length === 0) {
      cur.mode = "none";
      setGesturing(false);
      if (t.scale <= 1.01) reset();
    } else if (e.touches.length === 1) {
      // Lift one finger after a pinch → continue as a pan.
      cur.mode = "pan";
      cur.startPx = e.touches[0].clientX;
      cur.startPy = e.touches[0].clientY;
      cur.startTx = t.x;
      cur.startTy = t.y;
    }
  };

  // Desktop: wheel to zoom toward the cursor.
  const onWheel = (e: React.WheelEvent) => {
    const { cx, cy } = center();
    const px = e.clientX - cx;
    const py = e.clientY - cy;
    const next = clamp(t.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    if (next === 1) reset();
    else setT(zoomAround(next, px, py, t.scale, t.x, t.y));
  };

  // Desktop: drag to pan when zoomed.
  const onMouseDown = (e: React.MouseEvent) => {
    if (t.scale <= 1) return;
    const cur = g.current;
    cur.mode = "pan";
    setGesturing(true);
    cur.startPx = e.clientX;
    cur.startPy = e.clientY;
    cur.startTx = t.x;
    cur.startTy = t.y;
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const cur = g.current;
    if (cur.mode !== "pan" || e.buttons !== 1 || t.scale <= 1) return;
    cur.moved = true;
    setT({
      scale: t.scale,
      x: cur.startTx + (e.clientX - cur.startPx),
      y: cur.startTy + (e.clientY - cur.startPy),
    });
  };
  const onMouseUp = () => {
    g.current.mode = "none";
    setGesturing(false);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
      >
        <X className="h-5 w-5" />
      </button>

      <div
        ref={stageRef}
        className="flex h-full w-full items-center justify-center overflow-hidden select-none"
        style={{ touchAction: "none" }}
        onClick={(e) => {
          // Tap/click the empty area around the image (when not zoomed) closes.
          if (e.target === e.currentTarget && !g.current.moved && t.scale <= 1) {
            onClose();
          }
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{
            transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`,
            transition: gesturing ? "none" : "transform 150ms ease-out",
            cursor: t.scale > 1 ? "grab" : "default",
          }}
        />
      </div>
    </div>
  );
}
