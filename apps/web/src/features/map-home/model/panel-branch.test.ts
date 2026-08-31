import { describe, expect, it } from "vitest";
import { homePanelKind } from "./panel-branch";

const base = {
  activeTheme: null,
  selectedMissionId: null,
  selectedGridId: null,
} as const;

describe("homePanelKind — 좌측 패널 분기 우선순위 (AC 7)", () => {
  it("칩이 없으면 지역 격자 패널이다 (AC 7)", () => {
    expect(homePanelKind(base)).toBe("region");
  });

  it("핫구역 칩이면 동 요약이다 (AC 7)", () => {
    expect(homePanelKind({ ...base, activeTheme: "hot" })).toBe("hot-region");
  });

  it("지역축제·팝업스토어 칩이면 미션 목록이다 (AC 7)", () => {
    expect(homePanelKind({ ...base, activeTheme: "festival" })).toBe(
      "mission-list",
    );
    expect(homePanelKind({ ...base, activeTheme: "popup" })).toBe(
      "mission-list",
    );
  });

  it("경로추천 칩이면 코스 목록이다 (AC 7)", () => {
    expect(homePanelKind({ ...base, activeTheme: "route" })).toBe(
      "course-list",
    );
  });

  it("미션을 고르면 목록보다 상세가 앞선다 (AC 7)", () => {
    expect(
      homePanelKind({ ...base, activeTheme: "festival", selectedMissionId: 7 }),
    ).toBe("mission-detail");
    expect(
      homePanelKind({ ...base, activeTheme: "route", selectedMissionId: 7 }),
    ).toBe("course-detail");
  });

  it("격자를 고르면 미션 상세보다 격자 상세가 앞선다 (AC 7)", () => {
    expect(
      homePanelKind({
        activeTheme: "route",
        selectedMissionId: 7,
        selectedGridId: "39064_112221",
      }),
    ).toBe("grid-detail");
  });

  it("칩 없이 격자만 골라도 격자 상세다 (경계 — 점령 격자 탭)", () => {
    expect(homePanelKind({ ...base, selectedGridId: "39064_112221" })).toBe(
      "grid-detail",
    );
  });

  it("핫구역 칩에서 미션 선택은 무시된다 (경계 — 핫구역엔 미션이 없다)", () => {
    expect(
      homePanelKind({ ...base, activeTheme: "hot", selectedMissionId: 7 }),
    ).toBe("hot-region");
  });
});

describe("homePanelKind — 행사방 분기 (MSG-516 AC 10·추정 6)", () => {
  it("행사방이 열려 있으면 행사방이다", () => {
    expect(homePanelKind({ ...base, eventRoomOpen: true })).toBe("event-room");
  });

  it("격자 상세가 행사방보다 앞선다 (우선순위 — grid-detail 아래)", () => {
    expect(
      homePanelKind({
        ...base,
        eventRoomOpen: true,
        selectedGridId: "39064_112221",
      }),
    ).toBe("grid-detail");
  });

  it("테마 칩과 동시에 남으면 행사방이 이긴다 (경계 — 상호 배타는 뷰가 배선, 잔존 시 유령 패널 방지)", () => {
    expect(
      homePanelKind({ ...base, eventRoomOpen: true, activeTheme: "hot" }),
    ).toBe("event-room");
  });

  it("입력을 생략하면 기존 분기 그대로다 (하위 호환)", () => {
    expect(homePanelKind(base)).toBe("region");
  });
});
