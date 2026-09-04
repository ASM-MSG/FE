import { Component, type ReactNode } from "react";

interface MapLoadErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * 네이버 지도 SDK 실패 흡수 경계 — 두 예외 경로를 잡아 폴백을 보인다.
 * ① `useNavermaps`(Suspense)의 렌더 중 throw (프리플라이트 통과 후의 잔여 경로)
 * ② 인증 실패로 SDK가 `naver.maps`를 null화한 뒤 SDK 하위 트리를 언마운트할 때
 *    라이브러리 cleanup(`naver.maps.Event.removeListener`)이 던지는 TypeError
 *
 * **②를 흡수하려면 폴백 전환 시 이 경계가 마운트 상태를 유지해야 한다** — 경계 밖에서
 * 하위 트리를 통째로 갈아끼우면 예외가 라우터 루트까지 전파되어 앱이 죽는다.
 * 즉 `failed ? <Fallback/> : <Map/>` 분기는 반드시 이 경계 **안쪽**에 두어야 한다.
 * 재시도는 상위의 attempt remount가 이 경계째 새로 마운트해 초기화한다.
 *
 * MSG-547에서 `pages/map-home/ui/MapCanvas.tsx` 내부 클래스와 동일한 계약으로
 * shared에 신설했다(두 번째 지도 경계 `AreaMapCanvas` 등장 — codex 리뷰 P2 반영).
 * MapCanvas 쪽 내부 클래스를 이 공용 경계로 교체하는 일은 후속 티켓 몫이다
 * (웨이브 2에서 MapCanvas는 import 1줄만 건드리는 소유 계약).
 */
export class MapLoadErrorBoundary extends Component<
  MapLoadErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    // 흡수한 예외를 관측 가능하게 남긴다 — 폴백 전환 사유의 조용한 유실 방지
    console.error("지도 SDK 하위 트리 예외를 흡수하고 폴백으로 전환:", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
