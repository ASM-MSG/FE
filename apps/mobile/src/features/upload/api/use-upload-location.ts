import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveMapCenter, type GeoCoords } from "../../../shared/geolocation";
import { formatUploadLocationLabel } from "../model/location-label";
import { uploadLocationQueryOptions } from "./upload-location-query";

/**
 * 업로드 위치 (기준 20·26, D8) — 좌표는 `resolveMapCenter()`(현재 위치, 실패 시 서면 폴백),
 * 라벨은 `GET /api/regions/reverse-geocode`의 regionName.
 *
 * 웹은 지도 뷰포트 중심을 쓰지만 모바일에는 뷰포트 스토어가 없어(MSG-423이 도입 중이나
 * 이 티켓은 의존하지 않는다) 현재 위치를 정본으로 삼는다 — 티켓 문구
 * "지금 위치의 격자에 순간을 기록하세요"에 부합한다. 확정 body의 lat/lng도 이 좌표다.
 *
 * 조회 옵션 자체는 `upload-location-query.ts`가 소유한다 — 이 파일은 expo-location을
 * 끌고 와 vitest에서 import할 수 없으므로, 요청 계약은 그쪽에서 테스트한다.
 */
export const useUploadLocation = () => {
  const [center, setCenter] = useState<GeoCoords | null>(null);

  useEffect(() => {
    let alive = true;
    // resolveMapCenter는 총함수(절대 reject하지 않음)라 실패 분기가 없다
    void resolveMapCenter().then((coords) => {
      if (alive) setCenter(coords);
    });
    return () => {
      alive = false;
    };
  }, []);

  const query = useQuery(uploadLocationQueryOptions(center));

  return {
    /** 확정 body 좌표 — 확보 전에는 null (업로드 버튼이 대기한다) */
    center,
    label: formatUploadLocationLabel(query.data),
  };
};
