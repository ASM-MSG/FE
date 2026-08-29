import { describe, expect, it } from "vitest";
import { ROUTES } from "@/app/routes";
import { gateRouteClusters } from "./cluster-route-gate";

/** 저줌 집계 마커 3종(지역 점령·미션·핫구역)이 셸에서 파생돼 내려오는 모양의 표본 */
const CLUSTERS = [
  { id: "busanjin-gu", count: 12 },
  { id: "haeundae-gu", count: 4 },
];

describe("gateRouteClusters — AI 경로추천에서 집계 마커 숨김 (MSG-489 §12)", () => {
  it("/ai-route에서는 집계 마커를 한 개도 내리지 않는다", () => {
    expect(gateRouteClusters(CLUSTERS, ROUTES.aiRoute)).toEqual([]);
  });

  it("지도 홈에서는 파생된 집계 마커를 그대로 내린다 — 다른 섹션 영향 0", () => {
    expect(gateRouteClusters(CLUSTERS, ROUTES.home)).toBe(CLUSTERS);
  });

  it("도감·프로필 등 다른 섹션도 기존 동작을 유지한다", () => {
    expect(gateRouteClusters(CLUSTERS, ROUTES.dex)).toBe(CLUSTERS);
    expect(gateRouteClusters(CLUSTERS, ROUTES.profile)).toBe(CLUSTERS);
  });
});
