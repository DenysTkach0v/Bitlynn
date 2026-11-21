"use client";

import React, { useRef, useState } from "react";

interface VirtualJoystickProps {
  onMove: (vec: { dx: number; dy: number }) => void;
  size?: number;
}

/**
 * Touch & pointer-friendly pixel thumbstick for the Bitlynn underwater crew game.
 * Uses pointer capture + touch-none so dragging works cleanly on smartphones without page scrolling.
 */
export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  size = 112,
}) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const maxRadius = size * 0.34;

  const updateFromPointer = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const rawX = clientX - cx;
    const rawY = clientY - cy;
    const dist = Math.hypot(rawX, rawY);
    const clamped = Math.min(dist, maxRadius);
    const angle = Math.atan2(rawY, rawX);

    const ox = Math.cos(angle) * clamped;
    const oy = Math.sin(angle) * clamped;

    setKnobOffset({ x: ox, y: oy });

    const norm = clamped / maxRadius;
    if (norm < 0.14) {
      onMove({ dx: 0, dy: 0 });
    } else {
      onMove({
        dx: ox / maxRadius,
        dy: oy / maxRadius,
      });
    }
  };

  const resetStick = () => {
    setActive(false);
    setKnobOffset({ x: 0, y: 0 });
    onMove({ dx: 0, dy: 0 });
  };

  return (
    <div
      ref={baseRef}
      role="application"
      aria-label="Віртуальний джойстик руху"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setActive(true);
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!active) return;
        updateFromPointer(e.clientX, e.clientY);
      }}
      onPointerUp={resetStick}
      onPointerCancel={resetStick}
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center rounded-[10px] border-2 touch-none select-none transition-colors ${
        active ? "border-bl-pink bg-bl-ink/90" : "border-bl-wall bg-bl-ink/75"
      }`}
    >
      {/* Pixel D-pad notches */}
      <span aria-hidden className="pointer-events-none absolute top-1.5 h-1.5 w-3 bg-bl-steel" />
      <span aria-hidden className="pointer-events-none absolute bottom-1.5 h-1.5 w-3 bg-bl-steel" />
      <span aria-hidden className="pointer-events-none absolute left-1.5 h-3 w-1.5 bg-bl-steel" />
      <span aria-hidden className="pointer-events-none absolute right-1.5 h-3 w-1.5 bg-bl-steel" />

      {/* Movable thumb knob */}
      <div
        style={{
          transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
          width: size * 0.44,
          height: size * 0.44,
        }}
        className={`pointer-events-none rounded-[6px] border-2 shadow-[0_3px_0_0_#0A0C12] transition-colors ${
          active ? "border-bl-rose bg-bl-pink" : "border-bl-steel bg-bl-wall"
        }`}
      />
    </div>
  );
};
