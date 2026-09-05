import { useEffect, useRef } from "react";
import { useEventCapsuleStore } from "@/features/event/model/event-capsule-store";
import { useHomeCellDetailStore } from "@/features/map-home/model/home-cell-detail-store";
import { useThemeFilterStore } from "@/features/map-home/model/theme-filter-store";

/**
 * 홈 진입/이탈 선택 수명주기 (MSG-252 AC 14 + MSG-329 후속 셸 선점 진입 보존).
 *
 * - 이탈(언마운트) 시 칩·셀 상세를 초기화한다 — 복귀 화면이 기본 상태 (AC 14)
 * - 셸 선점 진입 보존: 다른 탭에서 점령 격자를 클릭하면 셸이 select 후 홈으로 전환하는데,
 *   StrictMode 이중 마운트가 위 초기화 클린업을 마운트 시점에 1회 실행해 그 선택을 지운다.
 *   마운트 직전 선택을 렌더 1회 캡처해 다시 적용한다 — 초기화 의미(빈 복귀 화면)는
 *   유지된다: 셸 진입이 아니면 캡처 값이 null이라 무동작.
 *
 * 이 상호작용(마운트→클린업→재마운트)은 use-home-entry-lifecycle.test.tsx가
 * <StrictMode> 렌더로 재현·고정한다 — resetThemeFilter/select 동작이 바뀌면 깨진다.
 */
export const useHomeEntryLifecycle = (): void => {
  const selectCell = useHomeCellDetailStore((s) => s.select);
  const resetThemeFilter = useThemeFilterStore((s) => s.reset);

  // 홈 이탈(다른 섹션 라우트로 언마운트) 시 칩·셀 상세 초기화 (AC 14).
  // 접힘은 셸이 display:none으로 숨겨 언마운트되지 않으므로 상태가 유지된다 (A6 정합)
  useEffect(() => resetThemeFilter, [resetThemeFilter]);

  // 행사 캡슐은 접되 행사방·선택 위치는 유지한다 (MSG-518 AC 11 — 섹션 이동 후 복귀
  // 시 세션 유지, 사용자 승인). MSG-516의 "복귀 화면은 접힌 캡슐 + 기본 패널" 결정 중
  // 행사방 리셋 부분을 번복 — 섹션 이탈은 사용자 명시 닫기(✕·뒤로가기)가 아닌 비명시
  // 문맥 전환이라 collapseOnly가 맞다(시 경계 전환과 같은 부류, DECISIONS 2026-08-31)
  const collapseEventCapsule = useEventCapsuleStore((s) => s.collapseOnly);
  useEffect(() => collapseEventCapsule, [collapseEventCapsule]);

  const shellSelectionRef = useRef(
    useHomeCellDetailStore.getState().selectedCellId,
  );
  useEffect(() => {
    const preserved = shellSelectionRef.current;
    if (preserved !== null) selectCell(preserved);
  }, [selectCell]);
};
