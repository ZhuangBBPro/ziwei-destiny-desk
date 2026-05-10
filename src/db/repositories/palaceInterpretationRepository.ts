import { appDb } from "@/db/appDb";
import type { PalaceInterpretationRecord } from "@/types";

export class PalaceInterpretationRepository {
  async count() {
    return appDb.palace_interpretations.count();
  }

  async listAll() {
    return appDb.palace_interpretations.orderBy("sort_order").toArray();
  }

  async listByPalace(palaceName: string) {
    return appDb.palace_interpretations
      .where("palace_name")
      .equals(palaceName)
      .sortBy("sort_order");
  }

  async save(record: PalaceInterpretationRecord) {
    await appDb.palace_interpretations.put(record);
    return record;
  }

  async bulkSave(records: PalaceInterpretationRecord[]) {
    await appDb.palace_interpretations.bulkPut(records);
    return records;
  }

  async get(id: string) {
    return appDb.palace_interpretations.get(id);
  }

  async delete(id: string) {
    await appDb.palace_interpretations.delete(id);
  }
}

export const palaceInterpretationRepository = new PalaceInterpretationRepository();
