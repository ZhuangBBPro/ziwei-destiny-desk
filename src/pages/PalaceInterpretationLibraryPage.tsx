import { useEffect, useMemo, useState } from "react";
import { palaceInterpretationService } from "@/features/charts/services/palaceInterpretationService";
import type {
  PalaceInterpretationCategory,
  PalaceInterpretationMatchMode,
  PalaceInterpretationRecord,
} from "@/types";

interface EntryFormState {
  id?: string;
  category: PalaceInterpretationCategory;
  title: string;
  aliases: string;
  match_mode: PalaceInterpretationMatchMode;
  content: string;
  is_enabled: boolean;
  sort_order: number;
  source?: PalaceInterpretationRecord["source"];
}

const CATEGORY_OPTIONS: Array<{ value: PalaceInterpretationCategory; label: string }> = [
  { value: "major", label: "主星" },
  { value: "minor", label: "辅星" },
  { value: "misc", label: "杂星" },
];

const MATCH_MODE_OPTIONS: Array<{ value: PalaceInterpretationMatchMode; label: string }> = [
  { value: "any", label: "任一命中" },
  { value: "all", label: "全部命中" },
];

const EMPTY_FORM: EntryFormState = {
  category: "major",
  title: "",
  aliases: "",
  match_mode: "any",
  content: "",
  is_enabled: true,
  sort_order: 100,
  source: "custom",
};

export function PalaceInterpretationLibraryPage() {
  const palaceNames = useMemo(() => palaceInterpretationService.listEditablePalaces(), []);
  const [selectedPalaceName, setSelectedPalaceName] = useState(palaceNames[0] ?? "命宫");
  const [entries, setEntries] = useState<PalaceInterpretationRecord[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryFormState>(EMPTY_FORM);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  const activeEntry = activeEntryId ? entries.find((entry) => entry.id === activeEntryId) : undefined;
  const groupedEntries = groupEntriesByCategory(entries);

  useEffect(() => {
    loadEntries(selectedPalaceName).catch((error) => {
      console.error("Failed to load palace interpretation entries", error);
      setErrorText("文案库读取失败，请查看控制台。");
    });
  }, [selectedPalaceName]);

  useEffect(() => {
    if (!activeEntry) {
      setForm({
        ...EMPTY_FORM,
        sort_order: entries.length + 1,
      });
      return;
    }

    setForm({
      id: activeEntry.id,
      category: activeEntry.category,
      title: activeEntry.title,
      aliases: activeEntry.aliases.join("、"),
      match_mode: activeEntry.match_mode,
      content: activeEntry.content.join("\n"),
      is_enabled: activeEntry.is_enabled,
      sort_order: activeEntry.sort_order,
      source: activeEntry.source,
    });
  }, [activeEntry, entries.length]);

  async function loadEntries(palaceName: string) {
    setErrorText("");
    setStatusText("");
    const nextEntries = await palaceInterpretationService.listEntriesByPalace(palaceName);
    setEntries(nextEntries);
    setActiveEntryId(nextEntries[0]?.id ?? null);
  }

  async function handleSave() {
    setErrorText("");
    setStatusText("");

    if (!form.title.trim()) {
      setErrorText("请输入文案标题。");
      return;
    }

    const aliases = splitTextareaLikeValue(form.aliases);
    if (aliases.length === 0) {
      setErrorText("请输入至少一个星曜别名，例如：天同、文曲。");
      return;
    }

    const content = splitContentLines(form.content);
    if (content.length === 0) {
      setErrorText("请输入至少一行文案正文。");
      return;
    }

    const saved = await palaceInterpretationService.saveEntry({
      id: form.id,
      palace_name: selectedPalaceName,
      category: form.category,
      title: form.title,
      aliases,
      match_mode: form.match_mode,
      content,
      is_enabled: form.is_enabled,
      sort_order: Number(form.sort_order) || 100,
      source: form.source,
    });

    const nextEntries = await palaceInterpretationService.listEntriesByPalace(selectedPalaceName);
    setEntries(nextEntries);
    setActiveEntryId(saved.id);
    setStatusText("已保存，命盘双击气泡会立即使用这版文案。");
  }

  async function handleDelete() {
    if (!form.id) {
      setActiveEntryId(null);
      setForm(EMPTY_FORM);
      return;
    }

    if (!window.confirm("确定删除这条宫位文案吗？删除后双击气泡不会再命中它。")) {
      return;
    }

    await palaceInterpretationService.deleteEntry(form.id);
    const nextEntries = await palaceInterpretationService.listEntriesByPalace(selectedPalaceName);
    setEntries(nextEntries);
    setActiveEntryId(nextEntries[0]?.id ?? null);
    setStatusText("已删除该条文案。");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#fffaf2_0%,#f3e6cf_100%)] p-5 shadow-panel">
        <p className="text-xs uppercase tracking-[0.35em] text-[#9b7f52]">Palace Copy Library</p>
        <h1 className="mt-2 font-serif text-4xl text-[#2f1b0d]">宫位文案库</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5f4830]">
          这里维护 11 个宫位的主星、辅星、杂星命中文案。双击命盘宫位时，会按当前宫位星曜读取这里保存的本地文案。
        </p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-[#2f1b0d]">宫位</h2>
            <span className="text-xs text-[#8b6b3c]">{palaceNames.length} 个</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-1">
            {palaceNames.map((palaceName) => (
              <button
                key={palaceName}
                type="button"
                onClick={() => {
                  setSelectedPalaceName(palaceName);
                  setActiveEntryId(null);
                }}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selectedPalaceName === palaceName
                    ? "border-[#7e2c2c] bg-[#fff4f1] text-[#7e2c2c]"
                    : "border-[#e0cfb2] bg-[#fbf7ef] text-[#59432d] hover:border-[#b9905c]"
                }`}
              >
                {palaceName}
              </button>
            ))}
          </div>
        </aside>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(420px,1fr)]">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-[#2f1b0d]">{selectedPalaceName}条目</h2>
                <p className="mt-1 text-sm text-[#7a6349]">点击条目后在右侧编辑。</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveEntryId(null);
                  setForm({ ...EMPTY_FORM, sort_order: entries.length + 1 });
                }}
                className="rounded-full bg-[#2f1b0d] px-4 py-2 text-sm text-white"
              >
                新增文案
              </button>
            </div>

            <div className="mt-4 space-y-5">
              {CATEGORY_OPTIONS.map((category) => {
                const categoryEntries = groupedEntries.get(category.value) ?? [];
                return (
                  <div key={category.value}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-[#efe1ca] px-3 py-1 text-xs text-[#6f5030]">
                        {category.label}
                      </span>
                      <span className="h-px flex-1 bg-[#eadcc7]" />
                    </div>

                    {categoryEntries.length > 0 ? (
                      <div className="space-y-2">
                        {categoryEntries.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => setActiveEntryId(entry.id)}
                            className={`w-full rounded-2xl border p-3 text-left transition ${
                              activeEntryId === entry.id
                                ? "border-[#7e2c2c] bg-[#fff4f1]"
                                : "border-[#e2cfaf] bg-[#fbf7ef] hover:border-[#b9905c]"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-serif text-base text-[#3a2413]">{entry.title}</span>
                              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] text-[#7b5d39]">
                                {entry.match_mode === "all" ? "全部命中" : "任一命中"}
                              </span>
                              {!entry.is_enabled ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                  已停用
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6e5840]">
                              {entry.content.join(" ")}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-[#dfcfb7] bg-[#fbf7ef] p-3 text-sm text-[#7a6349]">
                        暂无{category.label}文案。
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-4 shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-[#2f1b0d]">
                  {form.id ? "编辑文案" : "新增文案"}
                </h2>
                <p className="mt-1 text-sm text-[#7a6349]">
                  别名用于匹配命盘星曜，正文每一行会作为一段展示。
                </p>
              </div>
              <span className="rounded-full bg-[#f4ead8] px-3 py-1 text-xs text-[#7b5d39]">
                {form.source === "builtin" ? "默认文案" : "自定义文案"}
              </span>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[#4d3926]">标题</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="rounded-2xl border border-[#ddceb6] bg-white px-4 py-3 text-sm outline-none focus:border-[#7e2c2c]"
                  placeholder="例如：天同（安逸来财）"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-[#4d3926]">分类</span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        category: event.target.value as PalaceInterpretationCategory,
                      }))
                    }
                    className="rounded-2xl border border-[#ddceb6] bg-white px-4 py-3 text-sm outline-none focus:border-[#7e2c2c]"
                  >
                    {CATEGORY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-[#4d3926]">命中方式</span>
                  <select
                    value={form.match_mode}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        match_mode: event.target.value as PalaceInterpretationMatchMode,
                      }))
                    }
                    className="rounded-2xl border border-[#ddceb6] bg-white px-4 py-3 text-sm outline-none focus:border-[#7e2c2c]"
                  >
                    {MATCH_MODE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5">
                  <span className="text-sm font-medium text-[#4d3926]">排序</span>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, sort_order: Number(event.target.value) }))
                    }
                    className="rounded-2xl border border-[#ddceb6] bg-white px-4 py-3 text-sm outline-none focus:border-[#7e2c2c]"
                  />
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[#4d3926]">星曜别名</span>
                <input
                  value={form.aliases}
                  onChange={(event) => setForm((prev) => ({ ...prev, aliases: event.target.value }))}
                  className="rounded-2xl border border-[#ddceb6] bg-white px-4 py-3 text-sm outline-none focus:border-[#7e2c2c]"
                  placeholder="用顿号、逗号或换行分隔，例如：文昌、文曲"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[#4d3926]">文案正文</span>
                <textarea
                  value={form.content}
                  onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                  rows={12}
                  className="rounded-2xl border border-[#ddceb6] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#7e2c2c]"
                  placeholder="每行一段，双击气泡中会逐段展示。"
                />
              </label>

              <label className="flex items-center gap-2 rounded-2xl border border-[#ddceb6] bg-[#fbf7ef] px-4 py-3 text-sm text-[#4d3926]">
                <input
                  type="checkbox"
                  checked={form.is_enabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, is_enabled: event.target.checked }))}
                />
                启用这条文案
              </label>

              {errorText ? <p className="rounded-2xl bg-[#fff0ed] px-4 py-3 text-sm text-[#9a2f1f]">{errorText}</p> : null}
              {statusText ? <p className="rounded-2xl bg-[#eef8f2] px-4 py-3 text-sm text-[#2f7b66]">{statusText}</p> : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-full border border-[#d8c5a7] px-4 py-2 text-sm text-[#7b5d39] transition hover:border-[#9a2f1f] hover:text-[#9a2f1f]"
                >
                  {form.id ? "删除" : "清空"}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-full bg-[#7e2c2c] px-5 py-2 text-sm text-white shadow-sm transition hover:bg-[#632121]"
                >
                  保存文案
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function groupEntriesByCategory(entries: PalaceInterpretationRecord[]) {
  return entries.reduce((groups, entry) => {
    const current = groups.get(entry.category) ?? [];
    current.push(entry);
    groups.set(entry.category, current);
    return groups;
  }, new Map<PalaceInterpretationCategory, PalaceInterpretationRecord[]>());
}

function splitTextareaLikeValue(value: string) {
  return value
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitContentLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
