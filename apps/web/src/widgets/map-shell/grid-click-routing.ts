/**
 * 지도 셀 클릭 라우팅 (셸 상시 층) — 순수 함수, 지도 SDK·스토어 미참조(RN 재사용 대상).
 *
 * 점령 격자 클릭은 **어느 탭에서든, 어떤 선택 상태에서든 격자 상세가 우선**한다:
 * - 홈에서 테마 셀 상세가 열려 있어도 점령 격자를 누르면 그 격자 상세로 교체된다
 * - 탐색·도감·프로필 탭에서도 점령 격자를 누르면 홈으로 전환해 격자 상세를 보여준다
 * 점령이 아닌 셀은 기존 섹션 핸들러(홈 테마 오버레이·도감 게시 셀)에 위임한다 —
 * 게시자가 없으면(탐색·프로필) 표시 전용 기존 동작 그대로다.
 */
export const buildCellClickHandler =
  (deps: {
    occupiedIds: string[];
    /** 격자 상세 열기 — 선택 교체(미니 패널 닫힘 체인 포함)·패널 펼침·홈 전환을 묶는다 */
    openGridDetail: (cellId: string) => void;
    /** 섹션 게시 핸들러 (map-overlay-store) — null이면 표시 전용 */
    sectionHandler: ((cellId: string) => void) | null;
  }) =>
  (cellId: string): void => {
    if (deps.occupiedIds.includes(cellId)) {
      deps.openGridDetail(cellId);
      return;
    }
    deps.sectionHandler?.(cellId);
  };
