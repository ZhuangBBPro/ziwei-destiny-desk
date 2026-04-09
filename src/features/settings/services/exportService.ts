import { exportRepository } from "@/db/repositories/exportRepository";
import { stringifyExportPayload } from "@/lib/exportJson";

function triggerJsonDownload(filename: string, payload: unknown) {
  const blob = new Blob([stringifyExportPayload(payload)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export class ExportService {
  async exportCase(caseId: string) {
    const payload = await exportRepository.exportCaseBundle(caseId);
    if (!payload) {
      return null;
    }
    triggerJsonDownload(`ziwei-case-${caseId}.json`, payload);
    return payload;
  }

  async exportAll() {
    const payload = await exportRepository.exportAllData();
    triggerJsonDownload("ziwei-destiny-desk-export.json", payload);
    return payload;
  }
}

export const exportService = new ExportService();
