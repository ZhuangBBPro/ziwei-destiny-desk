import { z } from "zod";
import { normalizeTimeGroundInput } from "@/features/charts/lib/timeGroundMapper";

export function normalizeBirthDateInput(input: string) {
  const trimmed = input.trim();
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }
  const separatedMatch = trimmed.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (separatedMatch) {
    return [
      separatedMatch[1],
      separatedMatch[2].padStart(2, "0"),
      separatedMatch[3].padStart(2, "0"),
    ].join("-");
  }
  return trimmed;
}

export const chartFormSchema = z.object({
  subject_name: z.string().trim().min(1, "请输入姓名或代号"),
  gender: z.enum(["male", "female"], { message: "请选择性别" }),
  birth_calendar_type: z.enum(["solar", "lunar"], { message: "请选择历法" }),
  birth_date: z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "请选择出生日期",
    ),
  birth_time: z
    .string()
    .trim()
    .min(1, "请输入出生时辰")
    .refine((value) => normalizeTimeGroundInput(value) !== null, "请输入十二时辰、HH:mm 或 11点半"),
  birth_timezone: z.string().trim().min(1, "请输入时区"),
  birth_location: z.string().trim(),
  leap_month_flag: z.boolean(),
  true_solar_time_enabled: z.boolean(),
  remarks: z.string().trim(),
});

export type ChartFormValues = z.infer<typeof chartFormSchema>;
