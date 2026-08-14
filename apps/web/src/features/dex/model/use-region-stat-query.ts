import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RegionStat } from "@/entities/dex";
import { entityQueryPolicy } from "@/features/map-home/model/map-query-policy";
import { gatedQueryStatus } from "@/features/region/model/gated-query-status";
import { unwrapEnvelope } from "@/shared/api/envelope";
import {
  getStatByGridOptions,
  getStatByPointOptions,
} from "@/shared/api/generated/@tanstack/react-query.gen";
import { getCurrentPosition, type GeoCoords } from "@/shared/geolocation";

/**
 * 행정동 수집률 조회 2종 (MSG-327 기준 4·11) — `GET /api/regions/stats/by-grid`·`by-point`.
 * 둘 다 같은 `RegionStatResponseDto`를 돌려주고 입력(격자 / 좌표)만 다르다.
 *
 * by-grid는 이 티켓의 핵심 조인이다 — `collections/grids` 응답에 regionCode가 없어서
 * 동 묶음에서 `collections/videos?regionCode=`를 부를 수 없는데, 대표 격자 id를 넘기면
 * 그 격자 중심 행정동의 regionCode가 돌아온다(이름 매칭 우회보다 정확 — 동명이동 무관).
 *
 * 위치 접근은 shared/geolocation 어댑터 경유 — 이 파일은 navigator를 직접 참조하지 않는다(RN 경계).
 */

export interface RegionStatResult {
  /** 행정동 통계 — 미도착이면 undefined, 행정동 밖 좌표·격자면 null (명세 data nullable) */
  data: RegionStat | null | undefined;
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/** 격자 → 그 격자 중심 행정동의 코드·수집률. gridId가 null이면 조회하지 않는다 */
export const useGridRegionStatQuery = (
  gridId: string | null,
): RegionStatResult => {
  const enabled = gridId !== null;

  const query = useQuery({
    ...getStatByGridOptions({ query: { gridId: gridId ?? "" } }),
    select: (envelope): RegionStat | null => unwrapEnvelope(envelope),
    enabled,
    ...entityQueryPolicy,
  });

  return { data: query.data, ...gatedQueryStatus(query, enabled) };
};

/**
 * 도감 진입 시 1회 측위 (구 use-current-region 승계) — 권한 거부·미지원은 어댑터가
 * 서면 좌표로 폴백하므로 결과는 항상 도착한다. 조회 전에는 null이라 by-point가 대기한다.
 */
const useCurrentCoords = (): GeoCoords | null => {
  const [coords, setCoords] = useState<GeoCoords | null>(null);

  useEffect(() => {
    let active = true;
    void getCurrentPosition().then((next) => {
      if (active) setCoords(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return coords;
};

/**
 * 현재 위치 행정동의 이름·수집률 — 진행 바 표시값. [기준 4]
 * 구 구현(역지오코딩으로 구 이름 → mock 탐험률 맵)을 대체한다: 서버가 좌표 하나로
 * 행정동 판별과 수집률 계산을 함께 해주므로 프론트 매칭 로직이 사라진다.
 */
export const useCurrentRegionStatQuery = (): RegionStatResult => {
  const coords = useCurrentCoords();
  const enabled = coords !== null;

  const query = useQuery({
    ...getStatByPointOptions({
      query: { lat: coords?.lat ?? 0, lng: coords?.lng ?? 0 },
    }),
    select: (envelope): RegionStat | null => unwrapEnvelope(envelope),
    enabled,
    ...entityQueryPolicy,
  });

  return { data: query.data, ...gatedQueryStatus(query, enabled) };
};
