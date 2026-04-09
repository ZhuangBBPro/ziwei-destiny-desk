const STORAGE_KEY = "ziwei-destiny-desk:recent-chart-views";
const MAX_RECENT_VIEWS = 8;

export function pushRecentChartView(chartId: string) {
  const current = getRecentChartViews();
  const next = [chartId, ...current.filter((item) => item !== chartId)].slice(0, MAX_RECENT_VIEWS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function getRecentChartViews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch (error) {
    console.error("Failed to read recent chart views", error);
    return [];
  }
}
