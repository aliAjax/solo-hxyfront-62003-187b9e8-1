import { useRef, useState } from "react";
import {
  BatchDraft,
  EMPTY_DRAFT,
  SampleBatch,
  uid,
  validateDraft,
} from "../types";
import { BatchFields } from "./BatchFields";

interface Props {
  samples: SampleBatch[];
  caseOptions: string[];
  onCreate: (sample: SampleBatch) => void;
  onCancel: () => void;
  notify: (type: "success" | "error", text: string) => void;
}

/** 新建批次表单:必填校验、批次号查重、防重复提交 */
export function BatchForm({
  samples,
  caseOptions,
  onCreate,
  onCancel,
  notify,
}: Props) {
  const [draft, setDraft] = useState<BatchDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<
    Partial<Record<keyof BatchDraft, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const guardRef = useRef(false);

  const patch = (p: Partial<BatchDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    // 修改某字段后即时清除该字段的错误提示
    const key = Object.keys(p)[0] as keyof BatchDraft;
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const submit = () => {
    // 防连点/重复提交
    if (guardRef.current) {
      notify("error", "正在保存,请勿重复点击提交");
      return;
    }
    const found = validateDraft(draft, samples);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      const isEmpty = Object.values(draft).every(
        (v) => String(v).trim() === ""
      );
      notify(
        "error",
        isEmpty
          ? "表单为空:请逐项填写标红的必填字段后再提交"
          : `表单有 ${Object.keys(found).length} 项未通过校验,请检查标红字段`
      );
      return;
    }
    guardRef.current = true;
    setSubmitting(true);

    const now = Date.now();
    const batchNo = draft.batchNo.trim();
    const temperatures =
      draft.temperature.trim() === ""
        ? []
        : [
            {
              id: uid(),
              time: draft.sampledAt,
              value: Number(draft.temperature),
            },
          ];
    const sample: SampleBatch = {
      id: uid(),
      batchNo,
      caseNo: draft.caseNo.trim(),
      location: draft.location.trim(),
      exposureStage: draft.exposureStage,
      species: draft.species.trim(),
      stage: draft.stage as SampleBatch["stage"],
      sampledAt: draft.sampledAt,
      preservation: draft.preservation,
      notes: draft.notes.trim(),
      temperatures,
      createdAt: now,
      updatedAt: now,
    };
    onCreate(sample);
    notify("success", `批次 ${batchNo} 已保存,可在列表中查看`);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    guardRef.current = false;
    setSubmitting(false);
  };

  return (
    <section className="panel form-panel" aria-label="新建批次">
      <div className="heading">
        <div>
          <p>现场录入</p>
          <h2>新建样本批次</h2>
        </div>
        <div className="heading-actions">
          <button type="button" onClick={onCancel}>
            收起
          </button>
          <button
            type="button"
            className="primary"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "保存中…" : "保存批次"}
          </button>
        </div>
      </div>
      {Object.keys(errors).length > 0 && (
        <div className="form-banner" role="alert">
          表单未通过校验:共 {Object.keys(errors).length}{" "}
          项需要处理,请检查下方标红字段。
        </div>
      )}
      <BatchFields
        draft={draft}
        errors={errors}
        caseOptions={caseOptions}
        showTemperature
        onChange={patch}
      />
    </section>
  );
}
