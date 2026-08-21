import { useEffect, useRef } from "react";
import { boundsCenter, type Bounds, type LatLng } from "@/entities/cell";
import { nearestTarget } from "./nearest-target";
import type { ThemeId } from "./theme";

/**
 * 칩 진입 시 최근접 대상 자동 선택 (MSG-451 AC 11~14).
 * 지도 SDK를 import하지 않는다 — 이동은 콜백 주입(RN 경계).
 *
 * 칩을 눌러도 목록만 바뀌고 지도는 그대로여서, 어느 카드가 지금 보고 있는 곳의 것인지
 * 매번 눈으로 찾아야 했다. 칩을 켜는 순간 **지도 중심에서 가장 가까운 대상**으로 옮겨
 * 상세를 열어 준다.
 *
 * **줌은 건드리지 않는다** (AC 14): 줌 조정은 `use-chip-entry`가 칩별로 이미 하고 있고,
 * 여기서 또 맞추면 두 훅이 같은 지도에 서로 다른 줌을 명령한다. 그래서 `zoomTo`를 아예
 * 받지 않는다.
 *
 * **확정이 끝난 뒤에 움직인다** (AC 12·13, 검증 재작업 1): 확정(`use-chip-entry`의 commit)은
 * 목록 조회 bbox를 넓히므로, 확정 전 목록은 **직전 확정 영역(더 좁은 화면)** 기준이다.
 * 그 목록으로 판정하면 (a) 비어 있을 때 활성화가 그대로 소진돼 진입이 영영 일어나지 않고,
 * (b) 확정 후 더 가까운 대상이 도착해도 엉뚱한 대상으로 가 있다. 실제로 콜드 첫 활성화에서
 * 축제 칩이 (a)로 미발동했다. 그래서 **확정 신호(`committedChip`)와 그 영역 기준 목록 도착
 * (`listSettled`)을 함께** 기다린다 — 둘 중 하나만으로는 못 막는다: 확정만 보면
 * `keepPreviousData`가 직전 영역 목록을 pending 아닌 채로 넘겨주고, 목록만 보면 확정 전
 * 이미 resolved된 좁은 목록을 그대로 쓴다.
 * 칩 진입 줌 도달은 확정의 전제 조건이므로 여기서 따로 볼 필요가 없다.
 */
interface NearestEntryTarget {
  missionId: number;
  shape: { bbox: Bounds | null };
}

interface NearestEntryInput {
  activeTheme: ThemeId | null;
  /** 확정을 마친 칩 (`use-chip-entry` 반환) — 현재 칩과 같아야 목록이 확정 영역 기준이다 */
  committedChip: ThemeId | null;
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
  /** 대상 선택 — 좌측 패널이 그 대상 상세로 바뀐다 */
  select: (missionId: number) => void;
}

export const useNearestEntry = ({
  activeTheme,
  committedChip,
  center,
  targets,
  listSettled,
  moveTo,
  select,
}: NearestEntryInput): void => {
  /** 이 칩 활성화를 이미 처리했는지 — 칩이 바뀌면 다시 처리한다 */
  const handledChipRef = useRef<ThemeId | null>(null);

  useEffect(() => {
    if (activeTheme === null) {
      handledChipRef.current = null;
      return;
    }
    if (handledChipRef.current === activeTheme) return;
    // 이 활성화의 확정이 끝나야 목록이 확정 영역 기준이 된다 (AC 13 회귀)
    if (committedChip !== activeTheme) return;
    if (!listSettled || center === null) return;

    // 여기서부터는 이 활성화를 소진한다 — 대상이 없어도 매 렌더 재시도하지 않는다
    handledChipRef.current = activeTheme;

    const nearest = nearestTarget(targets, center);
    // 대상이 없으면 이동도 선택도 하지 않는다 (AC 10)
    if (nearest === null || nearest.shape.bbox === null) return;

    // 규칙 문서의 억제 조건에 해당(use-chip-entry 선례): moveTo·select는 부모로 데이터를
    // 올리는 콜백이 아니라 지도 SDK 명령과 선택 스토어 갱신이고, 칩 활성화의 결과가
    // 비동기(목록 도착·줌 반영)로 도착해 effect가 정위치다
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent
    moveTo(boundsCenter(nearest.shape.bbox));
    select(nearest.missionId);
  }, [
    activeTheme,
    committedChip,
    center,
    targets,
    listSettled,
    moveTo,
    select,
  ]);
};
