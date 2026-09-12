import {
  SampleBatch,
  STAGES,
  formatDateTime,
  isPendingIdentification,
} from "../types";

interface Props {
  samples: SampleBatch[];
  onOpenSample: (id: string) => void;
}

/** 案件关联视图:同一案件编号下的所有样本批次归为一组 */
export function CaseBoard({ samples, onOpenSample }: Props) {
  const cases = new Map<string, SampleBatch[]>();
  for (const s of samples) {
    const key = s.caseNo || "未填写案件";
    const list = cases.get(key) ?? [];
    list.push(s);
    cases.set(key, list);
  }
  const groups = [...cases.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  if (groups.length === 0) {
    return (
      <section className="panel">
        <p className="empty-state">
          暂无案件数据。新建批次时填写案件编号,相同样本会自动归到同一案件。
        </p>
      </section>
    );
  }

  return (
    <div className="case-board">
      {groups.map(([caseNo, list]) => {
        const sorted = [...list].sort((a, b) =>
          a.sampledAt.localeCompare(b.sampledAt)
        );
        const pending = list.filter(isPendingIdentification).length;
        return (
          <section className="panel case-card" key={caseNo}>
            <div className="heading">
              <div>
                <p>案件编号</p>
                <h2>{caseNo}</h2>
              </div>
              <div className="case-stats">
                <span className="tag">{list.length} 个批次</span>
                {pending > 0 && (
                  <span className="tag tag-pending">{pending} 个待鉴定</span>
                )}
              </div>
            </div>
            <div className="case-stage-summary">
              {STAGES.map((stage) => {
                const count = list.filter((s) => s.stage === stage).length;
                return (
                  <span
                    key={stage}
                    className={count > 0 ? "stage-pill active" : "stage-pill"}
                  >
                    {stage} × {count}
                  </span>
                );
              })}
            </div>
            <div className="records">
              {sorted.map((s) => (
                <article key={s.id}>
                  <b>{s.stage.slice(0, 1)}</b>
                  <div>
                    <h3>
                      {s.batchNo} · {s.species}
                      {isPendingIdentification(s) && (
                        <span className="tag tag-pending">待鉴定</span>
                      )}
                    </h3>
                    <p>
                      {s.location} · {s.exposureStage} · 采样{" "}
                      {formatDateTime(s.sampledAt)} · {s.preservation} · 温度记录{" "}
                      {s.temperatures.length} 条
                    </p>
                  </div>
                  <button type="button" onClick={() => onOpenSample(s.id)}>
                    查看详情
                  </button>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
