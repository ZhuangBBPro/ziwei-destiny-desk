import type { BirthCalendarType, ChartRecord } from "@/types";

export function getBirthCalendarLabel(calendarType: BirthCalendarType) {
  return calendarType === "lunar" ? "农历" : "阳历";
}

export function formatChartBirthInfo(chart: Pick<ChartRecord, "birth_calendar_type" | "birth_date" | "birth_time">) {
  return `${getBirthCalendarLabel(chart.birth_calendar_type)} ${chart.birth_date} ${chart.birth_time}`;
}
