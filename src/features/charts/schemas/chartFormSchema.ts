import { z } from "zod";
import { normalizeTimeGroundInput } from "@/features/charts/lib/timeGroundMapper";

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
    .refine(
      (value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
      "钟表时间必须是 HH:mm 格式",
    )
    .refine(
      (value) => value === "" || normalizeTimeGroundInput(value) !== null,
      "钟表时间无法映射到十二时辰",
    ),
  birth_location: z.string().trim(),
  leap_month_flag: z.boolean(),
  true_solar_time_enabled: z.boolean(),
  manual_true_solar_time: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
      "手动真太阳时必须是 HH:mm 格式",
    ),
  manual_true_solar_day_offset: z.enum(["-1", "0", "1"]),
  remarks: z.string().trim(),
}).superRefine((values, context) => {
  if (!values.birth_time && !values.manual_true_solar_time) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "请输入钟表时间，或直接填写手动真太阳时",
      path: ["birth_time"],
    });
  }
});

export type ChartFormValues = z.infer<typeof chartFormSchema>;
