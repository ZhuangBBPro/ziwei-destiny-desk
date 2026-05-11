import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { CardSection } from "@/components/ui/CardSection";
import { FieldError } from "@/components/ui/FieldError";
import { LocationPicker } from "@/features/charts/components/LocationPicker";
import { preloadZiweiEngine } from "@/features/charts/lib/ziweiEngine";
import { chartFormSchema, type ChartFormValues } from "@/features/charts/schemas/chartFormSchema";
import { chartService } from "@/features/charts/services/chartService";
import { caseService } from "@/features/cases/services/caseService";
import { AppError } from "@/lib/errors";
import { DEFAULT_BIRTH_TIMEZONE } from "@/lib/constants";
import { dayjs } from "@/lib/dayjs";
import type { BirthCalendarType } from "@/types";

const defaultValues: ChartFormValues = {
  subject_name: "",
  gender: "male",
  birth_calendar_type: "solar",
  birth_date: "",
  birth_time: "",
  birth_location: "",
  leap_month_flag: false,
  true_solar_time_enabled: false,
  remarks: "",
};

type DatePart = "year" | "month" | "day";

interface BirthDateParts {
  year: string;
  month: string;
  day: string;
}

const EMPTY_BIRTH_DATE_PARTS: BirthDateParts = {
  year: "",
  month: "",
  day: "",
};

const YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) =>
  String(new Date().getFullYear() - index),
);

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

export function NewChartPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState("");
  const [birthDateParts, setBirthDateParts] = useState<BirthDateParts>(EMPTY_BIRTH_DATE_PARTS);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ChartFormValues>({
    resolver: zodResolver(chartFormSchema),
    defaultValues,
  });

  const birthCalendarType = watch("birth_calendar_type");
  const birthLocation = watch("birth_location");

  useEffect(() => {
    preloadZiweiEngine().catch((error) => {
      console.debug("Ziwei engine preload skipped", error);
    });
  }, []);

  useEffect(() => {
    setBirthDateParts((currentParts) => clampBirthDateParts(currentParts, birthCalendarType));
  }, [birthCalendarType]);

  useEffect(() => {
    const formattedDate = formatBirthDateParts(birthDateParts);
    setValue("birth_date", formattedDate, {
      shouldDirty: Boolean(formattedDate),
      shouldValidate: Boolean(errors.birth_date),
    });
  }, [birthDateParts, errors.birth_date, setValue]);

  function handleBirthDatePartChange(part: DatePart, value: string) {
    setBirthDateParts((currentParts) =>
      clampBirthDateParts(
        {
          ...currentParts,
          [part]: value,
        },
        birthCalendarType,
      ),
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError("");
    try {
      const aggregate = await chartService.createChart({
        ...values,
        birth_timezone: DEFAULT_BIRTH_TIMEZONE,
      });
      const mainCase = await caseService.createMainCase({
        chart_id: aggregate.chart.id,
        consultation_topic: "初始命盘记录",
        consultation_date: dayjs().format("YYYY-MM-DD"),
        status: "active",
        priority_level: 2,
        source_channel: "新建命盘",
        initial_summary: values.remarks || "创建命盘时自动生成的主案例。",
      });
      navigate(`/charts/${aggregate.chart.id}/cases/${mainCase.id}`);
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
            <span className="text-sm font-medium text-slate-700">
              {birthCalendarType === "lunar" ? "农历出生日期" : "阳历出生日期"}
            </span>
            <BirthDateSelector
              calendarType={birthCalendarType}
              parts={birthDateParts}
              onChange={handleBirthDatePartChange}
            />
            <input type="hidden" {...register("birth_date")} />
            <p className="mt-1 text-xs text-slate-500">
              {birthCalendarType === "lunar"
                ? "当前按农历年月日录入，提交时会先转成阳历再排盘；如果是闰月，请勾选下方“农历闰月”。"
                : "当前按阳历年月日排盘，日期会统一保存为 YYYY-MM-DD。"}
            </p>
            <FieldError message={errors.birth_date?.message} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">出生时辰 / 时间</span>
            <input
              {...register("birth_time")}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
              placeholder="例如：午时 / 11:30 / 中午11点半"
            />
            <FieldError message={errors.birth_time?.message} />
          </label>

          <div className="block md:col-span-2">
            <span className="text-sm font-medium text-slate-700">出生地点</span>
            <LocationPicker
              value={birthLocation}
              onChange={(location) =>
                setValue("birth_location", location, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            <input type="hidden" {...register("birth_location")} />
            <p className="mt-1 text-xs text-slate-500">第一版用于文本保存；真太阳时换算暂不使用地点。</p>
            <FieldError message={errors.birth_location?.message} />
          </div>

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
            时辰支持 `午时`、`11:30`、`中午11点半` 这类输入
          </p>
        </div>
      </form>
    </CardSection>
  );
}

function BirthDateSelector({
  calendarType,
  parts,
  onChange,
}: {
  calendarType: BirthCalendarType;
  parts: BirthDateParts;
  onChange: (part: DatePart, value: string) => void;
}) {
  const dayOptions = getDayOptions(calendarType, parts.year, parts.month);

  return (
    <div className="mt-2 grid grid-cols-[1.35fr_1fr_1fr] gap-2">
      <select
        value={parts.year}
        onChange={(event) => onChange("year", event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700"
        aria-label="选择出生年份"
      >
        <option value="">选择日期</option>
        {YEAR_OPTIONS.map((year) => (
          <option key={year} value={year}>
            {year}年
          </option>
        ))}
      </select>
      <select
        value={parts.month}
        onChange={(event) => onChange("month", event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700"
        aria-label="选择出生月份"
      >
        <option value="">月</option>
        {MONTH_OPTIONS.map((month) => (
          <option key={month} value={month}>
            {Number(month)}月
          </option>
        ))}
      </select>
      <select
        value={parts.day}
        onChange={(event) => onChange("day", event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700"
        aria-label="选择出生日期"
      >
        <option value="">日</option>
        {dayOptions.map((day) => (
          <option key={day} value={day}>
            {Number(day)}日
          </option>
        ))}
      </select>
    </div>
  );
}

function formatBirthDateParts(parts: BirthDateParts) {
  return parts.year && parts.month && parts.day ? `${parts.year}-${parts.month}-${parts.day}` : "";
}

function clampBirthDateParts(parts: BirthDateParts, calendarType: BirthCalendarType): BirthDateParts {
  const maxDay = getMaxDay(calendarType, parts.year, parts.month);
  const day = parts.day && Number(parts.day) <= maxDay ? parts.day : "";

  return {
    ...parts,
    day,
  };
}

function getDayOptions(calendarType: BirthCalendarType, year: string, month: string) {
  const maxDay = getMaxDay(calendarType, year, month);
  return Array.from({ length: maxDay }, (_, index) => String(index + 1).padStart(2, "0"));
}

function getMaxDay(calendarType: BirthCalendarType, year: string, month: string) {
  if (calendarType === "lunar") {
    return 30;
  }

  if (!year || !month) {
    return 31;
  }

  return new Date(Number(year), Number(month), 0).getDate();
}
