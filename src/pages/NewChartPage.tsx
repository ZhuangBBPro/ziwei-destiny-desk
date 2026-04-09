import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CardSection } from "@/components/ui/CardSection";
import { FieldError } from "@/components/ui/FieldError";
import { chartFormSchema, type ChartFormValues } from "@/features/charts/schemas/chartFormSchema";
import { chartService } from "@/features/charts/services/chartService";
import { AppError } from "@/lib/errors";

const defaultValues: ChartFormValues = {
  subject_name: "",
  gender: "male",
  birth_calendar_type: "solar",
  birth_date: "",
  birth_time: "",
  birth_timezone: "Asia/Shanghai",
  birth_location: "",
  leap_month_flag: false,
  true_solar_time_enabled: false,
  remarks: "",
};

export function NewChartPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChartFormValues>({
    resolver: zodResolver(chartFormSchema),
    defaultValues,
  });

  const birthCalendarType = watch("birth_calendar_type");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");
    try {
      const aggregate = await chartService.createChart(values);
      navigate(`/charts/${aggregate.chart.id}`);
    } catch (error) {
      console.error("Failed to create chart", error);
      setSubmitError(
        error instanceof AppError ? error.message : "命盘创建失败，请检查输入或稍后重试。",
      );
    }
  });

  return (
    <CardSection
      title="新建命盘"
      description="录入出生资料后直接调用 fortel-ziweidoushu 真实排盘，并保存原始输入与快照。"
    >
      <form className="space-y-6" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">姓名 / 代号</span>
            <input
              {...register("subject_name")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0"
              placeholder="例如：张某 / A-001"
            />
            <FieldError message={errors.subject_name?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">性别</span>
            <select
              {...register("gender")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
            <FieldError message={errors.gender?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">历法类型</span>
            <select
              {...register("birth_calendar_type")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="solar">阳历</option>
              <option value="lunar">农历</option>
            </select>
            <FieldError message={errors.birth_calendar_type?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">出生日期</span>
            <input
              type="date"
              {...register("birth_date")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
            />
            <FieldError message={errors.birth_date?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">出生时辰 / 时间</span>
            <input
              {...register("birth_time")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="例如：子时 或 23:30"
            />
            <FieldError message={errors.birth_time?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">时区</span>
            <input
              {...register("birth_timezone")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="Asia/Shanghai"
            />
            <FieldError message={errors.birth_timezone?.message} />
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">出生地点</span>
            <input
              {...register("birth_location")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="第一版仅做文本保存"
            />
            <FieldError message={errors.birth_location?.message} />
          </label>

          {birthCalendarType === "lunar" ? (
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input type="checkbox" {...register("leap_month_flag")} />
              <span className="text-sm text-slate-700">农历闰月</span>
            </label>
          ) : null}

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <input type="checkbox" {...register("true_solar_time_enabled")} />
            <span className="text-sm text-slate-700">启用真太阳时字段（V1 仅保留，不做换算）</span>
          </label>

          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">备注</span>
            <textarea
              {...register("remarks")}
              className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="录入来源、特殊说明、待核实项"
            />
            <FieldError message={errors.remarks?.message} />
          </label>
        </div>

        {submitError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-ink px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? "排盘中..." : "真实排盘并保存"}
          </button>
          <p className="self-center text-sm text-slate-500">
            时辰支持 `子时` / `丑时` 或 `23:30` 这类 HH:mm 输入
          </p>
        </div>
      </form>
    </CardSection>
  );
}
