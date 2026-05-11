import { useEffect, useMemo, useRef, useState } from "react";
import { CHINA_LOCATIONS, type ChinaCity, type ChinaProvince } from "@/features/charts/lib/chinaLocations";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
}

interface LocationSelection {
  provinceIndex: number;
  cityIndex: number;
  districtIndex: number;
}

interface LocationSearchResult extends LocationSelection {
  label: string;
}

const EMPTY_SELECTION: LocationSelection = {
  provinceIndex: 0,
  cityIndex: 0,
  districtIndex: 0,
};

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selection, setSelection] = useState<LocationSelection>(() => selectionFromValue(value));

  useEffect(() => {
    if (!isOpen) {
      setSelection(selectionFromValue(value));
    }
  }, [isOpen, value]);

  function handleConfirm(nextValue = formatSelection(selection)) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="选择出生地点"
        onClick={() => setIsOpen(true)}
        className="mt-2 flex w-full items-center justify-between rounded-2xl border border-[#d9c7a9] bg-[#fffaf2] px-4 py-3 text-left text-[#4d3926] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition hover:border-[#b9854c] hover:bg-white"
      >
        <span className={value ? "text-[#2f1b0d]" : "text-[#9b7f52]"}>{value || "选择出生地点"}</span>
        <span className="rounded-full border border-[#e1cfb2] bg-white/70 px-2 py-0.5 text-sm text-[#8b6b3c]">选择</span>
      </button>

      {isOpen ? (
        <LocationPickerDialog
          value={value}
          selection={selection}
          onSelectionChange={setSelection}
          onCancel={() => setIsOpen(false)}
          onConfirm={handleConfirm}
        />
      ) : null}
    </>
  );
}

function LocationPickerDialog({
  value,
  selection,
  onSelectionChange,
  onCancel,
  onConfirm,
}: {
  value: string;
  selection: LocationSelection;
  onSelectionChange: (selection: LocationSelection) => void;
  onCancel: () => void;
  onConfirm: (value?: string) => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState(value);
  const [notice, setNotice] = useState("");
  const province = CHINA_LOCATIONS[selection.provinceIndex] ?? CHINA_LOCATIONS[0];
  const city = province.cities[selection.cityIndex] ?? province.cities[0];
  const district = city.districts[selection.districtIndex] ?? city.districts[0];
  const searchResults = useMemo(() => searchLocations(keyword), [keyword]);

  function updateProvince(provinceIndex: number) {
    onSelectionChange({
      provinceIndex,
      cityIndex: 0,
      districtIndex: 0,
    });
  }

  function updateCity(cityIndex: number) {
    onSelectionChange({
      ...selection,
      cityIndex,
      districtIndex: 0,
    });
  }

  function updateDistrict(districtIndex: number) {
    onSelectionChange({
      ...selection,
      districtIndex,
    });
  }

  function selectSearchResult(result: LocationSearchResult) {
    onSelectionChange({
      provinceIndex: result.provinceIndex,
      cityIndex: result.cityIndex,
      districtIndex: result.districtIndex,
    });
    setKeyword("");
    setManualMode(false);
  }

  function handleCurrentLocation() {
    setNotice("当前版本为完全本地离线工具，不调用联网逆地理解析；请用搜索或手动输入定位到出生地。");
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#2b1b11]/45 px-3 py-4 backdrop-blur-[2px] sm:items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-[1.9rem] border border-[#d2b994] bg-[#f7eddc] shadow-[0_28px_90px_rgba(47,27,13,0.32)]">
        <div className="border-b border-[#dfc9a7] bg-[linear-gradient(135deg,#fffaf2_0%,#f1dfc2_100%)] p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-[#9b7f52]">Birth Place</p>
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setManualMode(false);
                setNotice("");
              }}
              className="min-w-0 flex-1 rounded-2xl border border-[#d9c7a9] bg-white/90 px-4 py-3 text-base text-[#3a2413] outline-none transition focus:border-[#b9854c]"
              placeholder="输入市县区名称关键词可快速定位"
            />
            <button
              type="button"
              onClick={() => setKeyword(keyword.trim())}
              className="rounded-2xl border border-[#d9c7a9] bg-white/80 px-4 text-xl text-[#8b6b3c] transition hover:border-[#b9854c] hover:bg-white"
              aria-label="搜索出生地点"
            >
              ⌕
            </button>
          </div>

          {searchResults.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {searchResults.map((result) => (
                <button
                  key={result.label}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="shrink-0 rounded-full border border-[#d3b083] bg-[#fff8eb] px-3 py-1.5 text-xs text-[#6e4422] transition hover:border-[#9b5b2e]"
                >
                  {result.label}
                </button>
              ))}
            </div>
          ) : null}

          {notice ? <p className="mt-2 rounded-xl bg-[#fff4d7] px-3 py-2 text-xs text-[#8a5b1f]">{notice}</p> : null}
        </div>

        {manualMode ? (
          <div className="bg-[#fffaf2] px-4 py-5">
            <label className="block">
              <span className="text-sm font-medium text-[#4d3926]">手动输入出生地点</span>
              <input
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#d9c7a9] bg-white px-4 py-3 text-[#3a2413] outline-none transition focus:border-[#b9854c]"
                placeholder="例如：江西省 南昌市 红谷滩区"
              />
            </label>
          </div>
        ) : (
          <div className="relative grid h-72 grid-cols-3 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#fff9ef_0%,#ead7ba_55%,#d9bd96_100%)] px-3 py-4">
            <div className="pointer-events-none absolute left-4 right-4 top-1/2 z-10 h-12 -translate-y-1/2 rounded-2xl border-y border-[#9e6a3e] bg-[#fff1d6]/70 shadow-[0_8px_22px_rgba(85,53,25,0.18)]" />
            <PickerColumn
              items={CHINA_LOCATIONS.map((item) => item.name)}
              activeIndex={selection.provinceIndex}
              onSelect={updateProvince}
            />
            <PickerColumn
              items={province.cities.map((item) => item.name)}
              activeIndex={selection.cityIndex}
              onSelect={updateCity}
            />
            <PickerColumn
              items={city.districts.map((item) => item.name)}
              activeIndex={selection.districtIndex}
              onSelect={updateDistrict}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#6b4425]/20 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#6b4425]/20 to-transparent" />
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 border-t border-[#dfc9a7] bg-[#fffaf2]/95 p-3">
          <button type="button" onClick={onCancel} className="rounded-2xl border border-[#d9c7a9] bg-white py-3 text-[#7b5d3b] transition hover:border-[#b9854c]">
            取消
          </button>
          <button type="button" onClick={handleCurrentLocation} className="rounded-2xl border border-[#d9c7a9] bg-white py-3 text-[#7b5d3b] transition hover:border-[#b9854c]">
            当前位置
          </button>
          <button
            type="button"
            onClick={() => setManualMode((current) => !current)}
            className="rounded-2xl border border-[#d9c7a9] bg-white py-3 text-[#7b5d3b] transition hover:border-[#b9854c]"
          >
            手动输入
          </button>
          <button
            type="button"
            onClick={() => onConfirm(manualMode ? manualValue.trim() : formatLocation(province, city, district.name))}
            className="rounded-2xl bg-[#3a2413] py-3 font-medium text-white shadow-[0_10px_24px_rgba(58,36,19,0.22)] transition hover:bg-[#5a3419]"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

function PickerColumn({
  items,
  activeIndex,
  onSelect,
}: {
  items: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "center" });
  }, [activeIndex, items]);

  return (
    <div className="relative z-20 overflow-y-auto overscroll-contain px-1 py-[5.9rem] [scrollbar-width:none]">
      <div className="grid gap-1">
        {items.map((item, index) => (
          <button
            key={item}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            type="button"
            onClick={() => onSelect(index)}
            className={`h-12 rounded-xl px-2 text-center text-base transition ${
              index === activeIndex ? "font-semibold text-[#2f1b0d]" : "text-[#8b6b3c]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function selectionFromValue(value: string): LocationSelection {
  if (!value) {
    return EMPTY_SELECTION;
  }

  for (let provinceIndex = 0; provinceIndex < CHINA_LOCATIONS.length; provinceIndex += 1) {
    const province = CHINA_LOCATIONS[provinceIndex];
    if (!value.includes(province.name)) {
      continue;
    }

    const cityIndex = Math.max(
      province.cities.findIndex((cityItem) => value.includes(cityItem.name)),
      0,
    );
    const city = province.cities[cityIndex];
    const districtIndex = Math.max(
      city.districts.findIndex((districtItem) => value.includes(districtItem.name)),
      0,
    );
    return { provinceIndex, cityIndex, districtIndex };
  }

  return EMPTY_SELECTION;
}

function searchLocations(keyword: string): LocationSearchResult[] {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) {
    return [];
  }

  const results: LocationSearchResult[] = [];
  CHINA_LOCATIONS.forEach((province, provinceIndex) => {
    province.cities.forEach((cityItem, cityIndex) => {
      cityItem.districts.forEach((districtItem, districtIndex) => {
        const label = formatLocation(province, cityItem, districtItem.name);
        if ([province.name, cityItem.name, districtItem.name, label].some((item) => item.includes(normalizedKeyword))) {
          results.push({ provinceIndex, cityIndex, districtIndex, label });
        }
      });
    });
  });

  return results.slice(0, 12);
}

function formatSelection(selection: LocationSelection) {
  const province = CHINA_LOCATIONS[selection.provinceIndex] ?? CHINA_LOCATIONS[0];
  const cityItem = province.cities[selection.cityIndex] ?? province.cities[0];
  const district = cityItem.districts[selection.districtIndex]?.name ?? cityItem.districts[0]?.name ?? "";
  return formatLocation(province, cityItem, district);
}

function formatLocation(province: ChinaProvince, cityItem: ChinaCity, district: string) {
  return [province.name, cityItem.name, district].filter(Boolean).join(" ");
}
