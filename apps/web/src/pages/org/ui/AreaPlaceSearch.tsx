import { useState } from "react";
import { Input, RetryNotice } from "@fillmap/ui-web";
import type { LatLng } from "@/entities/cell";
import { usePlaceSearchQuery } from "@/features/search/model/use-place-search-query";

interface AreaPlaceSearchProps {
  /** 결과 선택 — 지도 이동만 한다(영역·후보를 만들지 않는다, AC 9) */
  onMoveTo: (coords: LatLng) => void;
}

/**
 * 장소 검색 (MSG-547 AC 9 — Figma 15525:9300) — **지도 이동 전용**.
 * 홈 검색과 같은 훅(`usePlaceSearchQuery` 300ms 디바운스)을 재사용하고, 결과 선택은
 * `onMoveTo`만 호출한다. 안내 박스는 상시 표시다(시안 문구 그대로).
 *
 * 검색 API가 ORG 세션을 거절하면(익명 401 실측 이력 — ORG 허용 여부 미확인) 결과 대신
 * 재시도 안내로 강등되고, 영역 지정 흐름은 지도 확대·이동만으로 계속된다.
 */
export const AreaPlaceSearch = ({ onMoveTo }: AreaPlaceSearchProps) => {
  const [input, setInput] = useState("");
  const search = usePlaceSearchQuery(input, input.trim().length > 0);

  return (
    <div className="flex flex-col gap-xs">
      <label
        htmlFor="area-place-search"
        className="text-fm-label text-foreground-body"
      >
        장소 검색
      </label>
      <Input
        id="area-place-search"
        value={input}
        placeholder="장소명을 입력하세요"
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") search.searchNow(input);
        }}
        className="border-border"
      />

      {search.isError ? (
        <RetryNotice
          message="장소 검색을 사용할 수 없어요. 지도를 직접 확대·이동해 주세요."
          onRetry={search.retry}
        />
      ) : (
        search.places !== undefined &&
        search.places.length > 0 && (
          <ul className="flex max-h-60 flex-col overflow-y-auto rounded-sm border border-border">
            {search.places.map((place) => (
              <li key={place.gridId + place.name}>
                <button
                  type="button"
                  onClick={() => onMoveTo({ lat: place.lat, lng: place.lng })}
                  className="flex w-full flex-col gap-xxs px-md py-xs text-left transition-colors active:bg-surface-soft"
                >
                  <span className="truncate text-fm-body-strong text-foreground">
                    {place.name}
                  </span>
                  <span className="truncate text-fm-caption text-foreground-muted">
                    {place.address}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      <div className="flex flex-col gap-xxs rounded-sm bg-surface p-md">
        <p className="text-fm-body-strong text-foreground">
          검색은 지도 이동에만 사용됩니다
        </p>
        <p className="text-fm-caption text-foreground-muted">
          범위 확정은 지도 드래그로 진행해 주세요
        </p>
      </div>
    </div>
  );
};
