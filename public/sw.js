const CACHE_VERSION = "ziwei-destiny-desk-v1";
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

function normalizeBasePath(pathname) {
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function getBasePath() {
  const scopePath = new URL(self.registration.scope).pathname;
  return normalizeBasePath(scopePath);
}

function getOfflineAssets() {
  const basePath = getBasePath();
  return [
    basePath,
    `${basePath}manifest.webmanifest`,
    `${basePath}offline.html`,
    `${basePath}icons/icon-192.svg`,
    `${basePath}icons/icon-512.svg`,
  ];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(getOfflineAssets())).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ziwei-destiny-desk-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  event.respondWith(handleAssetRequest(request));
});

async function handleNavigationRequest(request) {
  const basePath = getBasePath();
  const appShellCache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    appShellCache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedPage = await caches.match(request);
    if (cachedPage) {
      return cachedPage;
    }

    const cachedRoot = await caches.match(basePath);
    if (cachedRoot) {
      return cachedRoot;
    }

    return caches.match(`${basePath}offline.html`);
  }
}

async function handleAssetRequest(request) {
  const runtimeCache = await caches.open(RUNTIME_CACHE);
  const cached = await runtimeCache.match(request);

  if (cached) {
    fetch(request)
      .then((response) => {
        runtimeCache.put(request, response.clone());
      })
      .catch(() => {
        return undefined;
      });
    return cached;
  }

  try {
    const response = await fetch(request);
    runtimeCache.put(request, response.clone());
    return response;
  } catch (error) {
    return caches.match(request);
  }
}
