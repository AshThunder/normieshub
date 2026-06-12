import { useEffect, useRef } from "react";

interface MobileLanePadProps {
  onLeft: () => void;
  onRight: () => void;
}

export function MobileLanePad({ onLeft, onRight }: MobileLanePadProps) {
  const leftRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const onLeftRef = useRef(onLeft);
  const onRightRef = useRef(onRight);

  onLeftRef.current = onLeft;
  onRightRef.current = onRight;

  useEffect(() => {
    const bind = (el: HTMLButtonElement | null, action: () => void) => {
      if (!el) return () => {};

      const onTouch = (e: TouchEvent) => {
        e.preventDefault();
        action();
      };

      const touchOpts: AddEventListenerOptions = { passive: false };
      el.addEventListener("touchstart", onTouch, touchOpts);

      return () => {
        el.removeEventListener("touchstart", onTouch);
      };
    };

    const unbindLeft = bind(leftRef.current, () => onLeftRef.current());
    const unbindRight = bind(rightRef.current, () => onRightRef.current());

    return () => {
      unbindLeft();
      unbindRight();
    };
  }, []);

  return (
    <div className="runner-lane-pad-wrap">
      <button
        ref={leftRef}
        type="button"
        className="runner-lane-btn"
        aria-label="Move left"
        onClick={() => onLeftRef.current()}
      >
        ←
      </button>
      <span className="runner-lane-label">Tap to switch lanes</span>
      <button
        ref={rightRef}
        type="button"
        className="runner-lane-btn"
        aria-label="Move right"
        onClick={() => onRightRef.current()}
      >
        →
      </button>
    </div>
  );
}
