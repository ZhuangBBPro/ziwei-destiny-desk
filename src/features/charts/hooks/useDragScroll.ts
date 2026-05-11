import { useRef, useState, type PointerEvent } from "react";

export function useDragScroll() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef({
    pointerId: -1,
    startY: 0,
    startScrollTop: 0,
    moved: false,
  });

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollTop: event.currentTarget.scrollTop,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }

    const deltaY = event.clientY - state.startY;
    if (Math.abs(deltaY) > 3) {
      state.moved = true;
      setIsDragging(true);
      event.preventDefault();
    }
    event.currentTarget.scrollTop = state.startScrollTop - deltaY;
  }

  function resetDragState(event: PointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (state.pointerId !== event.pointerId) {
      return;
    }

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    window.setTimeout(() => {
      setIsDragging(false);
    }, 0);
    dragStateRef.current = {
      pointerId: -1,
      startY: 0,
      startScrollTop: 0,
      moved: false,
    };
  }

  return {
    containerRef,
    isDragging,
    dragScrollHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: resetDragState,
      onPointerCancel: resetDragState,
      onLostPointerCapture: resetDragState,
    },
  };
}
