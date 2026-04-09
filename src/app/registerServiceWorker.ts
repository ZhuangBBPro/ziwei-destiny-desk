const SW_UPDATE_CHANNEL = "ziwei-destiny-desk-sw-update";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const baseUrl = normalizeBaseUrl(import.meta.env.BASE_URL);

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${baseUrl}sw.js`, {
        scope: baseUrl,
      })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) {
            return;
          }

          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent(SW_UPDATE_CHANNEL));
            }
          });
        });
      })
      .catch((error) => {
        console.error("Failed to register service worker", error);
      });
  });
}

export function onServiceWorkerUpdated(listener: () => void) {
  const handler = () => listener();
  window.addEventListener(SW_UPDATE_CHANNEL, handler);
  return () => window.removeEventListener(SW_UPDATE_CHANNEL, handler);
}
