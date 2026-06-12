import { useEffect, useRef } from "react";

interface MobileJoystickProps {
  onMove: (nx: number, ny: number) => void;
  onRelease: () => void;
}

export function MobileJoystick({ onMove, onRelease }: MobileJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(false);
  const centerRef = useRef({ x: 0, y: 0, max: 60 });
  const onMoveRef = useRef(onMove);
  const onReleaseRef = useRef(onRelease);

  onMoveRef.current = onMove;
  onReleaseRef.current = onRelease;

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const updateKnob = (clientX: number, clientY: number) => {
      const { x: cx, y: cy, max } = centerRef.current;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      if (knobRef.current) {
        knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      }
      onMoveRef.current(dx / max, dy / max);
    };

    const reset = () => {
      activeRef.current = false;
      if (knobRef.current) {
        knobRef.current.classList.remove("active");
        knobRef.current.style.transform = "translate(-50%, -50%)";
      }
      onReleaseRef.current();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = base.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        max: rect.width / 2 - 10,
      };
      activeRef.current = true;
      knobRef.current?.classList.add("active");
      const t = e.touches[0];
      if (t) updateKnob(t.clientX, t.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      if (t) updateKnob(t.clientX, t.clientY);
    };

    const onTouchEnd = () => {
      if (!activeRef.current) return;
      reset();
    };

    const touchOpts: AddEventListenerOptions = { passive: false };
    base.addEventListener("touchstart", onTouchStart, touchOpts);
    base.addEventListener("touchmove", onTouchMove, touchOpts);
    base.addEventListener("touchend", onTouchEnd, touchOpts);
    base.addEventListener("touchcancel", onTouchEnd, touchOpts);

    return () => {
      base.removeEventListener("touchstart", onTouchStart);
      base.removeEventListener("touchmove", onTouchMove);
      base.removeEventListener("touchend", onTouchEnd);
      base.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <div className="slingshot-joystick-wrap">
      <div ref={baseRef} className="slingshot-joystick-base">
        <div ref={knobRef} className="slingshot-joystick-knob" />
      </div>
      <span className="slingshot-joystick-label">Drag & release to launch</span>
    </div>
  );
}
