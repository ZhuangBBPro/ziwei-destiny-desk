import { RouterProvider } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppProviders } from "@/app/providers";
import { onServiceWorkerUpdated, registerServiceWorker } from "@/app/registerServiceWorker";
import { router } from "@/app/router";

export function App() {
  const [showUpdateTip, setShowUpdateTip] = useState(false);

  useEffect(() => {
    registerServiceWorker();
    return onServiceWorkerUpdated(() => {
      setShowUpdateTip(true);
    });
  }, []);

  return (
    <AppProviders>
      {showUpdateTip ? (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-xl rounded-2xl border border-gold/30 bg-white px-4 py-3 text-sm text-slate-700 shadow-panel">
          检测到新版本资源，刷新页面后可获得最新内容。
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-3 rounded-xl bg-ink px-3 py-2 text-xs text-white"
          >
            立即刷新
          </button>
        </div>
      ) : null}
      <RouterProvider router={router} />
    </AppProviders>
  );
}
