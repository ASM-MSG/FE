import { describe, expect, it } from "vitest";
import { deriveGridNames, type GridNameQueryLike } from "./grid-names-query";

/**
 * E12·E-16: 스팟 이름 파생과 로딩 게이트.
 *
 * 이 파일이 존재하는 이유는 회귀 하나다 — `isPending`을 `data === undefined`로 계산하면
 * **실패한 쿼리도 data가 undefined인 채로 남아** 게이트가 영원히 안 풀리고, 코스 상세가
 * 무한 로딩에 갇힌다(PR 리뷰 지적). 훅 계층이라 게이트 6종·parity 어느 것도 못 잡는다.
 */
const pending = (): GridNameQueryLike => ({ data: undefined, isPending: true });
/** 재시도까지 소진돼 error로 확정된 쿼리 — status는 error지만 data는 계속 undefined다 */
const failed = (): GridNameQueryLike => ({ data: undefined, isPending: false });
const ok = (
  gridId: string,
  zoneName: string | null,
  zoneCell: string | null,
  regionName: string | null = null,
): GridNameQueryLike => ({
  data: { gridId, zoneName, zoneCell, regionName },
  isPending: false,
});

describe("격자 표시명 파생 (E12)", () => {
  it("구역 라벨 > 행정동명 순으로 이름을 담는다", () => {
    const { names } = deriveGridNames(
      [ok("g1", "자갈치", "B-07"), ok("g2", null, null, "부전동")],
      true,
    );
    expect(names.get("g1")).toBe("자갈치 B-07");
    expect(names.get("g2")).toBe("부전동");
  });

  it("구역명·행정동명이 둘 다 없으면 이름을 담지 않는다 — 뷰가 부재로 분기한다", () => {
    const { names } = deriveGridNames([ok("g3", null, null, null)], true);
    expect(names.has("g3")).toBe(false);
  });
});

describe("로딩 게이트 (E-16)", () => {
  it("하나라도 도착 전이면 pending이다", () => {
    expect(
      deriveGridNames([ok("g1", "자갈치", "B-07"), pending()], true).isPending,
    ).toBe(true);
  });

  it("전부 도착하면 게이트가 풀린다", () => {
    expect(deriveGridNames([ok("g1", "자갈치", "B-07")], true).isPending).toBe(
      false,
    );
  });

  /**
   * 회귀 방지 — 실패한 쿼리는 `data`가 undefined로 남지만 `isPending`은 내려간다.
   * 게이트가 이걸 구분하지 못하면 코스 상세가 영구 ActivityIndicator에 갇힌다.
   */
  it("조회가 실패해도 게이트는 풀린다 — 격자 코드로 폴백해야 하므로 무한 로딩이 아니다", () => {
    expect(deriveGridNames([failed()], true).isPending).toBe(false);
    expect(
      deriveGridNames([ok("g1", "자갈치", "B-07"), failed()], true).isPending,
    ).toBe(false);
  });

  it("일부 실패·일부 성공이면 성공분 이름만 담고 게이트는 풀린다", () => {
    const { names, isPending } = deriveGridNames(
      [ok("g1", "자갈치", "B-07"), failed()],
      true,
    );
    expect(isPending).toBe(false);
    expect(names.get("g1")).toBe("자갈치 B-07");
    expect(names.size).toBe(1);
  });

  /** 비활성 쿼리는 TanStack Query에서 영원히 pending이라 게이트로 눌러야 한다 */
  it("비활성(미인증·스팟 없음)이면 pending이 아니다", () => {
    expect(deriveGridNames([pending()], false).isPending).toBe(false);
    expect(deriveGridNames([], false).isPending).toBe(false);
  });
});
