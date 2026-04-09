import { v4 as uuidv4 } from "uuid";
import { tagRepository } from "@/db/repositories/tagRepository";
import { dayjs } from "@/lib/dayjs";
import type { TagGroup, TagRecord } from "@/types";

export class TagService {
  async listTags() {
    return tagRepository.listTags();
  }

  async saveTag(input: Omit<TagRecord, "id" | "created_at" | "updated_at"> & { id?: string }) {
    const now = dayjs().toISOString();
    const record: TagRecord = {
      id: input.id ?? uuidv4(),
      tag_name: input.tag_name,
      tag_group: input.tag_group as TagGroup,
      color: input.color,
      description: input.description,
      is_builtin: input.is_builtin,
      created_at: input.id ? now : now,
      updated_at: now,
    };
    if (input.id) {
      const prev = await tagRepository.getTag(input.id);
      if (prev) {
        record.created_at = prev.created_at;
      }
    }
    await tagRepository.saveTag(record);
    return record;
  }
}

export const tagService = new TagService();
