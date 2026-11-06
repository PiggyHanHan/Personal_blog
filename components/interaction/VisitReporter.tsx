"use client";

import { usePathname } from "next/navigation";
import { useReportVisit } from "@/lib/visitStore";

// 访客上报（计划 3.1）：只上报，不渲染任何东西。
// 挂在 app/layout.tsx，每次路由变化 POST 一次 /api/stats（= 一次 PV）；
// 数字由开屏的 <VisitorLine variant="intro"> 与侧边栏的 <VisitorLine variant="sidebar"> 共享显示。
export default function VisitReporter() {
  useReportVisit(usePathname());
  return null;
}
