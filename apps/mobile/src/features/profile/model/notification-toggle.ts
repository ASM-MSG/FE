import type {
  ApiResponseDtoNotificationPreferenceResponseDto,
  CategoryPreferenceDto,
} from "../../../shared/api/sdk";
import type { PermissionState } from "../../../shared/permission-state";
import { PUSH_PERMISSION_DENIED_MESSAGE } from "../../notifications/model/push-registration";

/**
 * `알림 받기` 단일 토글 ↔ 알림 카테고리 5종 파생 (MSG-426 기준 2~5).
 * 순수 모델 — 플랫폼 API·react·라우터 무의존 (타입만 생성물에서 참조하므로 런타임 의존 없음).
 *
 * 서버 preferences에는 "전체 수신" 마스터 필드가 없고 카테고리 5종만 있다. 티켓은 단일
 * 토글을 요구하므로 FE가 합성한다 (스펙 Q1 결정):
 * - 표시: 하나라도 on이면 ON (`some`) — `every`면 부분 상태가 OFF로 보여 "껐는데 알림이
 *   온다"는 반대 혼란이 생긴다
 * - 저장: 5종 전부에 같은 값을 PATCH, 하나라도 실패하면 스냅숏으로 전체 롤백
 * 웹 `features/notifications/model/preference-cache.ts`의 봉투 순수 조작 패턴을 따른다.
 */

/** 명세 고정 5종 — 표시·일괄 저장의 정본 순서 */
export const NOTIFICATION_CATEGORIES = [
  "BADGE",
  "HOTZONE",
  "REMIND",
  "VIDEO",
  "WEEKLY",
] as const;

export type NotificationCategory = CategoryPreferenceDto["category"];

/** getPreferences 캐시 원본 형태 — 봉투 그대로 (mutation도 같은 키의 봉투에 쓴다) */
export type PreferencesEnvelope =
  ApiResponseDtoNotificationPreferenceResponseDto;

/** 카테고리별 수신 상태 — 5종이 항상 채워진 형태 */
export type PreferenceMap = Record<NotificationCategory, boolean>;

/**
 * 봉투에서 5종 수신 상태를 읽는다 — 저장 행이 없는 카테고리는 `true` (기준 4).
 * 명세 주석대로 off 행 부재가 곧 수신 동의다(opt-out 기본 전부 on).
 */
export const readPreferences = (envelope: PreferencesEnvelope): PreferenceMap =>
  Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [
      category,
      envelope.data.preferences.find((row) => row.category === category)
        ?.enabled ?? true,
    ]),
  ) as PreferenceMap;

/** 단일 토글 표시값 — 하나라도 켜져 있으면 ON (기준 3·4, 스펙 Q1) */
export const deriveMasterToggle = (preferences: PreferenceMap): boolean =>
  NOTIFICATION_CATEGORIES.some((category) => preferences[category]);

/**
 * 토글 값을 5종 전부에 기록한 **새 봉투**를 만든다 (기준 2·3의 낙관 반영).
 * 원본은 건드리지 않는다 — 롤백 스냅숏(기준 5)이 낙관 반영에 오염되면 되돌릴 곳이 없다.
 */
export const applyMasterToggle = (
  envelope: PreferencesEnvelope,
  enabled: boolean,
): PreferencesEnvelope => ({
  ...envelope,
  data: {
    ...envelope.data,
    preferences: NOTIFICATION_CATEGORIES.map((category) => ({
      category,
      enabled,
    })),
  },
});

/** 저장 실패 재시도 안내 (MSG-426 기준 5) — 다음 시도가 시작되면 사라진다 */
export const NOTIFICATION_SAVE_ERROR_TEXT =
  "알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요";

/**
 * `알림 받기` 행의 안내 — 문구와 **복구 수단**을 함께 판정한다 (MSG-429 기준 15, MSG-447 기준 11·12).
 *
 * - `settings`: 앱 안에서 고칠 수 없다. 시스템 설정으로 내보내는 CTA가 필요하다
 * - `text`: 재시도로 풀린다. 종전대로 행 아래 캡션만 붙인다
 *
 * MSG-429가 두 축(서버 preferences 5종 / OS 권한 + FCM 토큰)의 실패 사유를 한 문자열로 합쳤는데,
 * MSG-447에서 **권한 거부에 실제로 갈 곳이 생기면서** 종류를 나눠야 했다. 종전에는 같은 문구가
 * 탭할 수 없는 텍스트로만 있어 사용자가 읽고도 갈 곳이 없었다.
 *
 * `permission`을 따로 받는 이유(기준 11): 토글을 **한 번도 건드리지 않은** 사용자에게도 거부
 * 사실이 보여야 한다. `pushError`는 조작 결과라 진입 직후에는 항상 null이다.
 */
export type NotificationNotice =
  | { kind: "settings"; text: string }
  | { kind: "text"; text: string };

export const resolveNotificationNotice = (input: {
  permission: PermissionState;
  pushError: "denied" | "failed" | null;
  preferencesFailed: boolean;
}): NotificationNotice | undefined => {
  // 권한 거부가 저장 실패보다 우선한다 — "잠시 후 다시 시도"는 설정을 열기 전까지 영원히 거짓이다
  if (input.permission === "denied" || input.pushError === "denied") {
    return { kind: "settings", text: PUSH_PERMISSION_DENIED_MESSAGE };
  }
  if (input.pushError === "failed" || input.preferencesFailed) {
    return { kind: "text", text: NOTIFICATION_SAVE_ERROR_TEXT };
  }
  return undefined;
};
