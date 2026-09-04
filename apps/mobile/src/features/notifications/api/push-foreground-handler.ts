/**
 * 포그라운드 배너 핸들러 등록 (MSG-429 기준 14 → MSG-567 축소).
 *
 * 구 `push-navigation-routing`(알림 탭 → `/upload/blur` 라우팅·콜드 스타트 조회)은 BE 실측으로
 * FCM 푸시에 `data`가 없어 원래 성립하지 않았고, 블러 파이프라인과 함께 삭제했다. 남는 접점은
 * 배너 핸들러 등록 하나다. 푸시 `data` 계약이 생기면 그때 라우팅을 다시 만든다.
 *
 * 어댑터를 주입받는다 — `expo-notifications`를 직접 물면 vitest가 파싱 단계에서 죽고,
 * 무엇보다 **네이티브 모듈 부재 내성**을 검증할 수단이 사라진다.
 *
 * **네이티브 모듈 부재 내성 (2026-08-19 실기 환류)**: 실기에서 `expo-notifications`가
 * 링크되지 않은 APK가 나왔고, 어댑터의 **import 문 자체**가 던지자
 * (`Cannot find native module 'ExpoPushTokenManager'`) 그 파일을 간접 import하는
 * `_layout.tsx`가 통째로 평가 실패했다 — 앱 전체가 죽는다. 이 저장소는 **구 dev client APK와
 * 새 JS가 어긋나는 상황이 반복**되므로(MSG-423·425 이력) 어댑터를 동적 로드로 격리하고,
 * 등록 실패를 삼켜 "푸시 없음"까지만 퇴화시킨다.
 */
export interface PushForegroundDeps {
  /** 포그라운드 배너 표시 설정 — 최초 1회 (네이티브 모듈 접촉 지점) */
  ensureForegroundHandler: () => Promise<void>;
}

export const registerPushForegroundHandler = (
  deps: PushForegroundDeps,
): void => {
  void deps.ensureForegroundHandler().catch(() => {
    // 네이티브 모듈 부재·권한 미비 = 푸시 없음. 앱은 계속 뜬다
  });
};
