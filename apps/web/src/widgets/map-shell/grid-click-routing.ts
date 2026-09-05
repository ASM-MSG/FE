/**
 * 지도 셀 클릭 라우팅 (셸 상시 층) — 순수 함수, 지도 SDK·스토어 미참조(RN 재사용 대상).
 *
 * 점령 격자 클릭은 **어느 탭에서든, 어떤 선택 상태에서든 격자 상세가 우선**한다:
 * - 홈에서 테마 셀 상세가 열려 있어도 점령 격자를 누르면 그 격자 상세로 교체된다
 * - 탐색·도감·프로필 탭에서도 점령 격자를 누르면 홈으로 전환해 격자 상세를 보여준다
 * 점령이 아닌 셀은 기존 섹션 핸들러(홈 테마 오버레이·도감 게시 셀)에 위임한다 —
 * 게시자가 없으면(탐색·프로필) 표시 전용 기존 동작 그대로다.
 *
 * **칩 한정 예외 (MSG-462 AC 12)**: 축제·팝업 칩 활성 중에는 점령 여부와 무관하게 섹션
 * 핸들러(미션 라우팅)에 위임한다 — 미션 영역 안의 점령(빗금) 격자를 눌러도 그 행사의
 * 상세가 열려야 하기 때문. 칩 활성 중에는 점령 층 자체가 비워져(occupancy-visibility)
 * 지도에 남는 클릭 대상이 칩의 게시 셀뿐이라, 예외를 칩 활성 여부로만 걸어도
 * 점령 우선 규칙 본체는 보존된다 (AC 11).
 */
export const buildCellClickHandler =
  (deps: {
    occupiedIds: string[];
    /** 격자 상세 열기 — 선택 교체(미니 패널 닫힘 체인 포함)·패널 펼침·홈 전환을 묶는다 */
    openGridDetail: (cellId: string) => void;
    /** 섹션 게시 핸들러 (map-overlay-store) — null이면 표시 전용 */
    sectionHandler: ((cellId: string) => void) | null;
    /** 축제·팝업 칩 활성 — 점령 우선 라우팅의 칩 한정 예외 (MSG-462 AC 12) */
    missionChipActive?: boolean;
    /**
     * 행사방 열림 중 행사 위치 격자 (MSG-517 AC 7·8) — 소속 격자는 점령 여부와 무관하게
     * 섹션 핸들러(위치 강조)로 위임한다 (missionChipActive 예외와 동형). 소속이 아닌
     * 격자는 기존 경로 그대로 — 점령이면 격자 상세가 행사방 위를 덮는다 (panel-branch).
     */
    eventGridIds?: ReadonlySet<string>;
  }) =>
  (cellId: string): void => {
    const eventGrid = deps.eventGridIds?.has(cellId) ?? false;
    if (
      !deps.missionChipActive &&
      !eventGrid &&
      deps.occupiedIds.includes(cellId)
    ) {
      deps.openGridDetail(cellId);
      return;
    }
    deps.sectionHandler?.(cellId);
  };
