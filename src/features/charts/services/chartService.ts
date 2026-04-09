import { chartRepository } from "@/db/repositories/chartRepository";
import { createRawZiweiBoard } from "@/features/charts/lib/ziweiEngine";
import {
  buildChartAggregate,
  mapRawZiweiBoard,
  repairChartAggregateDisplay,
  repairChartRecordDisplay,
  toZiweiCreateConfigInput,
} from "@/features/charts/lib/ziweiMapper";
import type { ChartCreateInput } from "@/types";

export class ChartService {
  async createChart(input: ChartCreateInput) {
    const rawBoard = await createRawZiweiBoard(toZiweiCreateConfigInput(input));
    const mappedBoard = mapRawZiweiBoard(rawBoard);
    const aggregate = buildChartAggregate(input, mappedBoard);
    await chartRepository.saveAggregate(aggregate);
    return aggregate;
  }

  async getChartAggregate(chartId: string) {
    const aggregate = await chartRepository.getChartAggregate(chartId);
    return aggregate ? repairChartAggregateDisplay(aggregate) : null;
  }

  async listRecentCharts(limit?: number) {
    const charts = await chartRepository.listRecentCharts(limit);
    return charts.map((chart) => repairChartRecordDisplay(chart));
  }

  async listChartsByIds(ids: string[]) {
    const charts = await chartRepository.listChartsByIds(ids);
    return charts.map((chart) => repairChartRecordDisplay(chart));
  }
}

export const chartService = new ChartService();
