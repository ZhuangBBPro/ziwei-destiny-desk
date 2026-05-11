import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CardSection } from "@/components/ui/CardSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { caseService } from "@/features/cases/services/caseService";
import type { TagRecord } from "@/types";

interface CaseLibraryItem {
  id: string;
  chart_id: string;
  case_code: string;
  consultation_topic: string;
  status: string;
  chart_subject_name: string;
  initial_summary: string;
  updated_at: string;
  tags: TagRecord[];
}

const statusOptions = [
  { value: "", label: "全部状态" },
  { value: "active", label: "active" },
  { value: "follow_up", label: "follow_up" },
  { value: "reviewed", label: "reviewed" },
  { value: "closed", label: "closed" },
  { value: "archived", label: "archived" },
];

export function CaseLibraryPage() {
  const [items, setItems] = useState<CaseLibraryItem[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [keyword, setKeyword] = useState("");
  const [noteKeyword, setNoteKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "last_activity_at">("last_activity_at");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [openMenuCaseId, setOpenMenuCaseId] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

  async function load() {
    const result = await caseService.queryCaseLibrary({
      keyword: keyword || undefined,
      noteKeyword: noteKeyword || undefined,
      status: status || undefined,
      tagIds: selectedTagIds.length ? selectedTagIds : undefined,
      sortBy,
    });
    setItems(result.cases as CaseLibraryItem[]);
    setTags(result.tags);
  }

  useEffect(() => {
    load().catch((error) => {
      console.error("Failed to load case library", error);
    });
  }, [keyword, noteKeyword, status, sortBy, selectedTagIds.join(",")]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((item) => item !== tagId) : [...current, tagId],
    );
  }

  async function handleDeleteCase(item: CaseLibraryItem) {
    setOpenMenuCaseId(null);
    if (!window.confirm(`确定删除「${item.chart_subject_name || item.case_code}」吗？这会删除完整资料，包括命盘、宫位、星曜、四化、案例、批注、时间线、标签关系和规则命中。`)) {
      return;
    }

    setDeletingCaseId(item.id);
    try {
      await caseService.deleteCase(item.id);
      await load();
    } catch (error) {
      console.error("Failed to delete case", error);
      window.alert("删除案例失败，请查看控制台日志。");
    } finally {
      setDeletingCaseId(null);
    }
  }

  return (
    <div className="space-y-6">
      <CardSection
        title="案例库"
        description="支持按姓名 / 代号、主题、批注关键词、标签、状态与最近活动进行筛选。"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">姓名 / 代号 / 主题</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="搜索命主姓名、代号或主题"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">批注关键词</span>
            <input
              value={noteKeyword}
              onChange={(event) => setNoteKeyword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="搜索批注标题或内容"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">状态</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              {statusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">排序</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as "created_at" | "last_activity_at")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="last_activity_at">最近活动</option>
              <option value="created_at">创建时间</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => {
            const active = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full px-3 py-2 text-xs transition ${
                  active ? "text-white" : "bg-white text-slate-700"
                }`}
                style={{ backgroundColor: active ? tag.color : undefined, border: `1px solid ${tag.color}` }}
              >
                {tag.tag_name}
              </button>
            );
          })}
        </div>
      </CardSection>

      <CardSection title={`结果 (${items.length})`}>
        <div className="space-y-4">
          {items.length === 0 ? (
            <EmptyState title="暂无匹配案例" description="尝试调整筛选条件，或先在命盘详情页创建案例。" />
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <Link to={`/charts/${item.chart_id}/cases/${item.id}`} className="min-w-0 flex-1 pr-12">
                    <div>
                      <p className="font-medium text-slate-900">
                        {item.chart_subject_name || item.case_code}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.consultation_topic || "未填写咨询主题"}
                      </p>
                      {item.initial_summary ? (
                        <p className="mt-2 text-sm leading-6 text-slate-500 line-clamp-2">
                          {item.initial_summary}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="rounded-full px-2 py-1 text-xs text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.tag_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </Link>
                  <p className="pr-12 text-xs text-slate-500 md:text-right">
                    更新于 {new Date(item.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="absolute right-3 top-3">
                  <button
                    type="button"
                    onClick={() => setOpenMenuCaseId((current) => (current === item.id ? null : item.id))}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-800"
                    aria-label={`打开${item.chart_subject_name || item.case_code}操作菜单`}
                  >
                    ...
                  </button>
                  {openMenuCaseId === item.id ? (
                    <div className="absolute right-0 z-20 mt-2 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_14px_34px_rgba(15,23,42,0.14)]">
                      <button
                        type="button"
                        disabled={deletingCaseId === item.id}
                        onClick={() => handleDeleteCase(item)}
                        className="block w-full px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        {deletingCaseId === item.id ? "删除中..." : "删除案例"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </CardSection>
    </div>
  );
}
