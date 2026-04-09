import { appDb } from "@/db/appDb";
import type { TagRecord } from "@/types";

export class TagRepository {
  async listTags() {
    return appDb.tags.orderBy("tag_name").toArray();
  }

  async saveTag(record: TagRecord) {
    await appDb.tags.put(record);
    return record;
  }

  async getTag(tagId: string) {
    return appDb.tags.get(tagId);
  }
}

export const tagRepository = new TagRepository();
