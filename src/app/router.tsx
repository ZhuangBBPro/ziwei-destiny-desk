import { createBrowserRouter, createHashRouter } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { DashboardPage } from "@/pages/DashboardPage";
import { NewChartPage } from "@/pages/NewChartPage";
import { CaseLibraryPage } from "@/pages/CaseLibraryPage";
import { ChartDetailPage } from "@/pages/ChartDetailPage";
import { PalaceInterpretationLibraryPage } from "@/pages/PalaceInterpretationLibraryPage";
import { SettingsPage } from "@/pages/SettingsPage";

const routes = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "charts/new",
        element: <NewChartPage />,
      },
      {
        path: "cases",
        element: <CaseLibraryPage />,
      },
      {
        path: "palace-library",
        element: <PalaceInterpretationLibraryPage />,
      },
      {
        path: "charts/:chartId",
        element: <ChartDetailPage />,
      },
      {
        path: "charts/:chartId/cases/:caseId",
        element: <ChartDetailPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
];

function getRouterFactory() {
  const mode = import.meta.env.VITE_ROUTER_MODE ?? "auto";
  const isGitHubPages =
    typeof window !== "undefined" && window.location.hostname.endsWith("github.io");

  if (mode === "hash" || (mode === "auto" && isGitHubPages)) {
    return createHashRouter;
  }

  return createBrowserRouter;
}

export const router = getRouterFactory()(routes);
