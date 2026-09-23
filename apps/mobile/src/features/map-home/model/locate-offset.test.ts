import { describe, expect, it } from "vitest";
import {
  PEEK_HEIGHT,
  sheetStagePositions,
  type SheetStage,
} from "./sheet-snap";
import {
  LOCATE_GAP,
  locateBottomOffset,
  mapBottomInset,
} from "./locate-offset";

/**
 * L11: 내 위치 버튼의 하단 오프셋이 시트 1·2·3단계 각각에서 그 단계의 시트 상단보다
 * 위의 y를 반환하고, 4단계(숨김)에서는 피크 기준값을 반환한다 (요구 8).
 *
 * 좌표계: 반환값은 화면 바닥 기준 버튼 하단의 높이(px)다. 시트 상단의 같은 기준 높이는
 * `bottomOffset + (containerHeight - positions[stage])` — 이 값보다 커야 가려지지 않는다.
 */
const CONTAINER_HEIGHT = 720;
const BOTTOM_OFFSET = 98; // 바텀 내비(64) + 하단 safe area(34)

const sheetTopFromScreenBottom = (stage: SheetStage): number =>
  BOTTOM_OFFSET +
  (CONTAINER_HEIGHT - sheetStagePositions(CONTAINER_HEIGHT)[stage]);

describe("locateBottomOffset — 시트 단계별 내 위치 버튼 위치 (L11)", () => {
  it("1·2·3단계 모두에서 그 단계의 시트 상단보다 위에 놓인다", () => {
    for (const stage of [1, 2, 3] as const) {
      expect(
        locateBottomOffset(stage, CONTAINER_HEIGHT, BOTTOM_OFFSET),
      ).toBeGreaterThan(sheetTopFromScreenBottom(stage));
    }
  });

  it("시트가 펼쳐질수록 버튼이 더 위로 올라간다 — 3단계 < 2단계 < 1단계", () => {
    const peek = locateBottomOffset(3, CONTAINER_HEIGHT, BOTTOM_OFFSET);
    const half = locateBottomOffset(2, CONTAINER_HEIGHT, BOTTOM_OFFSET);
    const full = locateBottomOffset(1, CONTAINER_HEIGHT, BOTTOM_OFFSET);

    expect(peek).toBeLessThan(half);
    expect(half).toBeLessThan(full);
  });

  it("4단계(시트 숨김)에서는 피크(3단계) 기준값을 유지한다 — 바닥으로 내려앉지 않는다", () => {
    expect(locateBottomOffset(4, CONTAINER_HEIGHT, BOTTOM_OFFSET)).toBe(
      locateBottomOffset(3, CONTAINER_HEIGHT, BOTTOM_OFFSET),
    );
  });

  it("컨테이너 미측정(높이 0)이면 피크 높이 기준값으로 시작한다 — 진입 첫 프레임에 버튼이 바닥으로 튀지 않는다", () => {
    expect(locateBottomOffset(2, 0, BOTTOM_OFFSET)).toBe(
      BOTTOM_OFFSET + PEEK_HEIGHT + LOCATE_GAP,
    );
  });
});

describe("mapBottomInset — 시트 위 보이는 영역 기준 지도 하단 인셋 (MSG-601 환류)", () => {
  it("2·3단계는 바텀 내비 + 그 단계의 시트 노출 높이다", () => {
    for (const stage of [2, 3] as const) {
      expect(mapBottomInset(stage, CONTAINER_HEIGHT, BOTTOM_OFFSET)).toBe(
        sheetTopFromScreenBottom(stage),
      );
    }
  });

  it("1단계(전체 확장)는 2단계 값으로 캡한다 — 콘텐츠 영역이 10%만 남는 인셋을 SDK에 넘기지 않는다", () => {
    expect(mapBottomInset(1, CONTAINER_HEIGHT, BOTTOM_OFFSET)).toBe(
      mapBottomInset(2, CONTAINER_HEIGHT, BOTTOM_OFFSET),
    );
  });

  it("4단계(숨김)와 미측정(높이 0)은 피크 기준값이다 — 내 위치 버튼과 같은 규칙", () => {
    expect(mapBottomInset(4, CONTAINER_HEIGHT, BOTTOM_OFFSET)).toBe(
      mapBottomInset(3, CONTAINER_HEIGHT, BOTTOM_OFFSET),
    );
    expect(mapBottomInset(2, 0, BOTTOM_OFFSET)).toBe(
      BOTTOM_OFFSET + PEEK_HEIGHT,
    );
  });
});
