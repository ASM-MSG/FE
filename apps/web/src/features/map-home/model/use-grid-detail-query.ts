import { useQuery } from "@tanstack/react-query";
import {
  getCellOptions,
  getGridCoverOptions,
  getStatByGridOptions,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { unwrapEnvelope } from "@/shared/api/envelope";
import { deriveHomeCellDetail, type HomeCellDetail } from "./home-cell-detail";
import { entityQueryPolicy } from "./map-query-policy";
import type { ThemeId } from "./theme";

/**
 * 격자 탭 상세 조회 (MSG-325 기준 8·13) — 색칠 상태·전역 대표 영상·행정동 3종 조합.
 * 지도 SDK를 import하지 않는다(RN 경계).
 *
 * 명세는 `/cover`·`by-grid`가 후보 없음·무귀속일 때 `200 + data: null`을 준다고 규정하는데
 * OpenAPI 스키마에는 nullable 표기가 없어 생성 타입이 non-null이다 — 런타임 null을
 * `?? null`로 흡수한다(빌드 리포트 스펙 이슈 1).
 */
/** 상세 조회 결과 — 로딩과 실패를 구분해 화면이 실패를 로딩으로 위장하지 않게 한다 */
export interface GridDetailResult {
  detail: HomeCellDetail | null;
  /** 격자 조회 자체가 실패함 — 대표 영상·행정동 실패는 여기 포함되지 않는다(선택 정보) */
  isError: boolean;
  /** 실패 후 재시도 — 세 쿼리를 함께 다시 부른다 */
  retry: () => void;
}

export const useGridDetailQuery = (
  gridId: string | null,
  activeTheme: ThemeId | null,
): GridDetailResult => {
  const enabled = gridId !== null;
  const path = { gridId: gridId ?? "" };

  const cell = useQuery({
    ...getCellOptions({ path }),
    select: unwrapEnvelope,
    enabled,
    ...entityQueryPolicy,
  });
  const cover = useQuery({
    ...getGridCoverOptions({ path }),
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
    void cover.refetch();
    void stat.refetch();
  };

  // 격자 조회만 필수다 — 대표 영상·행정동은 없어도 상세가 성립한다(각자 빈 분기)
  if (!cell.data) return { detail: null, isError: cell.isError, retry };

  return {
    detail: deriveHomeCellDetail({
      cell: cell.data,
      cover: cover.data ?? null,
      regionName: stat.data?.regionName ?? null,
      activeTheme,
    }),
    isError: false,
    retry,
  };
};
