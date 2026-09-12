import { TemperatureRecord, formatDateTime } from "../types";

interface Props {
  records: TemperatureRecord[];
}

const W = 640;
const H = 220;
const PAD = { top: 18, right: 48, bottom: 34, left: 46 };

/** 手绘 SVG 温度记录折线图,按时间升序 */
export function TemperatureChart({ records }: Props) {
  const sorted = [...records].sort((a, b) => a.time.localeCompare(b.time));

  if (sorted.length === 0) {
    return <p className="chart-empty">暂无温度记录,请在下方追加。</p>;
  }

  const values = sorted.map((r) => r.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const span = maxV - minV || 1;
  const yMin = minV - span * 0.2;
  const yMax = maxV + span * 0.2;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xOf = (i: number) =>
    sorted.length === 1
      ? PAD.left + innerW / 2
      : PAD.left + (i / (sorted.length - 1)) * innerW;
  const yOf = (v: number) => PAD.top + ((yMax - v) / (yMax - yMin)) * innerH;

  const points = sorted.map((r, i) => ({ x: xOf(i), y: yOf(r.value), r }));
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");
  const ticks = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="批次环境温度记录折线图"
        className="temp-chart"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yOf(t)}
              y2={yOf(t)}
              className="grid-line"
            />
            <text x={PAD.left - 8} y={yOf(t) + 4} className="axis-label" textAnchor="end">
              {t.toFixed(1)}℃
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <polyline points={path} className="temp-line" fill="none" />
        )}
        {points.map((p, i) => (
          <g key={p.r.id}>
            <circle cx={p.x} cy={p.y} r={4.5} className="temp-dot" />
            <text x={p.x} y={p.y - 10} className="point-label" textAnchor="middle">
              {p.r.value.toFixed(1)}
            </text>
            {(i === 0 || i === points.length - 1 || points.length <= 5) && (
              <text
                x={p.x}
                y={H - PAD.bottom + 18}
                className="axis-label"
                textAnchor="middle"
              >
                {formatDateTime(p.r.time).slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span>
          共 {sorted.length} 条记录 · 最低 {minV.toFixed(1)}℃ · 最高{" "}
          {maxV.toFixed(1)}℃ · 平均{" "}
          {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}℃
        </span>
      </div>
    </div>
  );
}
