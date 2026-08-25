import { describe, expect, it } from "vitest";
import { PUSH_PERMISSION_DENIED_MESSAGE } from "../../notifications/model/push-registration";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_SAVE_ERROR_TEXT,
  applyMasterToggle,
  deriveMasterToggle,
  readPreferences,
  resolveNotificationNotice,
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

/**
 * 템플릿 ① 순수 로직 — 토글 하나가 서버 preferences(MSG-426)와 OS 권한·FCM 토큰(MSG-429)
 * 두 축을 동시에 움직이면서 실패 사유가 둘로 늘었고(MSG-429 기준 15), MSG-447이 여기에
 * **복구 수단의 차이**를 더한다: 권한 거부는 앱 안에서 고칠 수 없어 시스템 설정으로 내보내야
 * 하고, 저장 실패는 재시도로 풀린다. 어느 쪽인지의 판정을 화면에 두면 회귀를 잡을 자산이
 * 실기밖에 남지 않아 순수 파생으로 뺀다.
 */
describe("resolveNotificationNotice — 안내 종류·우선순위 (MSG-447 기준 11·12)", () => {
  it("정상이면 안내가 없다", () => {
    expect(
      resolveNotificationNotice({
        permission: "granted",
        pushError: null,
        preferencesFailed: false,
      }),
    ).toBeUndefined();
  });

  it("아직 물어본 적 없는 상태에는 안내가 없다 — 토글 탭이 곧 요청이라 미리 겁줄 이유가 없다", () => {
    expect(
      resolveNotificationNotice({
        permission: "undetermined",
        pushError: null,
        preferencesFailed: false,
      }),
    ).toBeUndefined();
  });

  it("OS 권한이 거부돼 있으면 토글을 건드리지 않아도 설정 안내가 보인다 (기준 11)", () => {
    expect(
      resolveNotificationNotice({
        permission: "denied",
        pushError: null,
        preferencesFailed: false,
      }),
    ).toEqual({ kind: "settings", text: PUSH_PERMISSION_DENIED_MESSAGE });
  });

  it("권한 거부는 저장 실패보다 우선한다 — '잠시 후 다시 시도'는 설정을 열기 전까지 영원히 거짓이다 (기준 12)", () => {
    expect(
      resolveNotificationNotice({
        permission: "denied",
        pushError: "denied",
        preferencesFailed: true,
      }),
    ).toEqual({ kind: "settings", text: PUSH_PERMISSION_DENIED_MESSAGE });
  });

  it("권한 판독이 아직 granted여도 토글 시도가 거부로 끝났으면 설정 안내다 — 재판독을 기다리지 않는다", () => {
    expect(
      resolveNotificationNotice({
        permission: "granted",
        pushError: "denied",
        preferencesFailed: false,
      }),
    ).toEqual({ kind: "settings", text: PUSH_PERMISSION_DENIED_MESSAGE });
  });

  it("푸시 등록 실패는 재시도 안내다 — 설정으로 보내지 않는다 (기준 12)", () => {
    expect(
      resolveNotificationNotice({
        permission: "granted",
        pushError: "failed",
        preferencesFailed: false,
      }),
    ).toEqual({ kind: "text", text: NOTIFICATION_SAVE_ERROR_TEXT });
  });

  it("푸시는 멀쩡한데 preferences 저장만 실패해도 재시도 안내다 (기준 12)", () => {
    expect(
      resolveNotificationNotice({
        permission: "granted",
        pushError: null,
        preferencesFailed: true,
      }),
    ).toEqual({ kind: "text", text: NOTIFICATION_SAVE_ERROR_TEXT });
  });
});
