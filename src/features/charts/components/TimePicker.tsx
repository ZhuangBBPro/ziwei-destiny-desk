import { useEffect, useState } from "react";

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

interface TimeParts {
  hour: string;
  minute: string;
}

const EMPTY_TIME_PARTS: TimeParts = {
  hour: "",
  minute: "",
};

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [parts, setParts] = useState<TimeParts>(() => parseTimeValue(value));

  useEffect(() => {
    setParts(parseTimeValue(value));
  }, [value]);

  function updatePart(part: keyof TimeParts, nextValue: string) {
    const sanitizedValue = sanitizeTimePart(nextValue, part === "hour" ? 23 : 59);
    const nextParts = {
      ...parts,
      [part]: sanitizedValue,
    };

    setParts(nextParts);
    onChange(formatTimeParts(nextParts));
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 rounded-2xl border border-[#d9c7a9] bg-[#fffaf2] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition focus-within:border-[#b9854c] focus-within:bg-white">
        <TimePartInput
          ariaLabel="输入出生小时"
          placeholder="时"
          value={parts.hour}
          onChange={(nextValue) => updatePart("hour", nextValue)}
        />
        <span className="select-none font-serif text-2xl text-[#8b6b3c]">:</span>
        <TimePartInput
          ariaLabel="输入出生分钟"
          placeholder="分"
          value={parts.minute}
          onChange={(nextValue) => updatePart("minute", nextValue)}
        />
        <span className="ml-auto shrink-0 rounded-full border border-[#e1cfb2] bg-white/70 px-2 py-0.5 text-sm text-[#8b6b3c]">
          24小时制
        </span>
      </div>
      <p className="mt-1 text-xs text-[#8b6b3c]">例如 16:05。输入后统一保存为 HH:mm。</p>
    </div>
  );
}

function TimePartInput({
  ariaLabel,
  placeholder,
  value,
  onChange,
}: {
  ariaLabel: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onPaste={(event) => {
        event.preventDefault();
        onChange(event.clipboardData.getData("text"));
      }}
      className="h-11 w-16 rounded-xl border border-[#eadcc7] bg-white px-3 text-center text-lg font-semibold text-[#2f1b0d] outline-none transition placeholder:text-[#b69a70] focus:border-[#b9854c]"
      placeholder={placeholder}
    />
  );
}

function sanitizeTimePart(value: string, maxValue: number) {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  if (!digits) {
    return "";
  }

  const numericValue = Math.min(Number(digits), maxValue);
  if (digits.length === 1) {
    return String(numericValue);
  }

  return String(numericValue).padStart(2, "0");
}

function formatTimeParts(parts: TimeParts) {
  if (!parts.hour || !parts.minute) {
    return "";
  }

  return `${parts.hour.padStart(2, "0")}:${parts.minute.padStart(2, "0")}`;
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
