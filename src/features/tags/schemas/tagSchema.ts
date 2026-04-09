import { z } from "zod";

export const tagFormSchema = z.object({
  id: z.string().optional(),
  tag_name: z.string().trim().min(1, "请输入标签名称"),
  tag_group: z.enum(["topic", "structure", "result", "risk", "custom"]),
  color: z.string().trim().min(1, "请输入颜色"),
  description: z.string().trim(),
  is_builtin: z.boolean(),
});

export type TagFormValues = z.infer<typeof tagFormSchema>;
