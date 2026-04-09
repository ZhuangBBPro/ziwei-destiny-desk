import type { BaseEntity, TagGroup } from "@/types/common";

export interface TagRecord extends BaseEntity {
  tag_name: string;
  tag_group: TagGroup;
  color: string;
  description: string;
  is_builtin: boolean;
}

export interface CaseTagRecord {
  id: string;
  case_id: string;
  tag_id: string;
  created_at: string;
}
