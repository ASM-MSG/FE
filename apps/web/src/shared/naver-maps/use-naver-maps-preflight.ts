import { useEffect, useState } from "react";
import {
  buildNaverMapsScriptUrl,
  loadNaverMapsScript,
  markNaverMapsPoisoned,
} from "./naver-sdk-loader";

/**
 * 네이버 지도 SDK 프리플라이트 상태 훅 — 지도 경계 전용 웹 코드(RN 경계: 지도 격리).
 *
 * `MapCanvas`(유저 지도)·`AreaMapCanvas`(위치 영역 지정)가 각자 들고 있는 effect 쌍
 * ① 스크립트 프리플라이트 로드 ② `window.navermap_authFailure` 전역 훅 수신을 하나로
 * 묶은 것이다. 두 곳이 이미 nose 중복 가족으로 등재돼 있어(MSG-547 미결 권고) 세 번째
 * 지도 경계(MSG-553 심사 상세)가 복제하지 않도록 신규 파일로 추출했다 —
 * **기존 두 캔버스의 이관은 후속 티켓 몫이다**(웨이브 3 경계: 두 파일 무접촉).
 * 그래서 로직은 검증된 원본을 복제 수준으로 이식했고 계약을 테스트로 고정한다.
 *
 * 인증 실패는 스크립트 로드와 별개 경로다: SDK는 `naver.maps`를 내부만 깨진 채 남기고
 * jsContentLoaded까지 true로 만들 수 있어(naver-sdk-loader JSDoc), 전역 훅이 유일하게
 * 신뢰 가능한 신호다. 받으면 로더에 오염을 알려 다음 로드가 재주입 = 진짜 재시도가 된다.
 *
 * 재시도는 이 훅이 아니라 호출부가 소유한다 — `resetNaverMapsPreflight()` 후
 * 하위 뷰를 remount(attempt key)하면 이 훅도 초기 상태로 다시 태워진다.
 */
export type NaverMapsStatus = "loading" | "ready" | "failed";

export const useNaverMapsPreflight = (
  ncpKeyId: string,
  submodules: readonly string[],
): NaverMapsStatus => {
  // 두 경로를 따로 담는다 — 하나로 접으면 "인증 실패 뒤 늦게 resolve된 로드"가
  // failed를 ready로 덮어쓴다(원본 두 캔버스도 상태 2개로 갈라 둔 이유)
  const [authFailed, setAuthFailed] = useState(false);
  const [sdkStatus, setSdkStatus] = useState<NaverMapsStatus>("loading");
  // 배열 리터럴을 그대로 의존성에 실으면 매 렌더 신규 참조라 로드가 반복된다 —
  // 문자열로 접어 값 동일성으로 비교한다(호출부가 모듈 상수를 쓰지 않아도 안전)
  const submoduleKey = submodules.join(",");

  useEffect(() => {
    let cancelled = false;
    const url = buildNaverMapsScriptUrl(
      ncpKeyId,
      submoduleKey === "" ? [] : submoduleKey.split(","),
    );
    loadNaverMapsScript(url).then(
      () => {
        if (!cancelled) setSdkStatus("ready");
      },
      () => {
        if (!cancelled) setSdkStatus("failed");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [ncpKeyId, submoduleKey]);

  useEffect(() => {
    const handleAuthFailure = () => {
      markNaverMapsPoisoned();
      setAuthFailed(true);
    };
    window.navermap_authFailure = handleAuthFailure;
    return () => {
      if (window.navermap_authFailure === handleAuthFailure) {
        delete window.navermap_authFailure;
      }
    };
  }, []);

  return authFailed ? "failed" : sdkStatus;
};
