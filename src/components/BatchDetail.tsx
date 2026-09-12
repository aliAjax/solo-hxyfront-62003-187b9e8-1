import { useEffect, useState } from "react";
import {
  BatchDraft,
  SampleBatch,
  formatDateTime,
  isPendingIdentification,
  uid,
  validateDraft,
} from "../types";
import { BatchFields } from "./BatchFields";
import { TemperatureChart } from "./TemperatureChart";

interface Props {
  sample: SampleBatch;
  samples: SampleBatch[];
  caseOptions: string[];
  onSave: (updated: SampleBatch) => void;
  onRemove: (id: string) => void;
  notify: (type: "success" | "error", text: string) => void;
}

function toDraft(s: SampleBatch): BatchDraft {
  return {
    batchNo: s.batchNo,
    caseNo: s.caseNo,
    location: s.location,
    exposureStage: s.exposureStage,
    species: s.species,
    stage: s.stage,
    sampledAt: s.sampledAt,
    preservation: s.preservation,
    temperature: "",
    notes: s.notes,
  };
}

/** 单个样本批次详情:编辑、保存、移除、追加温度记录 */
export function BatchDetail({
  sample,
  samples,
  caseOptions,
  onSave,
  onRemove,
  notify,
}: Props) {
  const [draft, setDraft] = useState<BatchDraft>(() => toDraft(sample));
  const [errors, setErrors] = useState<
    Partial<Record<keyof BatchDraft, string>>
  >({});
  const [tempTime, setTempTime] = useState("");
  const [tempValue, setTempValue] = useState("");
  const [tempError, setTempError] = useState("");

  // 切换选中批次时重置草稿
  useEffect(() => {
    setDraft(toDraft(sample));
    setErrors({});
    setTempTime("");
    setTempValue("");
    setTempError("");
  }, [sample.id, sample.updatedAt]);

  const patch = (p: Partial<BatchDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    const key = Object.keys(p)[0] as keyof BatchDraft;
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const save = () => {
    const found = validateDraft(draft, samples, sample.id);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      notify(
        "error",
        `修改未保存:${Object.keys(found).length} 项未通过校验,请检查标红字段`
      );
      return;
    }
    onSave({
      ...sample,
      batchNo: draft.batchNo.trim(),
      caseNo: draft.caseNo.trim(),
      location: draft.location.trim(),
      exposureStage: draft.exposureStage,
      species: draft.species.trim(),
      stage: draft.stage as SampleBatch["stage"],
      sampledAt: draft.sampledAt,
      preservation: draft.preservation,
      notes: draft.notes.trim(),
      updatedAt: Date.now(),
    });
    notify("success", `批次 ${draft.batchNo.trim()} 的修改已保存`);
  };

  const remove = () => {
    if (
      window.confirm(
        `确定移除批次 ${sample.batchNo} 吗?该操作会同时删除其温度记录,且不可恢复。`
      )
    ) {
      onRemove(sample.id);
      notify("success", `批次 ${sample.batchNo} 已移除`);
    }
  };

  const addTemperature = () => {
    if (!tempTime) {
      setTempError("请选择记录时间");
      return;
    }
    const v = Number(tempValue);
    if (tempValue.trim() === "" || Number.isNaN(v)) {
      setTempError("请填写有效的温度数值");
      return;
    }
    if (v < -50 || v > 70) {
      setTempError("温度需在 -50℃ ~ 70℃ 之间");
      return;
    }
    if (
      sample.temperatures.some((t) => t.time === tempTime && t.value === v)
    ) {
      setTempError("相同时间和温度的记录已存在,请勿重复添加");
      return;
    }
    onSave({
      ...sample,
      temperatures: [
        ...sample.temperatures,
        { id: uid(), time: tempTime, value: v },
      ],
      updatedAt: Date.now(),
    });
    setTempTime("");
    setTempValue("");
    setTempError("");
    notify("success", `已追加一条温度记录:${v.toFixed(1)}℃`);
  };

  const removeTemperature = (id: string) => {
    onSave({
      ...sample,
      temperatures: sample.temperatures.filter((t) => t.id !== id),
      updatedAt: Date.now(),
    });
    notify("success", "已删除该条温度记录");
  };

  const sortedTemps = [...sample.temperatures].sort((a, b) =>
    a.time.localeCompare(b.time)
  );

  return (
    <section className="panel detail-panel" aria-label="批次详情">
      <div className="heading">
        <div>
          <p>批次详情</p>
          <h2>
            {sample.batchNo}
            {isPendingIdentification(sample) && (
              <span className="tag tag-pending">待鉴定</span>
            )}
          </h2>
        </div>
        <div className="heading-actions">
          <button type="button" className="primary" onClick={save}>
            保存修改
          </button>
          <button type="button" className="danger" onClick={remove}>
            移除批次
          </button>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="form-banner" role="alert">
          修改未保存:共 {Object.keys(errors).length} 项需要处理。
        </div>
      )}

      <BatchFields
        draft={draft}
        errors={errors}
        caseOptions={caseOptions}
        onChange={patch}
      />

      <div className="temp-section">
        <h3>环境温度记录</h3>
        <TemperatureChart records={sample.temperatures} />

        <div className="temp-add">
          <label>
            <span>记录时间</span>
            <input
              type="datetime-local"
              value={tempTime}
              onChange={(e) => {
                setTempTime(e.target.value);
                setTempError("");
              }}
            />
          </label>
          <label>
            <span>温度(℃)</span>
            <input
              type="number"
              step="0.1"
              placeholder="如 26.5"
              value={tempValue}
              onChange={(e) => {
                setTempValue(e.target.value);
                setTempError("");
              }}
            />
          </label>
          <button type="button" className="primary" onClick={addTemperature}>
            追加温度记录
          </button>
        </div>
        {tempError && (
          <em className="field-error" role="alert">
            {tempError}
          </em>
        )}

        {sortedTemps.length > 0 && (
          <ul className="temp-list">
            {sortedTemps.map((t) => (
              <li key={t.id}>
                <span>{formatDateTime(t.time)}</span>
                <strong>{t.value.toFixed(1)}℃</strong>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => removeTemperature(t.id)}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
