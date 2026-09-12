import {
  BatchDraft,
  EXPOSURE_STAGES,
  PRESERVATION_METHODS,
  STAGES,
} from "../types";

interface Props {
  draft: BatchDraft;
  errors: Partial<Record<keyof BatchDraft, string>>;
  caseOptions: string[];
  /** 新建表单显示环境温度(首条温度记录) */
  showTemperature?: boolean;
  onChange: (patch: Partial<BatchDraft>) => void;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <em className="field-error">{message}</em>;
}

/** 新建/编辑共用的批次字段组 */
export function BatchFields({
  draft,
  errors,
  caseOptions,
  showTemperature = false,
  onChange,
}: Props) {
  const invalid = (key: keyof BatchDraft) => (errors[key] ? "invalid" : "");
  return (
    <div className="field-grid">
      <label>
        <span>批次号 *</span>
        <input
          className={invalid("batchNo")}
          value={draft.batchNo}
          placeholder="如 PC-20260912-001"
          onChange={(e) => onChange({ batchNo: e.target.value })}
        />
        <FieldError message={errors.batchNo} />
      </label>

      <label>
        <span>案件编号 *(多个批次可填同一编号归入同一案件)</span>
        <input
          className={invalid("caseNo")}
          value={draft.caseNo}
          list="case-options"
          placeholder="如 CASE-042"
          onChange={(e) => onChange({ caseNo: e.target.value })}
        />
        <datalist id="case-options">
          {caseOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <FieldError message={errors.caseNo} />
      </label>

      <label>
        <span>采样地点 *</span>
        <input
          className={invalid("location")}
          value={draft.location}
          placeholder="如 城郊室外草地"
          onChange={(e) => onChange({ location: e.target.value })}
        />
        <FieldError message={errors.location} />
      </label>

      <label>
        <span>采样时间 *</span>
        <input
          className={invalid("sampledAt")}
          type="datetime-local"
          value={draft.sampledAt}
          onChange={(e) => onChange({ sampledAt: e.target.value })}
        />
        <FieldError message={errors.sampledAt} />
      </label>

      <label>
        <span>尸体暴露阶段 *</span>
        <select
          className={invalid("exposureStage")}
          value={draft.exposureStage}
          onChange={(e) => onChange({ exposureStage: e.target.value })}
        >
          <option value="">请选择暴露阶段</option>
          {EXPOSURE_STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <FieldError message={errors.exposureStage} />
      </label>

      <label>
        <span>昆虫种类 *</span>
        <input
          className={invalid("species")}
          value={draft.species}
          placeholder="如 丝光绿蝇"
          onChange={(e) => onChange({ species: e.target.value })}
        />
        <FieldError message={errors.species} />
      </label>

      <label>
        <span>发育阶段 *</span>
        <select
          className={invalid("stage")}
          value={draft.stage}
          onChange={(e) =>
            onChange({ stage: e.target.value as BatchDraft["stage"] })
          }
        >
          <option value="">请选择发育阶段</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <FieldError message={errors.stage} />
      </label>

      <label>
        <span>保存方式 *</span>
        <select
          className={invalid("preservation")}
          value={draft.preservation}
          onChange={(e) => onChange({ preservation: e.target.value })}
        >
          <option value="">请选择保存方式</option>
          {PRESERVATION_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <FieldError message={errors.preservation} />
      </label>

      {showTemperature && (
        <label>
          <span>环境温度(℃)</span>
          <input
            className={invalid("temperature")}
            type="number"
            step="0.1"
            value={draft.temperature}
            placeholder="如 26.5,保存为首条温度记录"
            onChange={(e) => onChange({ temperature: e.target.value })}
          />
          <FieldError message={errors.temperature} />
        </label>
      )}

      <label className="span-2">
        <span>鉴定备注(留空则标记为待鉴定)</span>
        <textarea
          rows={3}
          value={draft.notes}
          placeholder="形态特征、复核意见、拍照存档情况等"
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>
    </div>
  );
}
