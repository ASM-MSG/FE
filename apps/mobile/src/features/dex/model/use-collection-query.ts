import { useQuery } from "@tanstack/react-query";
import type {
  CollectedGrid,
  DexBadge,
  DexSummary,
  UploadHistoryDay,
} from "../../../entities/dex/model/dex";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  findMyBadgesOptions,
  getCollectionGridsOptions,
  getSummaryOptions,
  getUploadHistoryOptions,
} from "../../../shared/api/query-options";

/**
 * 개인 도감 조회 훅 4종 (MSG-425 S2·S4 · MSG-430 S1·S8) — 웹
 * `features/dex/model/use-collection-query.ts` 미러. 넷 다 무파라미터 전체 조회라
 * 시그니처가 같다. 요약·격자 둘은 도감 진입 시 함께 발사돼 셸의 골격 게이트를 공유하고
 * (DexScreen이 합친다), 뱃지·업로드 이력은 각자의 탭 본문이 자기 게이트를 건다 —
 * 한쪽 실패가 다른 탭이나 상단 요약을 막지 않는다 (S12).
 *
 * staleTime은 `QueryProvider` 전역 기본(30초)을 그대로 쓴다 — 웹 `entityQueryPolicy`(5초)는
 * 지도 뷰포트 이동 빈도에 맞춘 값이고, 도감은 진입·탭 전환 단위라 30초로 충분하다(추정 A3).
 * 인증 게이트는 `_layout`(MSG-422)이 담당한다. RN 경계: 지도 SDK·라우터를 import하지 않는다.
 */

/** 도감 요약 — `GET /api/collections/summary` (통계 타일 3개) */
export const useCollectionSummaryQuery = () =>
  useQuery({
    ...getSummaryOptions(),
    select: (envelope): DexSummary => unwrapEnvelope(envelope),
  });

/** 수집 격자 목록 — `GET /api/collections/grids` (동 묶음 원재료) */
export const useCollectionGridsQuery = () =>
  useQuery({
    ...getCollectionGridsOptions(),
    select: (envelope): CollectedGrid[] => unwrapEnvelope(envelope),
  });

/**
 * 뱃지 카탈로그 — `GET /api/badges` (획득+미획득 전체, S1).
 * 뱃지 탭 본문에서만 쓰이므로 탭 진입 시 발사된다.
 */
export const useBadgesQuery = () =>
  useQuery({
    ...findMyBadgesOptions(),
    select: (envelope): DexBadge[] => unwrapEnvelope(envelope),
  });

/**
 * 날짜별 업로드 이력 — `GET /api/collections/upload-history` (S8).
 * 파라미터 없음(기간 지정 불가) — 전체 이력 일괄 응답이고, 창(24주/53주) 필터는
 * `upload-grass` 파생 몫이다. 기록 탭과 1년 화면이 같은 캐시를 공유한다.
 */
export const useUploadHistoryQuery = () =>
  useQuery({
    ...getUploadHistoryOptions(),
    select: (envelope): UploadHistoryDay[] => unwrapEnvelope(envelope),
  });
