import { SampleBatch, uid } from "./types";

const STORAGE_KEY = "hxyfront-62003:samples:v1";

function seedSamples(): SampleBatch[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const hour = 60 * 60 * 1000;
  const at = (offsetMs: number) => {
    const d = new Date(now - offsetMs);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };
  const temps = (points: Array<[number, number]>) =>
    points.map(([offsetH, value]) => ({
      id: uid(),
      time: at(offsetH * hour),
      value,
    }));

  return [
    {
      id: uid(),
      batchNo: "PC-20260910-001",
      caseNo: "CASE-042",
      location: "城郊室外草地",
      exposureStage: "腐败期",
      species: "丝光绿蝇",
      stage: "幼虫",
      sampledAt: at(2 * day),
      preservation: "75% 乙醇保存",
      notes: "幼虫三龄,体长均值 12.4mm,已拍照存档",
      temperatures: temps([
        [50, 24.1],
        [44, 26.8],
        [38, 28.6],
        [32, 27.2],
        [26, 23.5],
      ]),
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: uid(),
      batchNo: "PC-20260910-002",
      caseNo: "CASE-042",
      location: "尸骸阴影区域",
      exposureStage: "干化期",
      species: "大头金蝇",
      stage: "蛹",
      sampledAt: at(2 * day - 3 * hour),
      preservation: "干燥保存",
      notes: "蛹壳完整,种属需复核",
      temperatures: temps([
        [49, 23.4],
        [43, 25.9],
        [37, 27.8],
      ]),
      createdAt: now - 2 * day,
      updatedAt: now - 2 * day,
    },
    {
      id: uid(),
      batchNo: "PC-20260911-001",
      caseNo: "CASE-051",
      location: "河道水沟边缘",
      exposureStage: "肿胀期",
      species: "巨尾阿丽蝇",
      stage: "成虫",
      sampledAt: at(day),
      preservation: "活体饲养",
      notes: "",
      temperatures: temps([
        [30, 22.6],
        [24, 25.1],
        [18, 26.4],
        [12, 24.9],
        [6, 21.8],
      ]),
      createdAt: now - day,
      updatedAt: now - day,
    },
  ];
}

export function loadSamples(): SampleBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedSamples();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SampleBatch =>
        item && typeof item.id === "string" && Array.isArray(item.temperatures)
    );
  } catch {
    return seedSamples();
  }
}

export function saveSamples(samples: SampleBatch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  } catch {
    // 存储满或被禁用时静默失败,页面内数据仍可用
  }
}
