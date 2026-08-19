import { useQuery } from "@tanstack/react-query";
import type {
  CollectedGrid,
  DexSummary,
} from "../../../entities/dex/model/dex";
import { unwrapEnvelope } from "../../../shared/api/envelope";
import {
  getCollectionGridsOptions,
  getSummaryOptions,
} from "../../../shared/api/query-options";

/**
 * 개인 도감 조회 훅 2종 (MSG-425 S2·S4) — 웹 `features/dex/model/use-collection-query.ts`
 * 미러. 둘 다 무파라미터 전체 조회라 시그니처가 같고 도감 진입 시 함께 발사돼
 * 로딩·오류 게이트를 공유한다(DexScreen이 합친다).
 *
 * 뱃지(`findMyBadges`)·업로드 이력(`getUploadHistory`) 훅은 이 티켓 범위 밖이다 —
 * 뱃지 탭·기록 탭 내용은 MSG-430이 소유하고, 통계 타일의 "획득 뱃지"는
 * `summary.badgeCount`로 충족된다.
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
