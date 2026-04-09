import { z } from "zod";

export const caseFormSchema = z.object({
  consultation_topic: z.string().trim().min(1, "请输入咨询主题"),
  consultation_date: z.string().trim(),
  status: z.enum(["active", "follow_up", "reviewed", "closed", "archived"]),
  priority_level: z.coerce.number().min(1).max(5),
  source_channel: z.string().trim(),
  initial_summary: z.string().trim(),
  final_summary: z.string().trim(),
  client_feedback_summary: z.string().trim(),
  review_conclusion: z.string().trim(),
  is_reviewed: z.boolean(),
  is_verified: z.boolean(),
});

export const noteFormSchema = z.object({
  note_type: z.enum(["initial", "supplement", "feedback", "review", "conclusion"]),
  title: z.string().trim().min(1, "请输入标题"),
  content: z.string().trim().min(1, "请输入内容"),
  related_palace_code: z.string().trim(),
  related_topic: z.string().trim(),
  sort_order: z.coerce.number().default(0),
});

export const eventFormSchema = z.object({
  event_type: z.enum(["consultation", "feedback", "review", "milestone", "correction"]),
  event_date: z.string().trim().min(1, "请输入事件日期"),
  title: z.string().trim().min(1, "请输入标题"),
  description: z.string().trim(),
  outcome_label: z.string().trim(),
});

export type CaseFormValues = z.infer<typeof caseFormSchema>;
export type NoteFormValues = z.infer<typeof noteFormSchema>;
export type EventFormValues = z.infer<typeof eventFormSchema>;
