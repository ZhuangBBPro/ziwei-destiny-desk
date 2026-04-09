import { z } from "zod";

const timePattern = /^(\d{1,2}:\d{2}|[子丑寅卯辰巳午未申酉戌亥]时)$/;

export const chartFormSchema = z.object({
  subject_name: z.string().trim().min(1, "请输入姓名或代号"),
  gender: z.enum(["male", "female"], { message: "请选择性别" }),
  birth_calendar_type: z.enum(["solar", "lunar"], { message: "请选择历法" }),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "请输入合法日期，格式为 YYYY-MM-DD"),
  birth_time: z
    .string()
    .trim()
    .min(1, "请输入出生时辰")
    .regex(timePattern, "请输入十二时辰或 HH:mm"),
  birth_timezone: z.string().trim().min(1, "请输入时区"),
  birth_location: z.string().trim(),
  leap_month_flag: z.boolean(),
  true_solar_time_enabled: z.boolean(),
  remarks: z.string().trim(),
});

export type ChartFormValues = z.infer<typeof chartFormSchema>;
