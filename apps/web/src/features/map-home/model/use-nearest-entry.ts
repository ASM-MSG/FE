import { useEffect, useRef } from "react";
import { boundsCenter, type Bounds, type LatLng } from "@/entities/cell";
import { nearestTarget } from "./nearest-target";
import type { ThemeId } from "./theme";

/**
 * 칩 진입 시 최근접 대상으로 지도 이동 (MSG-451 AC 11~14).
 * 지도 SDK를 import하지 않는다 — 이동은 콜백 주입(RN 경계).
 *
 * 칩을 눌러도 목록만 바뀌고 지도는 그대로여서, 어느 카드가 지금 보고 있는 곳의 것인지
 * 매번 눈으로 찾아야 했다. 칩을 켜는 순간 **지도 중심에서 가장 가까운 대상**으로 옮겨 준다.
 *
 * **옮기기만 하고 고르지는 않는다** (AC 13 개정, 사용자 환류): 초안은 최근접 대상의 상세까지
 * 열었는데, 칩을 눌렀을 뿐인데 특정 행사가 선택된 채로 화면이 바뀌어 사용자가 고른 것처럼
 * 보였다. 칩의 목적은 "이 근처에 뭐가 있나"를 보여주는 것이고 어느 것을 볼지는 사용자
 * 몫이다 — 그래서 선택 콜백을 아예 받지 않는다(줌 명령을 받지 않는 것과 같은 이유).
 *
 * **줌은 건드리지 않는다** (AC 14): 줌 조정은 `use-chip-entry`가 칩별로 이미 하고 있고,
 * 여기서 또 맞추면 두 훅이 같은 지도에 서로 다른 줌을 명령한다. 그래서 `zoomTo`를 아예
 * 받지 않는다.
 *
 * **진입이 정착한 뒤에 움직인다** (AC 12·13, 검증 재작업 1·3): 칩 진입은 줌을 바꾸고 그 화면을
 * 확정(commit)하는데, 확정은 목록 조회 bbox를 넓힌다. 정착 전 목록은 **직전 확정 영역(더 좁은
 * 화면)** 기준이라, 그것으로 판정하면 (a) 비어 있을 때 활성화가 그대로 소진돼 진입이 영영
 * 일어나지 않고, (b) 나중에 더 가까운 대상이 도착해도 엉뚱한 대상으로 가 있다. 실제로 콜드 첫
 * 활성화에서 축제 칩이 (a)로 미발동했다. 그래서 **정착 신호(`settledChip`)와 그 화면 기준 목록
 * 도착(`listSettled`)을 함께** 기다린다 — 둘 중 하나만으로는 못 막는다: 정착만 보면
 * `keepPreviousData`가 직전 영역 목록을 pending 아닌 채로 넘겨주고, 목록만 보면 정착 전
 * 이미 resolved된 좁은 목록을 그대로 쓴다.
 */
interface NearestEntryTarget {
  shape: { bbox: Bounds | null };
}

interface NearestEntryInput {
  activeTheme: ThemeId | null;
  /** 진입이 정착한 칩 (`use-chip-entry` 반환) — 현재 칩과 같아야 이동해도 되는 시점이다 */
  settledChip: ThemeId | null;
  /** 현재 지도 중심 — 최근접 판정의 기준점 (스펙 결정: 내 위치가 아니라 지도 중심) */
  center: LatLng | null;
  /** 현재 칩의 대상 목록 — 미션(축제·팝업) 또는 코스 */
  targets: readonly NearestEntryTarget[];
  /**
   * 이 확정 영역 기준 목록이 도착했는지 (`!isPending && !isPlaceholder`).
   * 단순 `!isPending`으로는 부족하다 — `keepPreviousData` 정책 때문에 확정으로 bbox가
   * 바뀌어도 직전 영역의 목록이 pending 아닌 채로 한 박자 남는다 (검증 재작업 1).
   */
  listSettled: boolean;
  /** 이동 명령 — 지도 SDK는 호출부(셸)가 감싼다 */
  moveTo: (coords: LatLng) => void;
}

export const useNearestEntry = ({
  activeTheme,
  settledChip,
  center,
  targets,
  listSettled,
  moveTo,
}: NearestEntryInput): void => {
  /** 이 칩 활성화를 이미 처리했는지 — 칩이 바뀌면 다시 처리한다 */
  const handledChipRef = useRef<ThemeId | null>(null);

  useEffect(() => {
    if (activeTheme === null) {
      handledChipRef.current = null;
      return;
    }
    if (handledChipRef.current === activeTheme) return;
    // 이 활성화의 진입이 정착(목표 줌 도달)해야 움직인다 (AC 12·13)
    if (settledChip !== activeTheme) return;
    if (!listSettled || center === null) return;

    const nearest = nearestTarget(targets, center);
    // 대상이 없으면 이동하지 않고 **활성화도 소진하지 않는다** (AC 10 + codex P1).
    // 소진해 버리면 나중에 대상이 도착해도 영영 못 움직인다 — 정착 신호만으로는 목록이
    // 이 화면 기준이라는 보장이 없기 때문이다: 중심이 행정동 밖이면 확정(commit)이
    // 미뤄지는데 정착은 줌 도달로 먼저 발행되므로, 그 사이 목록은 직전 확정 영역의 것이다.
    // 실제로 움직였을 때만 소진하면 그 구간에서 빈 목록을 만나도 뒤에 도착한 목록으로 간다.
    if (nearest === null || nearest.shape.bbox === null) return;

    // 여기서부터는 이 활성화를 소진한다 — 이후 이동·줌에는 반응하지 않는다 (AC 11)
    handledChipRef.current = activeTheme;

    // 규칙 문서의 억제 조건에 해당(use-chip-entry 선례): moveTo는 부모로 데이터를 올리는
    // 콜백이 아니라 지도 SDK 명령이고, 칩 활성화의 결과가 비동기(목록 도착·확정)로
    // 도착해 effect가 정위치다
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent
    moveTo(boundsCenter(nearest.shape.bbox));
  }, [activeTheme, settledChip, center, targets, listSettled, moveTo]);
};
