import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CardSection } from "@/components/ui/CardSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { chartService } from "@/features/charts/services/chartService";
import { caseService } from "@/features/cases/services/caseService";
import { getRecentChartViews } from "@/lib/recentViews";
import type { ChartRecord } from "@/types";

interface DashboardCaseItem {
  id: string;
  case_code: string;
  consultation_topic: string;
  status: string;
  chart_id: string;
  chart_subject_name: string;
}

export function DashboardPage() {
  const [recentViewedCharts, setRecentViewedCharts] = useState<ChartRecord[]>([]);
  const [recentCases, setRecentCases] = useState<DashboardCaseItem[]>([]);
  const [openMenuCaseId, setOpenMenuCaseId] = useState<string | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

  async function load() {
    const recentViewedIds = getRecentChartViews();
    const [viewedCharts, caseLibrary] = await Promise.all([
      chartService.listChartsByIds(recentViewedIds),
      caseService.queryCaseLibrary({ sortBy: "last_activity_at" }),
    ]);

    const cases = caseLibrary.cases as DashboardCaseItem[];
    setRecentViewedCharts(viewedCharts);
    setRecentCases(cases.slice(0, 5));
  }

  useEffect(() => {
    load().catch((error) => {
      console.error("Failed to load dashboard", error);
    });
  }, []);

  async function handleDeleteCase(item: DashboardCaseItem) {
    setOpenMenuCaseId(null);
    if (!window.confirm(`确定删除「${item.chart_subject_name || item.case_code}」吗？这会删除完整资料，包括命盘、宫位、星曜、四化、案例、批注、时间线、标签关系和规则命中。`)) {
      return;
    }

    setDeletingCaseId(item.id);
    try {
      await caseService.deleteCase(item.id);
      await load();
    } catch (error) {
      console.error("Failed to delete dashboard case", error);
      window.alert("删除案例失败，请查看控制台日志。");
    } finally {
      setDeletingCaseId(null);
    }
  }

  return (
    <div className="space-y-6">
      <CardSection className="bg-white/78">
        <p className="text-sm uppercase tracking-[0.22em] text-gold">Workbench</p>
        <h1 className="mt-3 font-serif text-3xl text-ink">紫微斗数命盘工作台</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          第一版聚焦真实排盘、案例留痕、标签检索、批注复盘与轻量规则提示。
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/charts/new"
            className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white"
          >
            快速新建命盘
          </Link>
          <Link
            to="/cases"
            className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700"
          >
            打开案例库
          </Link>
        </div>
      </CardSection>

      <div className="grid gap-4 xl:grid-cols-2">
        <CardSection title="最近查看命盘">
          <div className="space-y-3">
            {recentViewedCharts.length === 0 ? (
              <EmptyState title="还没有浏览记录" description="打开命盘详情后，这里会保留最近查看入口。" />
            ) : (
              recentViewedCharts.map((chart) => (
                <Link
                  key={chart.id}
                  to={`/charts/${chart.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-medium text-slate-900">{chart.subject_name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    命主 {chart.life_master_star || "未知"} / 身主 {chart.body_master_star || "未知"}
                  </p>
                </Link>
              ))
            )}
          </div>
        </CardSection>

        <CardSection title="最近新增案例">
          <div className="space-y-3">
            {recentCases.length === 0 ? (
              <EmptyState title="还没有案例" description="创建命盘后会自动生成主案例并进入案例库。" />
            ) : (
              recentCases.map((item) => (
                <article
                  key={item.id}
                  className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <Link to={`/charts/${item.chart_id}/cases/${item.id}`} className="block pr-12">
                    <p className="font-medium text-slate-900">{item.chart_subject_name || item.case_code}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.consultation_topic || "未填写主题"}</p>
                  </Link>
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
    </div>
  );
}
