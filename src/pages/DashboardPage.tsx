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
  const [recentViewedCharts, setRecentViewedCharts] = useState<ChartRecord[]>([]);
  const [recentCases, setRecentCases] = useState<DashboardCaseItem[]>([]);

  useEffect(() => {
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
      </div>
    </div>
  );
}
