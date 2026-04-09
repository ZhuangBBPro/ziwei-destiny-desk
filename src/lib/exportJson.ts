export function stringifyExportPayload(payload: unknown) {
  return JSON.stringify(payload, null, 2);
}
