import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import { BatchDetail } from "./components/BatchDetail";
import { BatchForm } from "./components/BatchForm";
import { CaseBoard } from "./components/CaseBoard";
import { loadSamples, saveSamples } from "./storage";
import {
  DevelopmentStage,
  STAGES,
  SampleBatch,
  formatDateTime,
  isPendingIdentification,
  uid,
} from "./types";

type View = "batches" | "cases";
type StageFilter = DevelopmentStage | "全部";

interface Toast {
  id: string;
  type: "success" | "error";
  text: string;
}

function App() {
  const [samples, setSamples] = useState<SampleBatch[]>(loadSamples);
  const [view, setView] = useState<View>("batches");
  const [stageFilter, setStageFilter] = useState<StageFilter>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 任何数据变化都写入 localStorage,刷新后仍可恢复
  useEffect(() => {
    saveSamples(samples);
  }, [samples]);

  const notify = (type: Toast["type"], text: string) => {
    const id = uid();
    setToasts((list) => [...list, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3600);
  };

  const caseOptions = useMemo(
    () => [...new Set(samples.map((s) => s.caseNo).filter(Boolean))].sort(),
    [samples]
  );

  const metrics = useMemo(() => {
    const temps = samples.flatMap((s) => s.temperatures);
    const avg =
      temps.length > 0
        ? `${(temps.reduce((a, t) => a + t.value, 0) / temps.length).toFixed(1)}℃`
        : "—";
    const stages = new Set(samples.map((s) => s.stage)).size;
    const pending = samples.filter(isPendingIdentification).length;
    return [
      { label: "样本批次", value: String(samples.length) },
      { label: "平均温度", value: avg },
      { label: "发育阶段", value: `${stages}/4 类` },
      { label: "待鉴定", value: String(pending) },
    ];
  }, [samples]);

  const filtered = useMemo(() => {
    const list =
      stageFilter === "全部"
        ? samples
        : samples.filter((s) => s.stage === stageFilter);
    return [...list].sort((a, b) => b.sampledAt.localeCompare(a.sampledAt));
  }, [samples, stageFilter]);

  const selected = samples.find((s) => s.id === selectedId) ?? null;

  const createSample = (sample: SampleBatch) => {
    setSamples((list) => [...list, sample]);
    setSelectedId(sample.id);
    setShowForm(false);
    setStageFilter("全部");
    setView("batches");
  };

  const updateSample = (updated: SampleBatch) => {
    setSamples((list) => list.map((s) => (s.id === updated.id ? updated : s)));
  };

  const removeSample = (id: string) => {
    setSamples((list) => list.filter((s) => s.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const openFromCase = (id: string) => {
    setStageFilter("全部");
    setSelectedId(id);
    setView("batches");
    setShowForm(false);
  };

  return (
    <main className="app">
      <section className="hero">
        <p>法医昆虫学 · 现场样本记录工具</p>
        <h1>样本批次记录台</h1>
        <span>
          记录采样地点、环境温度、尸体暴露阶段、昆虫种类、发育阶段、采样时间、保存方式与鉴定备注;
          支持按发育阶段筛选、同批次追加温度记录并绘图、多批次归入同一案件。数据保存在本机浏览器,刷新不丢失。
        </span>
      </section>

      <section className="metrics" aria-label="统计指标">
        {metrics.map((m) => (
          <article key={m.label}>
            <small>{m.label}</small>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <nav className="toolbar" aria-label="视图切换">
        <div className="view-tabs">
          <button
            type="button"
            className={view === "batches" ? "tab active" : "tab"}
            onClick={() => setView("batches")}
          >
            样本批次
          </button>
          <button
            type="button"
            className={view === "cases" ? "tab active" : "tab"}
            onClick={() => setView("cases")}
          >
            案件关联
          </button>
        </div>
        {view === "batches" && (
          <button
            type="button"
            className="primary"
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "收起新建表单" : "＋ 新建批次"}
          </button>
        )}
      </nav>

      {view === "batches" && (
        <>
          {showForm && (
            <BatchForm
              samples={samples}
              caseOptions={caseOptions}
              onCreate={createSample}
              onCancel={() => setShowForm(false)}
              notify={notify}
            />
          )}

          <section className="panel">
            <div className="heading">
              <div>
                <p>发育阶段筛选</p>
                <h2>批次列表({filtered.length})</h2>
              </div>
            </div>
            <div className="chips" role="group" aria-label="按发育阶段筛选">
              {(["全部", ...STAGES] as StageFilter[]).map((stage) => {
                const count =
                  stage === "全部"
                    ? samples.length
                    : samples.filter((s) => s.stage === stage).length;
                return (
                  <button
                    key={stage}
                    type="button"
                    className={stageFilter === stage ? "chip active" : "chip"}
                    onClick={() => setStageFilter(stage)}
                  >
                    {stage}({count})
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (
              <p className="empty-state">
                {samples.length === 0
                  ? "暂无样本批次,点击右上角「＋ 新建批次」开始录入。"
                  : `当前筛选「${stageFilter}」下没有批次,可切换其他阶段或新建批次。`}
              </p>
            ) : (
              <div className="records">
                {filtered.map((s) => (
                  <article
                    key={s.id}
                    className={s.id === selectedId ? "record selected" : "record"}
                  >
                    <b>{s.stage.slice(0, 1)}</b>
                    <div>
                      <h3>
                        {s.batchNo} · {s.species}
                        {isPendingIdentification(s) && (
                          <span className="tag tag-pending">待鉴定</span>
                        )}
                      </h3>
                      <p>
                        {s.caseNo} · {s.location} · {s.exposureStage} ·{" "}
                        {formatDateTime(s.sampledAt)} · {s.preservation} · 温度记录{" "}
                        {s.temperatures.length} 条
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(s.id);
                        setShowForm(false);
                      }}
                    >
                      {s.id === selectedId ? "已选中" : "详情"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {selected && (
            <BatchDetail
              sample={selected}
              samples={samples}
              caseOptions={caseOptions}
              onSave={updateSample}
              onRemove={removeSample}
              notify={notify}
            />
          )}
        </>
      )}

      {view === "cases" && (
        <CaseBoard samples={samples} onOpenSample={openFromCase} />
      )}

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
}

export default App;
