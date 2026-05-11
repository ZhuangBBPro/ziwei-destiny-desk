import { useEffect, useRef, useState } from "react";
import { useDragScroll } from "@/features/charts/hooks/useDragScroll";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

interface TimeParts {
  hour: string;
  minute: string;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
const EMPTY_TIME_PARTS: TimeParts = {
  hour: "",
  minute: "",
};

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [parts, setParts] = useState<TimeParts>(() => parseTimeValue(value));

  useEffect(() => {
    if (!isOpen) {
      setParts(parseTimeValue(value));
    }
  }, [isOpen, value]);

  function handleConfirm() {
    if (!parts.hour || !parts.minute) {
      return;
    }
    onChange(`${parts.hour}:${parts.minute}`);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="选择出生时间"
        onClick={() => setIsOpen(true)}
        className="mt-2 flex w-full items-center justify-between rounded-2xl border border-[#d9c7a9] bg-[#fffaf2] px-4 py-3 text-left text-[#4d3926] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition hover:border-[#b9854c] hover:bg-white"
      >
        <span className={value ? "text-[#2f1b0d]" : "text-[#9b7f52]"}>{value || "选择时间"}</span>
        <span className="rounded-full border border-[#e1cfb2] bg-white/70 px-2 py-0.5 text-sm text-[#8b6b3c]">24小时制</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#7b684f]/14 px-3 py-4 backdrop-blur-[1px] sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-[1.9rem] border border-[#eadcc7] bg-[#fffdf8] shadow-[0_22px_60px_rgba(80,54,28,0.16)]">
            <div className="border-b border-[#eadcc7] bg-[linear-gradient(135deg,#fffdf8_0%,#fbf1e1_100%)] p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-[#9b7f52]">Birth Time</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2f1b0d]">选择出生时间</h3>
              <p className="mt-1 text-sm text-[#7b5d3b]">统一输出为 24 小时制 HH:mm。</p>
            </div>

            <div className="relative grid h-72 grid-cols-2 overflow-hidden bg-white px-8 py-4">
              <div className="pointer-events-none absolute left-6 right-6 top-1/2 z-10 h-12 -translate-y-1/2 rounded-2xl border-y border-[#dfc9a7] bg-white/72 shadow-[0_4px_12px_rgba(85,53,25,0.06)]" />
              <PickerColumn
                label="时"
                items={HOUR_OPTIONS}
                activeIndex={Math.max(HOUR_OPTIONS.indexOf(parts.hour), 0)}
                onSelect={(hour) => setParts((current) => ({ ...current, hour }))}
              />
              <PickerColumn
                label="分"
                items={MINUTE_OPTIONS}
                activeIndex={Math.max(MINUTE_OPTIONS.indexOf(parts.minute), 0)}
                onSelect={(minute) => setParts((current) => ({ ...current, minute }))}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/70 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/70 to-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-[#eadcc7] bg-white/95 p-3">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-2xl border border-[#d9c7a9] bg-white py-3 text-[#7b5d3b] transition hover:border-[#b9854c]">
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!parts.hour || !parts.minute}
                className="rounded-2xl bg-[#3a2413] py-3 font-medium text-white shadow-[0_10px_24px_rgba(58,36,19,0.22)] transition hover:bg-[#5a3419] disabled:opacity-50"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PickerColumn({
  label,
  items,
  activeIndex,
  onSelect,
}: {
  label: string;
  items: string[];
  activeIndex: number;
  onSelect: (value: string) => void;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { containerRef, isDragging, dragScrollHandlers } = useDragScroll();

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "center" });
  }, [activeIndex, items]);

  return (
    <div
      ref={containerRef}
      className={`relative z-20 overflow-y-auto overscroll-contain px-2 py-[5.9rem] [scrollbar-width:none] ${
        isDragging ? "cursor-grabbing select-none" : "cursor-grab"
      }`}
      {...dragScrollHandlers}
    >
      <div className="grid gap-1">
        {items.map((item, index) => (
          <button
            key={item}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            onClick={() => {
              if (!isDragging) {
                onSelect(item);
              }
            }}
            className={`h-12 rounded-xl px-2 text-center text-lg transition ${
              index === activeIndex ? "font-semibold text-[#2f1b0d]" : "text-[#8b6b3c]"
            }`}
          >
            {item}
            <span className="ml-1 text-sm">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function parseTimeValue(value: string): TimeParts {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    return EMPTY_TIME_PARTS;
  }

  return {
    hour: match[1],
    minute: match[2],
  };
}
