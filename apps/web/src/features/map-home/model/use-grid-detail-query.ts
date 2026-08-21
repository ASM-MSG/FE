import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCellOptions,
  getStatByGridOptions,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { deriveHomeCellDetail, type HomeCellDetail } from "./home-cell-detail";
import { entityQueryPolicy } from "./map-query-policy";
import type { ThemeId } from "./theme";

/**
 * 격자 탭 상세 조회 (MSG-325 기준 8·13 → MSG-326 추정 1) — 색칠 상태·행정동 조합.
 * 지도 SDK를 import하지 않는다(RN 경계).
 * MSG-326: 대표 영상(getGridCover) 조회를 영상 목록(use-grid-videos-query)으로 대체해
 * 제거했다 — 복원 판단 시 home-cell-detail.ts 상단 주석 참조.
 *
 * 명세는 `by-grid`가 무귀속일 때 `200 + data: null`을 준다고 규정하는데
 * OpenAPI 스키마에는 nullable 표기가 없어 생성 타입이 non-null이다 — 런타임 null을
 * `?? null`로 흡수한다(MSG-325 빌드 리포트 스펙 이슈 1).
 */
/** 상세 조회 결과 — 로딩과 실패를 구분해 화면이 실패를 로딩으로 위장하지 않게 한다 */
export interface GridDetailResult {
  detail: HomeCellDetail | null;
  /** 격자 조회 자체가 실패함 — 행정동 실패는 여기 포함되지 않는다(선택 정보) */
  isError: boolean;
  /** 실패 후 재시도 — 두 쿼리를 함께 다시 부른다 */
  retry: () => void;
}

/**
 * 선택 정보(stat) 일괄 대기 유예 상한 — 정상 응답(수백 ms)은 전부 한 번에 그려지고,
 * 병리적 지연만 격자 정보 단독 렌더(빈 분기)로 강등된다. 상한이 없으면 선택 정보 하나가
 * 매달릴 때 상세 전체가 로딩에 인질로 잡힌다 (MSG-325 "실패를 로딩으로 위장 금지" 계열).
 */
const OPTIONAL_SETTLE_GRACE_MS = 3000;

export const useGridDetailQuery = (
  gridId: string | null,
  activeTheme: ThemeId | null,
): GridDetailResult => {
  const enabled = gridId !== null;
  const path = { gridId: gridId ?? "" };

  // 유예 타이머 — 격자 선택마다 리셋. 경과하면 선택 정보를 기다리지 않는다.
  // 리셋은 렌더 중 이전 값 비교로 한다 (effect 동기 setState 금지 — use-video-duration 선례)
  const [graceOver, setGraceOver] = useState(false);
  const [prevGridId, setPrevGridId] = useState(gridId);
  if (gridId !== prevGridId) {
    setPrevGridId(gridId);
    setGraceOver(false);
  }
  useEffect(() => {
    if (gridId === null) return;
    const timer = setTimeout(
      () => setGraceOver(true),
      OPTIONAL_SETTLE_GRACE_MS,
    );
    return () => clearTimeout(timer);
  }, [gridId]);

  const cell = useQuery({
    ...getCellOptions({ path }),
    select: unwrapEnvelope,
    enabled,
    ...entityQueryPolicy,
  });
  const stat = useQuery({
    ...getStatByGridOptions({ query: { gridId: gridId ?? "" } }),
    select: unwrapEnvelope,
    enabled,
    ...entityQueryPolicy,
  });

  const retry = () => {
    void cell.refetch();
    void stat.refetch();
  };

  // 격자 조회만 필수다 — 행정동은 없어도 상세가 성립한다(빈 분기)
  if (!cell.data) return { detail: null, isError: cell.isError, retry };

  // 일괄 렌더 게이트 (MSG-329) — 선택 정보(stat)도 정착(성공/실패)할 때까지 로딩을 유지한다.
  // 두 쿼리는 병렬이라 총 소요는 그대로인데, 부분 렌더는 작은 카드에서 레이아웃이
  // 연쇄로 밀리는 점진 등장만 만든다 — 마지막 응답 시점에 한 번에 그린다 (실패는 빈 분기).
  // 단 유예(OPTIONAL_SETTLE_GRACE_MS)까지만 — 경과하면 격자 정보만으로 그린다.
  // cover는 MSG-326에서 영상 목록으로 대체·제거돼 게이트 대상이 아니다 (목록은 독립 분기)
  if (stat.isPending && !graceOver) {
    return { detail: null, isError: false, retry };
  }

  return {
    detail: deriveHomeCellDetail({
      cell: cell.data,
      regionName: stat.data?.regionName ?? null,
      activeTheme,
    }),
    isError: false,
    retry,
  };
};
