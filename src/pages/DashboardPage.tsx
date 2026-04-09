import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CardSection } from "@/components/ui/CardSection";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
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
  const [recentCharts, setRecentCharts] = useState<ChartRecord[]>([]);
  const [recentViewedCharts, setRecentViewedCharts] = useState<ChartRecord[]>([]);
  const [recentCases, setRecentCases] = useState<DashboardCaseItem[]>([]);
  const [pendingCases, setPendingCases] = useState<DashboardCaseItem[]>([]);

  useEffect(() => {
    async function load() {
      const recentViewedIds = getRecentChartViews();
      const [charts, viewedCharts, caseLibrary] = await Promise.all([
        chartService.listRecentCharts(6),
        chartService.listChartsByIds(recentViewedIds),
        caseService.queryCaseLibrary({ sortBy: "last_activity_at" }),
      ]);

      const cases = caseLibrary.cases as DashboardCaseItem[];
      setRecentCharts(charts);
      setRecentViewedCharts(viewedCharts);
      setRecentCases(cases.slice(0, 5));
      setPendingCases(
        cases.filter((item) => item.status === "active" || item.status === "follow_up").slice(0, 5),
      );
    }

    load().catch((error) => {
      console.error("Failed to load dashboard", error);
    });
  }, []);

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

      <div className="grid gap-4 xl:grid-cols-3">
        <CardSection title="最近新增案例">
          <div className="space-y-3">
            {recentCases.length === 0 ? (
              <EmptyState title="还没有案例" description="先创建命盘，再从详情页建立主案例。" />
            ) : (
              recentCases.map((item) => (
                <Link
                  key={item.id}
                  to={`/charts/${item.chart_id}/cases/${item.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.chart_subject_name || item.case_code}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.consultation_topic || "未填写主题"}</p>
                    </div>
                    <StatusPill label={item.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardSection>

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

        <CardSection title="待复盘案例">
          <div className="space-y-3">
            {pendingCases.length === 0 ? (
              <EmptyState title="暂无待复盘案例" description="active 与 follow_up 状态案例会聚合在这里。" />
            ) : (
              pendingCases.map((item) => (
                <Link
                  key={item.id}
                  to={`/charts/${item.chart_id}/cases/${item.id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-medium text-slate-900">{item.chart_subject_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.consultation_topic}</p>
                </Link>
              ))
            )}
          </div>
        </CardSection>
      </div>

      <CardSection title="最近创建命盘">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recentCharts.length === 0 ? (
            <EmptyState title="还没有命盘" description="从新建命盘页录入出生资料后，这里会出现最近创建记录。" />
          ) : (
            recentCharts.map((chart) => (
              <Link
                key={chart.id}
                to={`/charts/${chart.id}`}
                className="block rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="font-medium text-slate-900">{chart.subject_name}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {chart.birth_date} {chart.birth_time}
                </p>
              </Link>
            ))
          )}
        </div>
      </CardSection>
    </div>
  );
}
