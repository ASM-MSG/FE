import { useEffect, useRef } from "react";
import type { Bounds } from "@/entities/cell";
import type { DisplayedRegion } from "@/features/region/model/region-panel-store";
import { chipEntryZoom } from "./chip-zoom";
import type { ThemeId } from "./theme";

interface ChipEntryInput {
  activeTheme: ThemeId | null;
  /** 현재 지도 영역 — 스토어가 지도 idle마다 밀어 넣는다 */
  bounds: Bounds | null;
  /** 현재 줌 단 — 줌 명령이 실제로 반영됐는지 판정한다 */
  zoom: number;
  /** 현재 지도 중심 행정동 — 확정 대상. 행정동 밖이면 null */
  region: DisplayedRegion | null;
  /** 줌 명령 — 지도 SDK는 호출부(셸)가 감싼다(RN 경계) */
  zoomTo: (zoom: number) => void;
  /** 확정 — 지역 + 그 시점 영역 */
  commit: (region: DisplayedRegion, bounds: Bounds | null) => void;
}

/**
 * 칩 활성화 진입 처리 (MSG-403 AC 6·9) — 칩에 맞는 줌으로 옮기고, 그 화면을 1회 확정한다.
 * 지도 SDK를 import하지 않는다(명령은 콜백 주입 — RN 경계).
 *
 * 줌 이동과 확정이 한 훅인 이유: 칩은 500m·1km로 **넓힌 화면의 데이터**를 보여주는 것이
 * 목적이라, 줌 전 영역으로 확정하면 넓힌 화면 대부분이 빈 채로 남는다. 그래서 줌 명령을
 * 낸 뒤 새 영역이 도착하면 그 영역으로 한 번 더 확정한다(활성화당 1회).
 * 이후의 이동·줌은 확정을 바꾸지 않는다 — "장소 불러오기"만 바꾼다 (AC 11).
 *
 * **지도 준비를 기다린다**(MSG-395 리뷰 반영): SDK 로드 전에는 zoomTo가 조용히 no-op이라
 * 진입 직후 칩을 누르면 그 세션 내내 줌이 안 맞았다. 뷰포트가 들어온 뒤에만 적용한다.
 *
 * **진입이 정착한 칩을 반환한다**(MSG-451 검증 재작업 1·3): 확정은 데이터 조회 bbox를 바꾸므로,
 * 확정 뒤에 와야 하는 후속 진입(최근접 이동 — `use-nearest-entry`)이 그 시점을 알아야 한다.
 * ref가 아니라 state인 이유가 여기 있다 — 소비처가 그 시점에 다시 렌더돼야 한다.
 *
 * **정착 = 목표 줌 도달**이지 확정 성공이 아니다(재작업 3). 확정은 행정동을 요구하는데,
 * 코스가 해안선을 따라가 지도 중심이 바다에 놓이면 역지오코딩이 null이라 확정이 무기한
 * 미뤄진다. 그 대기에 후속 진입까지 볼모로 잡히면 "줌만 바뀌고 화면은 안 움직이는" 상태가
 * 되므로, 확정 대기와 진입 정착을 분리한다 — 확정 규칙 자체는 그대로다.
 */
export const useChipEntry = ({
  activeTheme,
  bounds,
  zoom,
  region,
  zoomTo,
  commit,
}: ChipEntryInput): ThemeId | null => {
  /** 이 칩 활성화에 대해 줌 명령을 냈는지 — 칩이 바뀌면 다시 처리한다 */
  const handledChipRef = useRef<ThemeId | null>(null);
  /** 아직 확정하지 못한 활성화가 있는지 — 행정동 판별이 늦으면 여기서 기다린다 */
  const pendingCommitRef = useRef(false);

  /**
   * 이 칩이 맞춰야 할 줌 (null이면 대기 없음) — **렌더 중 파생**한다.
   * 종전에는 effect가 ref에 실어 두고 다른 effect가 읽었는데, 그러면 "이전 칩의 잔여
   * 목표가 남는" 동기화 사고(MSG-403 주석 참조)가 구조적으로 가능해진다. 현재 칩에서
   * 곧바로 계산하면 그 상태 자체가 사라진다.
   */
  const targetZoom = activeTheme === null ? null : chipEntryZoom(activeTheme);

  /**
   * 진입이 정착한 칩 — 후속 진입(`use-nearest-entry`)이 기다리는 신호 (MSG-451).
   * **파생값이라 state로 복사하지 않는다**(react-doctor no-derived-state·
   * no-adjust-state-on-prop-change): 정착 = 목표 줌 도달이므로 입력만으로 계산되고,
   * state로 두면 effect가 한 박자 늦게 맞추는 동안 소비처가 옛 값을 본다.
   */
  const settledChip =
    activeTheme !== null &&
    bounds !== null &&
    (targetZoom === null || targetZoom === zoom)
      ? activeTheme
      : null;

  useEffect(() => {
    if (activeTheme === null) {
      handledChipRef.current = null;
      pendingCommitRef.current = false;
      return;
    }
    if (handledChipRef.current === activeTheme || bounds === null) return;

    handledChipRef.current = activeTheme;
    pendingCommitRef.current = true;

    // 이미 목표 줌이면 기다릴 것이 없다 — 지도가 idle을 쏘지 않아 대기가 영영 남는다
    if (targetZoom === null || targetZoom === zoom) return;
    // 규칙 문서의 억제 조건 "자식이 부모가 구독할 수 없는 외부 구독을 소유"에 해당:
    // zoomTo는 부모 상태로 데이터를 올리는 콜백이 아니라 지도 SDK(외부 시스템) 명령이고,
    // 칩 활성화는 이벤트지만 그 결과(줌 반영)는 외부에서 비동기로 도착해 effect가 정위치다
    // (PR #57 리뷰어도 오탐 동의 — 검증 리포트 기각 사유 참조).
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent
    zoomTo(targetZoom);
  }, [activeTheme, bounds, zoom, targetZoom, zoomTo]);

  useEffect(() => {
    if (activeTheme === null || bounds === null) return;

    if (!pendingCommitRef.current) return;
    // **줌 도달로 판정한다**(검증 재작업 1): 영역 변화로 판정하면 줌이 반영되기 전의
    // 사용자 이동(드래그)을 줌 결과로 오인해, 버튼을 누르기도 전에 목록이 갱신됐다.
    // 정착 신호(settledChip)와 같은 조건이지만 여기서는 **확정**의 전제로만 쓴다 —
    // 확정은 행정동을 더 요구하고, 정착은 그것을 기다리지 않는다 (재작업 3)
    if (targetZoom !== null && zoom !== targetZoom) return;
    // 행정동 판별(역지오코딩 디바운스)이 끝날 때까지 기다린다 (codex 리뷰) — 여기서
    // 포기하면 칩이 이전 확정 영역을 계속 조회한 채로 남는다. 중심이 행정동 밖(바다)이면
    // 이 대기가 길어질 수 있으나, 위에서 정착 신호를 먼저 보냈으므로 이동은 막지 않는다
    if (region === null) return;

    // 활성화당 한 번만 확정하고, 이후 이동·줌에는 반응하지 않는다 (AC 11)
    pendingCommitRef.current = false;
    commit(region, bounds);
    // activeTheme도 의존한다: 칩을 켜는 렌더에서는 영역·줌·행정동이 그대로라, 이것이
    // 없으면 확정이 다음 지도 변화까지 밀린다(= 사용자의 첫 이동이 확정이 된다)
  }, [activeTheme, bounds, zoom, targetZoom, region, commit]);

  return settledChip;
};
