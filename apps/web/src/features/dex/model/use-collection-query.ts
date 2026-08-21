import { useQuery } from "@tanstack/react-query";
import type {
  CollectedGrid,
  DexBadge,
  DexSummary,
  UploadHistoryDay,
} from "@/entities/dex";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { unwrapEnvelope } from "@/shared/api/envelope";
// 생성 옵션은 barrel 미재수출 — 직접 경로 import (MSG-323 관례)
import {
  findMyBadgesOptions,
  getCollectionGridsOptions,
  getSummaryOptions,
  getUploadHistoryOptions,
} from "@/shared/api/generated/@tanstack/react-query.gen";

/**
 * 개인 도감 조회 훅 3종 (MSG-327 기준 3·5·17) — 구 mock 소스(use-dex-query)를 대체한다.
 * 셋을 한 파일에 두는 이유: 셋 다 무파라미터 전체 조회라 시그니처·정책이 동일하고,
 * 도감 진입 시 함께 발사돼 로딩·오류 게이트를 공유한다(DexPanel이 합친다).
 * 지도 SDK를 import하지 않는다(RN 경계). 인증 게이트는 라우트(RequireAuth)가 담당한다.
 */

/** 도감 요약 — `GET /api/collections/summary` */
export const useCollectionSummaryQuery = () =>
  useQuery({
    ...getSummaryOptions(),
    select: (envelope): DexSummary => unwrapEnvelope(envelope),
    ...entityQueryPolicy,
  });

/** 수집 격자 목록 — `GET /api/collections/grids` (동 묶음 원재료) */
export const useCollectionGridsQuery = () =>
  useQuery({
    ...getCollectionGridsOptions(),
    select: (envelope): CollectedGrid[] => unwrapEnvelope(envelope),
    ...entityQueryPolicy,
  });

/** 뱃지 카탈로그 — `GET /api/badges` (획득+미획득 전체) */
export const useBadgesQuery = () =>
  useQuery({
    ...findMyBadgesOptions(),
    select: (envelope): DexBadge[] => unwrapEnvelope(envelope),
    ...entityQueryPolicy,
  });

/**
 * 날짜별 업로드 이력 — `GET /api/collections/upload-history` (MSG-414 AC 3).
 * 파라미터 없음(기간 지정 불가) — 전체 이력 일괄 응답, 창(24주/53주) 필터는
 * upload-grass 파생 몫. 이 API의 첫 사용처다(기존 스트릭 카드는 summary.currentStreak).
 */
export const useUploadHistoryQuery = () =>
  useQuery({
    ...getUploadHistoryOptions(),
    select: (envelope): UploadHistoryDay[] => unwrapEnvelope(envelope),
    ...entityQueryPolicy,
  });
