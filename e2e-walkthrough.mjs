// 端到端走查:录入 → 空表单/重复提交提示 → 筛选 → 详情编辑 → 温度记录与图 → 案件关联 → 刷新保留 → 移除
// 运行:node e2e-walkthrough.mjs(需 dev server 运行在 62003)
import { chromium } from "playwright";

const BASE = "http://localhost:62003";
let passed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(`断言失败: ${msg}`);
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

async function metricValue(page, label) {
  return page
    .locator(".metrics article", { has: page.locator("small", { hasText: label }) })
    .locator("strong")
    .innerText();
}

async function fillBatchForm(page, data) {
  const form = page.locator(".form-panel");
  await form.getByPlaceholder("如 PC-20260912-001").fill(data.batchNo);
  await form.getByPlaceholder("如 CASE-042").fill(data.caseNo);
  await form.getByPlaceholder("如 城郊室外草地").fill(data.location);
  await form.locator('input[type="datetime-local"]').fill(data.sampledAt);
  await form.locator('label:has-text("尸体暴露阶段") select').selectOption({ label: data.exposure });
  await form.getByPlaceholder("如 丝光绿蝇").fill(data.species);
  await form.locator('label:has-text("发育阶段") select').selectOption({ label: data.stage });
  await form.locator('label:has-text("保存方式") select').selectOption({ label: data.preservation });
  if (data.temperature !== undefined) {
    await form.getByPlaceholder("如 26.5,保存为首条温度记录").fill(data.temperature);
  }
  if (data.notes) {
    await form.getByPlaceholder("形态特征、复核意见、拍照存档情况等").fill(data.notes);
  }
}

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("pageerror", (err) => {
    throw new Error(`页面脚本错误: ${err.message}`);
  });

  console.log("1. 首屏种子数据与指标");
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".records article.record");
  assert((await page.locator(".records article.record").count()) === 3, "首屏显示 3 个种子批次");
  assert((await metricValue(page, "样本批次")) === "3", "指标:样本批次 = 3");
  assert((await metricValue(page, "待鉴定")) === "1", "指标:待鉴定 = 1(种子中 1 条备注为空)");
  assert((await metricValue(page, "平均温度")).endsWith("℃"), "指标:平均温度带单位");

  console.log("2. 空表单提交 → 明确提示");
  await page.getByRole("button", { name: "＋ 新建批次" }).click();
  await page.getByRole("button", { name: "保存批次" }).click();
  await page.waitForSelector(".form-banner");
  assert(await page.locator(".form-banner").isVisible(), "空表单提交后出现红色校验横幅");
  assert((await page.locator(".toast-error").first().innerText()).includes("表单为空"), "toast 明确提示「表单为空」");
  assert((await page.locator(".form-panel .field-error").count()) >= 8, "必填字段逐项标红(≥8 处)");
  assert((await page.locator(".records article.record").count()) === 3, "空表单未产生任何记录");

  console.log("3. 正常录入新批次(归入既有案件 CASE-042)");
  await fillBatchForm(page, {
    batchNo: "PC-20260912-100",
    caseNo: "CASE-042",
    location: "废弃仓库内",
    sampledAt: "2026-09-12T08:30",
    exposure: "肿胀期",
    species: "家蝇",
    stage: "卵",
    preservation: "95% 乙醇保存",
    temperature: "25.4",
  });
  await page.getByRole("button", { name: "保存批次" }).click();
  await page.locator(".toast-success", { hasText: "PC-20260912-100" }).first().waitFor();
  assert(await page.locator(".toast-success", { hasText: "PC-20260912-100" }).isVisible(), "成功 toast 包含批次号");
  await page.waitForFunction(() => document.querySelectorAll(".records article.record").length === 4);
  assert((await metricValue(page, "样本批次")) === "4", "指标:样本批次更新为 4");
  assert((await metricValue(page, "待鉴定")) === "2", "指标:新批次备注为空,待鉴定 = 2");
  assert(await page.locator(".records article.record", { hasText: "PC-20260912-100" }).isVisible(), "新批次出现在列表中");

  console.log("4. 重复提交同一批次号 → 明确拦截提示");
  await page.getByRole("button", { name: "＋ 新建批次" }).click();
  await fillBatchForm(page, {
    batchNo: "PC-20260912-100",
    caseNo: "CASE-099",
    location: "另一地点",
    sampledAt: "2026-09-12T09:00",
    exposure: "新鲜期",
    species: "家蝇",
    stage: "卵",
    preservation: "冷冻保存",
  });
  await page.getByRole("button", { name: "保存批次" }).click();
  await page.waitForSelector(".form-panel .field-error");
  assert((await page.locator(".form-panel .field-error").first().innerText()).includes("已存在"), "批次号重复时字段级提示「已存在」");
  await page.locator(".toast-error", { hasText: "未通过校验" }).first().waitFor();
  assert(await page.locator(".toast-error", { hasText: "未通过校验" }).isVisible(), "重复提交出现错误 toast");
  assert((await page.locator(".records article.record").count()) === 4, "重复提交被拦截,记录数不变");
  await page.getByRole("button", { name: "收起", exact: true }).click();

  console.log("5. 按发育阶段筛选列表");
  await page.getByRole("button", { name: /^卵\(1\)$/ }).click();
  assert((await page.locator(".records article.record").count()) === 1, "筛选「卵」后仅 1 条记录");
  assert(await page.locator(".records article.record", { hasText: "PC-20260912-100" }).isVisible(), "卵阶段记录正是新批次");
  await page.getByRole("button", { name: /^幼虫\(1\)$/ }).click();
  assert(await page.locator(".records article.record", { hasText: "丝光绿蝇" }).isVisible(), "筛选「幼虫」显示丝光绿蝇批次");
  await page.getByRole("button", { name: /^全部\(4\)$/ }).click();
  assert((await page.locator(".records article.record").count()) === 4, "切回「全部」恢复 4 条");

  console.log("6. 详情编辑并保存");
  await page.locator(".records article.record", { hasText: "PC-20260912-100" }).getByRole("button", { name: /详情|已选中/ }).click();
  await page.waitForSelector(".detail-panel");
  assert((await page.locator(".detail-panel h2").innerText()).includes("待鉴定"), "详情显示「待鉴定」标记");
  const speciesInput = page.locator('.detail-panel label:has-text("昆虫种类") input');
  await speciesInput.fill("厩腐蝇");
  await page.getByRole("button", { name: "保存修改" }).click();
  await page.locator(".toast-success", { hasText: "修改已保存" }).first().waitFor();
  assert(await page.locator(".records article.record", { hasText: "厩腐蝇" }).isVisible(), "保存后列表同步显示新种名");

  console.log("7. 同批次追加多条温度记录并绘图");
  const addTemp = async (time, value) => {
    await page.locator('.temp-add input[type="datetime-local"]').fill(time);
    await page.locator('.temp-add input[type="number"]').fill(value);
    await page.getByRole("button", { name: "追加温度记录" }).click();
  };
  await page.getByRole("button", { name: "追加温度记录" }).click();
  assert((await page.locator(".detail-panel .field-error").first().innerText()).includes("记录时间"), "温度为空的追加被拦截并提示");
  await addTemp("2026-09-12T09:30", "26.1");
  await page.waitForSelector(".chart-legend");
  assert((await page.locator(".chart-legend").innerText()).includes("共 2 条记录"), "图例显示 2 条温度记录(含建批时的首条)");
  await addTemp("2026-09-12T10:30", "27.3");
  await page.waitForFunction(() => document.querySelectorAll(".temp-list li").length === 3);
  assert((await page.locator(".temp-dot").count()) === 3, "温度折线图渲染 3 个数据点");
  assert((await page.locator(".chart-legend").innerText()).includes("最高 27.3℃"), "图例统计最高温 27.3℃");
  await addTemp("2026-09-12T10:30", "27.3");
  assert((await page.locator(".detail-panel .field-error").first().innerText()).includes("请勿重复添加"), "相同时间+温度的记录被拦截");
  assert((await page.locator(".temp-list li").count()) === 3, "重复温度记录未写入");

  console.log("8. 案件关联视图:多样本归到同一案件");
  await page.getByRole("button", { name: "案件关联" }).click();
  await page.waitForSelector(".case-card");
  const case042 = page.locator(".case-card", { has: page.locator("h2", { hasText: "CASE-042" }) });
  assert((await case042.locator(".tag").first().innerText()).includes("3 个批次"), "CASE-042 下关联 3 个批次");
  assert(await case042.locator(".stage-pill", { hasText: "卵 × 1" }).isVisible(), "CASE-042 阶段分布含 卵×1");
  const case051 = page.locator(".case-card", { has: page.locator("h2", { hasText: "CASE-051" }) });
  assert((await case051.locator(".tag").first().innerText()).includes("1 个批次"), "CASE-051 下 1 个批次");
  await case042.locator("article", { hasText: "PC-20260912-100" }).getByRole("button", { name: "查看详情" }).click();
  await page.waitForSelector(".detail-panel");
  assert((await page.locator(".detail-panel h2").innerText()).includes("PC-20260912-100"), "从案件视图可跳转到对应批次详情");

  console.log("9. 详情中改派案件编号");
  await page.locator('.detail-panel label:has-text("案件编号") input').fill("CASE-051");
  await page.getByRole("button", { name: "保存修改" }).click();
  await page.locator(".toast-success", { hasText: "修改已保存" }).first().waitFor();
  await page.getByRole("button", { name: "案件关联" }).click();
  await page.waitForSelector(".case-card");
  const case051b = page.locator(".case-card", { has: page.locator("h2", { hasText: "CASE-051" }) });
  assert((await case051b.locator(".tag").first().innerText()).includes("2 个批次"), "改派后 CASE-051 变为 2 个批次");

  console.log("10. 刷新后数据保留");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".records article.record");
  assert((await page.locator(".records article.record").count()) === 4, "刷新后 4 个批次仍在");
  assert(await page.locator(".records article.record", { hasText: "厩腐蝇" }).isVisible(), "刷新后编辑结果仍在");
  const stored = await page.evaluate(() => localStorage.getItem("hxyfront-62003:samples:v1"));
  assert(stored && stored.includes("PC-20260912-100") && stored.includes("27.3"), "localStorage 中持久化了新批次与温度记录");
  await page.locator(".records article.record", { hasText: "PC-20260912-100" }).getByRole("button", { name: /详情|已选中/ }).click();
  await page.waitForSelector(".detail-panel");
  assert((await page.locator(".temp-list li").count()) === 3, "刷新后 3 条温度记录仍在");
  await page.getByRole("button", { name: "案件关联" }).click();
  const case051c = page.locator(".case-card", { has: page.locator("h2", { hasText: "CASE-051" }) });
  assert((await case051c.locator(".tag").first().innerText()).includes("2 个批次"), "刷新后案件改派结果仍在");

  console.log("11. 移除批次并确认持久删除");
  await page.getByRole("button", { name: "样本批次" }).click();
  await page.locator(".records article.record", { hasText: "PC-20260912-100" }).getByRole("button", { name: /详情|已选中/ }).click();
  await page.waitForSelector(".detail-panel");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "移除批次" }).click();
  await page.waitForFunction(() => document.querySelectorAll(".records article.record").length === 3);
  assert((await page.locator(".records article.record", { hasText: "PC-20260912-100" }).count()) === 0, "移除后列表不再显示该批次");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".records article.record");
  assert((await page.locator(".records article.record").count()) === 3, "刷新后删除结果保留(3 条)");
  assert((await metricValue(page, "样本批次")) === "3", "指标回落为 3");

  await page.screenshot({ path: "/tmp/walkthrough-final.png", fullPage: true });
  await browser.close();
  console.log(`\n全部通过:${passed} 项断言 ✓`);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
