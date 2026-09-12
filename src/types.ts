export type DevelopmentStage = "卵" | "幼虫" | "蛹" | "成虫";

export const STAGES: DevelopmentStage[] = ["卵", "幼虫", "蛹", "成虫"];

export const EXPOSURE_STAGES = [
  "新鲜期",
  "肿胀期",
  "腐败期",
  "干化期",
  "白骨化期",
] as const;

export const PRESERVATION_METHODS = [
  "75% 乙醇保存",
  "95% 乙醇保存",
  "福尔马林固定",
  "冷冻保存",
  "干燥保存",
  "活体饲养",
] as const;

export interface TemperatureRecord {
  id: string;
  /** datetime-local 字符串,如 2026-09-12T14:30 */
  time: string;
  /** 环境温度 ℃ */
  value: number;
}

export interface SampleBatch {
  id: string;
  /** 批次号,唯一 */
  batchNo: string;
  /** 案件编号,同一案件可关联多个批次 */
  caseNo: string;
  /** 采样地点 */
  location: string;
  /** 尸体暴露阶段 */
  exposureStage: string;
  /** 昆虫种类 */
  species: string;
  /** 发育阶段 */
  stage: DevelopmentStage;
  /** 采样时间 datetime-local */
  sampledAt: string;
  /** 保存方式 */
  preservation: string;
  /** 鉴定备注,为空视为待鉴定 */
  notes: string;
  /** 同一批次的多条环境温度记录 */
  temperatures: TemperatureRecord[];
  createdAt: number;
  updatedAt: number;
}

/** 新建/编辑表单共用的草稿结构 */
export interface BatchDraft {
  batchNo: string;
  caseNo: string;
  location: string;
  exposureStage: string;
  species: string;
  stage: DevelopmentStage | "";
  sampledAt: string;
  preservation: string;
  /** 仅新建时填写,作为首条温度记录 */
  temperature: string;
  notes: string;
}

export const EMPTY_DRAFT: BatchDraft = {
  batchNo: "",
  caseNo: "",
  location: "",
  exposureStage: "",
  species: "",
  stage: "",
  sampledAt: "",
  preservation: "",
  temperature: "",
  notes: "",
};

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** 校验草稿,返回 字段名 -> 错误信息;excludeBatchNo 用于编辑时排除自身 */
export function validateDraft(
  draft: BatchDraft,
  existing: SampleBatch[],
  excludeId?: string
): Partial<Record<keyof BatchDraft, string>> {
  const errors: Partial<Record<keyof BatchDraft, string>> = {};
  const batchNo = draft.batchNo.trim();
  if (!batchNo) {
    errors.batchNo = "请填写批次号";
  } else if (
    existing.some((s) => s.id !== excludeId && s.batchNo === batchNo)
  ) {
    errors.batchNo = `批次号 ${batchNo} 已存在,属于重复提交`;
  }
  if (!draft.caseNo.trim()) errors.caseNo = "请填写案件编号";
  if (!draft.location.trim()) errors.location = "请填写采样地点";
  if (!draft.exposureStage) errors.exposureStage = "请选择暴露阶段";
  if (!draft.species.trim()) errors.species = "请填写受检昆虫种类";
  if (!draft.stage) errors.stage = "请选择发育阶段";
  if (!draft.sampledAt) errors.sampledAt = "请选择采样时间";
  if (!draft.preservation) errors.preservation = "请选择保存方式";
  if (draft.temperature !== "") {
    const t = Number(draft.temperature);
    if (Number.isNaN(t)) {
      errors.temperature = "环境温度需为数字";
    } else if (t < -50 || t > 70) {
      errors.temperature = "环境温度需在 -50℃ ~ 70℃ 之间";
    }
  }
  return errors;
}

export function isPendingIdentification(sample: SampleBatch): boolean {
  return sample.notes.trim() === "" || sample.notes.includes("待");
}

export function formatDateTime(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
