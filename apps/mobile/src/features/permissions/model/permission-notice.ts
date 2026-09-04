import type { PermissionState } from "../../../shared/permission-state";
import { PUSH_PERMISSION_DENIED_MESSAGE } from "../../notifications/model/push-registration";

/**
 * 권한 거부 후 **복구 동선**의 정본 (MSG-447 기준 2·3·8·11) — 순수 파생.
 *
 * 이 티켓이 채우는 구멍은 "권한 요청"이 아니라(그건 이미 있었다) "거부됐을 때 사용자가 돌아올
 * 길"이다. 그 길을 화면에 두면 모바일에는 렌더 테스트 인프라가 없어(vitest.config 정책) 회귀를
 * 잡을 자산이 실기밖에 남지 않으므로, 축 × 상태 → 안내·CTA 파생을 여기로 뺀다.
 */
/** MSG-564: `gallery`(프로필 사진 선택) 추가 — 방금 누른 버튼이 막힌 상황이라 위치 축과 동형(차단형 모달) */
export type PermissionAxis = "location" | "notification" | "gallery";

/** 복구 수단 — 재요청(프롬프트가 아직 뜬다) vs 시스템 설정 이동(영구 거부) */
export type PermissionRecovery = "request" | "settings";

export interface PermissionNotice {
  title: string;
  message: string;
  recovery: PermissionRecovery;
  actionLabel: string;
}

/** 안드로이드 관례 라벨 (추정 3) — 인라인 안내도 같은 라벨을 쓴다 */
export const PERMISSION_SETTINGS_LABEL = "설정 열기";
const PERMISSION_REQUEST_LABEL = "권한 요청";

/**
 * 축별 안내 문구 — **복구 수단마다 다른 본문을 갖는다**(실기 회귀).
 *
 * 처음에는 축마다 본문 하나였는데, 재요청 가능한 상태에서 [권한 요청] 버튼 위에 "기기
 * 설정에서 허용해주세요"가 붙는 화면이 나왔다. 시키는 대로 설정에 다녀와도 그 상태에서는
 * 바꿀 항목 자체가 없어 사용자가 헛걸음한다. 본문은 버튼이 실제로 하는 일을 말해야 한다.
 *
 * **알림 축의 `settings` 문구는 MSG-429의 기존 상수를 그대로 재사용한다**(추정 2) — 같은
 * 상황에서 프로필 토글과 업로드 완료 화면이 서로 다른 말을 하면 사용자는 다른 문제로 읽는다.
 */
const AXIS_COPY: Record<
  PermissionAxis,
  { title: string; request: string; settings: string }
> = {
  location: {
    title: "위치 권한이 필요해요",
    request: "지도에서 현재 위치를 찾으려면 위치 권한을 허용해주세요",
    settings:
      "현재 위치를 지도에 표시하려면 기기 설정에서 위치 권한을 허용해주세요",
  },
  notification: {
    title: "알림 권한이 필요해요",
    request: "블러 처리 완료를 알림으로 받으려면 알림 권한을 허용해주세요",
    settings: PUSH_PERMISSION_DENIED_MESSAGE,
  },
  gallery: {
    title: "갤러리 접근 권한이 필요해요",
    request: "프로필 사진을 고르려면 갤러리 접근 권한을 허용해주세요",
    settings:
      "프로필 사진을 바꾸려면 기기 설정에서 사진 접근 권한을 허용해주세요",
  },
};

/**
 * 권한 상태 → 안내. 허용된 축에는 안내가 없다(null).
 *
 * `undetermined`가 [권한 요청]인 이유는 안드로이드의 `canAskAgain`이 **첫 거부 직후에도 true**라
 * 프롬프트를 한 번 더 띄울 수 있기 때문이다(리스크 R3). 두 번째 거부부터 `denied`가 되고, 그때는
 * 앱 안에서 되살릴 수단이 없어 시스템 설정으로 내보내는 것 말고는 방법이 없다.
 */
export const derivePermissionNotice = (
  axis: PermissionAxis,
  state: PermissionState,
): PermissionNotice | null => {
  if (state === "granted") return null;
  const copy = AXIS_COPY[axis];
  const recovery: PermissionRecovery =
    state === "denied" ? "settings" : "request";
  return {
    title: copy.title,
    message: copy[recovery],
    recovery,
    actionLabel:
      recovery === "settings"
        ? PERMISSION_SETTINGS_LABEL
        : PERMISSION_REQUEST_LABEL,
  };
};
