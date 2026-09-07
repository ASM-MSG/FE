import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { semantic } from "@fillmap/design-tokens";
import type { LatLng } from "../../../entities/cell/model/grid";
import type {
  PlaceSearchResponseDto,
  TrendingKeywordResponseDto,
} from "../../../shared/api/sdk";
import { SheetNotice } from "../../map-home/ui/sheet-notice";
import type { GridSearchResult } from "../model/zone-search";

/**
 * 검색 화면 결과 섹션 3종 (MSG-578 D8·D9) — 웹 `HomeSearchBox` 내부 TrendingList·
 * GridResultList·PlaceResultList 대응. 전부 props만 받는 표시 컴포넌트로 쿼리를 부르지
 * 않는다. 행 스타일은 기존 전체 지역·최근 검색 행 준용(전용 Figma 없음 — 티켓 [제외]),
 * 문구는 웹 그대로. 실패 안내는 `SheetNotice`(웹 `RetryNotice` 대응, map-home 교차 import).
 */
const SectionTitle = ({ children }: { children: string }) => (
  <Text className="text-fm-body-strong text-foreground-muted">{children}</Text>
);

const StatusText = ({ children }: { children: string }) => (
  <Text className="py-sm text-fm-body text-foreground-muted">{children}</Text>
);

interface TrendingListProps {
  keywords: TrendingKeywordResponseDto[] | undefined;
  isError: boolean;
  onSelect: (keyword: string) => void;
}

/** 인기 검색어 TOP 10 — 탭 시 그 키워드로 즉시 장소 검색 (S1·S2). 실패는 문구만(웹과 같이 재시도 없음) */
export const TrendingList = ({
  keywords,
  isError,
  onSelect,
}: TrendingListProps) => (
  <View className="px-5 pt-md">
    <SectionTitle>인기 검색어</SectionTitle>
    {isError ? (
      <StatusText>인기 검색어를 불러오지 못했어요</StatusText>
    ) : keywords === undefined ? (
      <StatusText>불러오는 중이에요…</StatusText>
    ) : keywords.length === 0 ? (
      <StatusText>아직 인기 검색어가 없어요</StatusText>
    ) : (
      keywords.map((item) => (
        <Pressable
          key={item.rank}
          accessibilityRole="button"
          onPress={() => onSelect(item.keyword)}
          className="flex-row items-center gap-sm py-sm active:opacity-60"
        >
          <Text className="w-5 text-fm-title font-semibold text-primary">
            {item.rank}
          </Text>
          <Text
            numberOfLines={1}
            className="flex-1 text-fm-title font-normal text-foreground"
          >
            {item.keyword}
          </Text>
        </Pressable>
      ))
    )}
  </View>
);

interface GridResultListProps {
  results: GridSearchResult[];
  onSelect: (result: GridSearchResult) => void;
}

/** 격자/구역 매치 섹션 (S6) — 장소 결과 위. 매치 없으면 부모가 렌더하지 않는다 */
export const GridResultList = ({ results, onSelect }: GridResultListProps) => (
  <View className="px-5 pt-md">
    <SectionTitle>격자</SectionTitle>
    {results.map((result) => (
      <Pressable
        key={`${result.kind}-${result.zoneKey}`}
        accessibilityRole="button"
        onPress={() => onSelect(result)}
        className="py-3.5 active:opacity-60"
      >
        <Text
          numberOfLines={1}
          className="text-fm-title font-medium text-foreground"
        >
          {result.label}
        </Text>
      </Pressable>
    ))}
  </View>
);

interface PlaceResultListProps {
  places: PlaceSearchResponseDto[] | undefined;
  isError: boolean;
  onRetry: () => void;
  onSelect: (center: LatLng) => void;
}

/** 장소 검색 결과 — 로딩·빈 결과·실패 3상태 (S3·S5). 행은 장소명 + 주소 2줄 */
export const PlaceResultList = ({
  places,
  isError,
  onRetry,
  onSelect,
}: PlaceResultListProps) => (
  <View className="px-5 pt-md">
    {isError ? (
      <SheetNotice
        message="검색에 실패했어요. 잠시 후 다시 시도해 주세요."
        onRetry={onRetry}
      />
    ) : places === undefined ? (
      <View className="py-sm">
        <ActivityIndicator color={semantic.primary} />
      </View>
    ) : places.length === 0 ? (
      <StatusText>검색 결과가 없어요</StatusText>
    ) : (
      places.map((place, index) => (
        <Pressable
          key={`${place.gridId}-${place.name}`}
          accessibilityRole="button"
          accessibilityLabel={`${place.name}, ${place.address}`}
          onPress={() => onSelect({ lat: place.lat, lng: place.lng })}
          className={
            index < places.length - 1
              ? "gap-xxs border-b border-border py-3.5 active:opacity-60"
              : "gap-xxs py-3.5 active:opacity-60"
          }
        >
          <Text
            numberOfLines={1}
            className="text-fm-title font-medium text-foreground"
          >
            {place.name}
          </Text>
          <Text
            numberOfLines={1}
            className="text-fm-body text-foreground-muted"
          >
            {place.address}
          </Text>
        </Pressable>
      ))
    )}
  </View>
);
