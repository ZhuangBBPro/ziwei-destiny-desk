export type EntityId = string;

export interface BaseEntity {
  id: EntityId;
  created_at: string;
  updated_at: string;
}

export type GenderType = "male" | "female";
export type BirthCalendarType = "solar" | "lunar";
export type CaseStatus = "active" | "follow_up" | "reviewed" | "closed" | "archived";
export type NoteType = "initial" | "supplement" | "feedback" | "review" | "conclusion";
export type EventType =
  | "consultation"
  | "feedback"
  | "review"
  | "milestone"
  | "correction";
export type TagGroup = "topic" | "structure" | "result" | "risk" | "custom";
export type StarCategory = "major" | "minor" | "mini" | "misc" | "sha";
