import type { BaseEntity, CaseStatus, EventType, NoteType } from "@/types/common";

export interface CaseRecord extends BaseEntity {
  chart_id: string;
  case_code: string;
  consultation_topic: string;
  consultation_date: string | null;
  status: CaseStatus;
  priority_level: number;
  source_channel: string;
  initial_summary: string;
  final_summary: string;
  client_feedback_summary: string;
  review_conclusion: string;
  is_reviewed: boolean;
  is_verified: boolean;
  opened_at: string | null;
  last_activity_at: string | null;
  closed_at: string | null;
}

export interface CaseNoteRecord extends BaseEntity {
  case_id: string;
  note_type: NoteType;
  title: string;
  content: string;
  related_palace_code: string | null;
  related_topic: string;
  sort_order: number;
  deleted_at: string | null;
}

export interface CaseEventRecord extends BaseEntity {
  case_id: string;
  event_type: EventType;
  event_date: string;
  title: string;
  description: string;
  outcome_label: string;
}
