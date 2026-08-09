// 时间段划分：原神开屏按真实时间显示不同时段的画面
export type Period = "dawn" | "day" | "dusk" | "night";

/** 根据小时（0-23）返回对应时间段 */
export function getPeriod(hour: number): Period {
  if (hour >= 5 && hour < 8) return "dawn"; // 清晨
  if (hour >= 8 && hour < 17) return "day"; // 白天
  if (hour >= 17 && hour < 20) return "dusk"; // 黄昏
  return "night"; // 夜晚（20:00–04:59）
}
