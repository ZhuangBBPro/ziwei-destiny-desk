const SW_UPDATE_CHANNEL = "ziwei-destiny-desk-sw-update";
const CACHE_PREFIX = "ziwei-destiny-desk-";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

async function clearAppCaches() {
  if (!("caches" in window)) {
    return;
  }

  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key)),
  );
}

async function cleanupDevelopmentServiceWorkers(baseUrl: string) {
  const registrations = await navigator.serviceWorker.getRegistrations();
  const currentOrigin = window.location.origin;

  await Promise.all(
    registrations
      .filter((registration) => registration.scope.startsWith(currentOrigin))
      .map((registration) => registration.unregister()),
  );

  await clearAppCaches();
  console.info(`Service worker is disabled in development for ${baseUrl}`);
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const baseUrl = normalizeBaseUrl(import.meta.env.BASE_URL);

  if (!import.meta.env.PROD) {
    window.addEventListener("load", () => {
      cleanupDevelopmentServiceWorkers(baseUrl).catch((error) => {
        console.error("Failed to clean development service worker", error);
      });
    });
    return;
  }

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
