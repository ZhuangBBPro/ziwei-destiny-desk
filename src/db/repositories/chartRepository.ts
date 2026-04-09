import { appDb } from "@/db/appDb";
import type {
  ChartAggregate,
  ChartPalaceRecord,
  ChartRecord,
  ChartStarRecord,
  ChartTransformRecord,
} from "@/types";

export class ChartRepository {
  async saveAggregate(aggregate: ChartAggregate) {
    await appDb.transaction(
      "rw",
      appDb.charts,
      appDb.chart_palaces,
      appDb.chart_stars,
      appDb.chart_transforms,
      async () => {
        await appDb.charts.put(aggregate.chart);
        await appDb.chart_palaces.bulkPut(aggregate.palaces);
        await appDb.chart_stars.bulkPut(aggregate.stars);
        await appDb.chart_transforms.bulkPut(aggregate.transforms);
      },
    );
  }

  async getChart(chartId: string) {
    return appDb.charts.get(chartId);
  }

  async getChartAggregate(chartId: string): Promise<ChartAggregate | null> {
    const [chart, palaces, stars, transforms] = await Promise.all([
      appDb.charts.get(chartId),
      appDb.chart_palaces.where("chart_id").equals(chartId).sortBy("display_order"),
      appDb.chart_stars.where("chart_id").equals(chartId).toArray(),
      appDb.chart_transforms.where("chart_id").equals(chartId).toArray(),
    ]);

    if (!chart) {
      return null;
    }

    return { chart, palaces, stars, transforms };
  }

  async listRecentCharts(limit = 6): Promise<ChartRecord[]> {
    const all = await appDb.charts.orderBy("updated_at").reverse().toArray();
    return all.filter((item) => !item.archived_at).slice(0, limit);
  }

  async listChartsByIds(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }
    const charts = await appDb.charts.where("id").anyOf(ids).toArray();
    const map = new Map(charts.map((item) => [item.id, item]));
    return ids.map((id) => map.get(id)).filter(Boolean) as ChartRecord[];
  }

  async getPalaces(chartId: string): Promise<ChartPalaceRecord[]> {
    return appDb.chart_palaces.where("chart_id").equals(chartId).sortBy("display_order");
  }

  async getStars(chartId: string): Promise<ChartStarRecord[]> {
    return appDb.chart_stars.where("chart_id").equals(chartId).toArray();
  }

  async getTransforms(chartId: string): Promise<ChartTransformRecord[]> {
    return appDb.chart_transforms.where("chart_id").equals(chartId).toArray();
  }
}

export const chartRepository = new ChartRepository();
