import { useEffect, useRef } from "react";

interface MobileControlsProps {
  onLeft: () => void;
  onRotate: () => void;
  onRight: () => void;
  onDrop: () => void;
}

export function MobileControls({ onLeft, onRotate, onRight, onDrop }: MobileControlsProps) {
  const leftRef = useRef<HTMLButtonElement>(null);
  const rotateRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLButtonElement>(null);
  const onLeftRef = useRef(onLeft);
  const onRotateRef = useRef(onRotate);
  const onRightRef = useRef(onRight);
  const onDropRef = useRef(onDrop);

  onLeftRef.current = onLeft;
  onRotateRef.current = onRotate;
  onRightRef.current = onRight;
  onDropRef.current = onDrop;

  useEffect(() => {
    const bind = (el: HTMLButtonElement | null, action: () => void) => {
      if (!el) return () => {};
      const onTouch = (e: TouchEvent) => {
        e.preventDefault();
        action();
      };
      const touchOpts: AddEventListenerOptions = { passive: false };
      el.addEventListener("touchstart", onTouch, touchOpts);
      return () => el.removeEventListener("touchstart", onTouch);
    };

    const unbindLeft = bind(leftRef.current, () => onLeftRef.current());
    const unbindRotate = bind(rotateRef.current, () => onRotateRef.current());
    const unbindRight = bind(rightRef.current, () => onRightRef.current());
    const unbindDrop = bind(dropRef.current, () => onDropRef.current());

    return () => {
      unbindLeft();
      unbindRotate();
      unbindRight();
      unbindDrop();
    };
  }, []);

  return (
    <div className="block-builder-controls-wrap">
      <button
        ref={leftRef}
        type="button"
        className="block-builder-control-btn"
        aria-label="Move left"
        onClick={() => onLeftRef.current()}
      >
        ←
      </button>
      <button
        ref={rotateRef}
        type="button"
        className="block-builder-control-btn"
        aria-label="Rotate"
        onClick={() => onRotateRef.current()}
      >
        ↻
      </button>
      <button
        ref={rightRef}
        type="button"
        className="block-builder-control-btn"
        aria-label="Move right"
        onClick={() => onRightRef.current()}
      >
        →
      </button>
      <button
        ref={dropRef}
        type="button"
        className="block-builder-control-btn block-builder-control-drop"
        aria-label="Hard drop"
        onClick={() => onDropRef.current()}
      >
        ↓
      </button>
    </div>
  );
}
