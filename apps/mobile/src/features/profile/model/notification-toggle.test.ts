import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_CATEGORIES,
  applyMasterToggle,
  deriveMasterToggle,
  readPreferences,
  type PreferencesEnvelope,
} from "./notification-toggle";

/**
 * 템플릿 ① 순수 로직 — 알림 5종 봉투 ↔ `알림 받기` 단일 토글 파생 (기준 2·3·4·5).
 * 서버에 마스터 스위치가 없어 FE가 5종을 합성한다(스펙 Q1 결정: 표시=some / 저장=일괄).
 */

const envelope = (
  preferences: PreferencesEnvelope["data"]["preferences"],
): PreferencesEnvelope => ({
  developCode: 0,
  message: "ok",
  data: { preferences },
});

describe("readPreferences — 봉투에서 5종 수신 상태를 읽는다 (기준 4)", () => {
  it("저장 행이 없는 카테고리는 true로 병합된다 — opt-out 기본 (기준 4)", () => {
    expect(readPreferences(envelope([]))).toEqual({
      BADGE: true,
      HOTZONE: true,
      REMIND: true,
      VIDEO: true,
      WEEKLY: true,
    });
  });

  it("저장된 off 행은 false로, 나머지는 true로 읽는다 (기준 4)", () => {
    const read = readPreferences(
      envelope([
        { category: "BADGE", enabled: false },
        { category: "WEEKLY", enabled: true },
      ]),
    );

    expect(read.BADGE).toBe(false);
    expect(read.WEEKLY).toBe(true);
    expect(read.HOTZONE).toBe(true);
  });
});

describe("deriveMasterToggle — 5종에서 단일 토글 표시값을 파생한다 (기준 3·4)", () => {
  it("5종 전부 off면 토글이 꺼짐으로 보인다 (기준 4)", () => {
    const allOff = readPreferences(
      envelope(
        NOTIFICATION_CATEGORIES.map((category) => ({
          category,
          enabled: false,
        })),
      ),
    );

    expect(deriveMasterToggle(allOff)).toBe(false);
  });

  it("하나라도 켜져 있으면 토글이 켜짐으로 보인다 — 부분 상태를 꺼짐으로 보이면 '껐는데 알림이 온다'가 된다 (스펙 Q1)", () => {
    const partial = readPreferences(
      envelope([
        { category: "BADGE", enabled: false },
        { category: "HOTZONE", enabled: false },
        { category: "REMIND", enabled: false },
        { category: "VIDEO", enabled: false },
        { category: "WEEKLY", enabled: true },
      ]),
    );

    expect(deriveMasterToggle(partial)).toBe(true);
  });

  it("저장 행이 하나도 없으면 켜짐으로 보인다 — opt-out 기본 전부 on (기준 4)", () => {
    expect(deriveMasterToggle(readPreferences(envelope([])))).toBe(true);
  });
});

describe("applyMasterToggle — 낙관 전환 값을 봉투에 기록한다 (기준 3)", () => {
  it("5종 전부를 같은 값으로 기록한다 — 저장 행이 없던 카테고리도 채운다 (기준 2·3)", () => {
    const next = applyMasterToggle(
      envelope([{ category: "BADGE", enabled: true }]),
      false,
    );

    expect(readPreferences(next)).toEqual({
      BADGE: false,
      HOTZONE: false,
      REMIND: false,
      VIDEO: false,
      WEEKLY: false,
    });
  });

  it("원본 봉투를 변경하지 않는다 — 롤백 스냅숏이 낙관 반영에 오염되면 안 된다 (기준 5)", () => {
    const before = envelope([{ category: "BADGE", enabled: true }]);

    applyMasterToggle(before, false);

    expect(before.data.preferences).toEqual([
      { category: "BADGE", enabled: true },
    ]);
  });

  it("봉투의 developCode·message는 보존한다 — 캐시 원본 형태가 유지돼야 다음 읽기가 성립한다 (기준 3)", () => {
    const next = applyMasterToggle(envelope([]), true);

    expect(next.developCode).toBe(0);
    expect(next.message).toBe("ok");
  });
});
