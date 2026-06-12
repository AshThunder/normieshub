import { useEffect, useRef } from "react";

interface MobileControlsProps {
  onUp: () => void;
  onDown: () => void;
  onLeft: () => void;
  onRight: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function MobileControls({
  onUp,
  onDown,
  onLeft,
  onRight,
  onRetry,
  showRetry = false,
}: MobileControlsProps) {
  const upRef = useRef<HTMLButtonElement>(null);
  const downRef = useRef<HTMLButtonElement>(null);
  const leftRef = useRef<HTMLButtonElement>(null);
  const rightRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const onUpRef = useRef(onUp);
  const onDownRef = useRef(onDown);
  const onLeftRef = useRef(onLeft);
  const onRightRef = useRef(onRight);
  const onRetryRef = useRef(onRetry);

  onUpRef.current = onUp;
  onDownRef.current = onDown;
  onLeftRef.current = onLeft;
  onRightRef.current = onRight;
  onRetryRef.current = onRetry;

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

    const unbindUp = bind(upRef.current, () => onUpRef.current());
    const unbindDown = bind(downRef.current, () => onDownRef.current());
    const unbindLeft = bind(leftRef.current, () => onLeftRef.current());
    const unbindRight = bind(rightRef.current, () => onRightRef.current());
    const unbindRetry = bind(retryRef.current, () => onRetryRef.current?.());

    return () => {
      unbindUp();
      unbindDown();
      unbindLeft();
      unbindRight();
      unbindRetry();
    };
  }, []);

  return (
    <div className="snake-controls-wrap">
      <div className="snake-dpad">
        <button
          ref={upRef}
          type="button"
          className="snake-control-btn snake-control-up"
          aria-label="Move up"
          onClick={() => onUpRef.current()}
        >
          ↑
        </button>
        <button
          ref={leftRef}
          type="button"
          className="snake-control-btn snake-control-left"
          aria-label="Move left"
          onClick={() => onLeftRef.current()}
        >
          ←
        </button>
        <div className="snake-dpad-center" aria-hidden />
        <button
          ref={rightRef}
          type="button"
          className="snake-control-btn snake-control-right"
          aria-label="Move right"
          onClick={() => onRightRef.current()}
        >
          →
        </button>
        <button
          ref={downRef}
          type="button"
          className="snake-control-btn snake-control-down"
          aria-label="Move down"
          onClick={() => onDownRef.current()}
        >
          ↓
        </button>
      </div>
      {showRetry && onRetry && (
        <button
          ref={retryRef}
          type="button"
          className="snake-retry-btn"
          onClick={() => onRetryRef.current?.()}
        >
          Retry
        </button>
      )}
    </div>
  );
}
