import { chartRepository } from "@/db/repositories/chartRepository";
import { createRawZiweiBoard } from "@/features/charts/lib/ziweiEngine";
import {
  buildChartAggregate,
  mapRawZiweiBoard,
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
    return chartRepository.getChartAggregate(chartId);
  }

  async listRecentCharts(limit?: number) {
    return chartRepository.listRecentCharts(limit);
  }

  async listChartsByIds(ids: string[]) {
    return chartRepository.listChartsByIds(ids);
  }
}

export const chartService = new ChartService();
