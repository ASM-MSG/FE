import { Linking } from "react-native";

/**
 * 시스템 앱 설정 화면 열기 (MSG-447 기준 3·8·11) — 영구 거부(`denied`)된 권한을 되살릴 수 있는
 * **유일한 경로**다. OS가 두 번째부터 권한 프롬프트를 띄우지 않기 때문이다.
 *
 * 새 의존성이 아니라 react-native 내장이다 — 네이티브 모듈 추가가 없어 `prebuild` 재실행 없이
 * 기존 dev client에서 동작한다.
 *
 * 실패를 삼키는 이유(추정 4): 제조사 스킨·설정 액티비티 부재로 던질 수 있는데, 여기서 던지면
 * 안내를 띄운 화면이 통째로 죽는다. 되살리려던 동선이 앱을 죽이면 안 된다.
 */
export const openAppSettings = async (): Promise<void> => {
  try {
    await Linking.openSettings();
  } catch {
    // 설정 화면을 못 여는 기기 — 안내만 닫히고 앱은 그대로 동작한다
  }
};
