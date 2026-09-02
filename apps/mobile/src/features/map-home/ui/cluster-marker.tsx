import { Text, View } from "react-native";
import { semantic, spacing, typography } from "@fillmap/design-tokens";
import {
  BUBBLE_PADDING_BOTTOM,
  BUBBLE_PADDING_TOP,
  clusterBubbleSize,
} from "../model/cluster-bubble-size";
import { formatClusterCount } from "../model/cluster-format";
import type { RegionClusterMarker } from "../model/region-cluster-overlay";

/**
 * SOURCE: 웹 `apps/web/src/pages/map-home/ui/MapCanvas.tsx` `clusterMarkerContent` (MSG-475).
 * 저줌 지역 집계 마커의 말풍선 뷰 (MSG-558 S1~S3) — 위 지역명 / 아래 점령 격자 수.
 * 라운드 10 · 패딩 6/12/7 · 링 없음 · 그림자 · 크기 단일(지명 길이 hug, 단위별 3단 폐기).
 * 겹침 병합 임계 `MARKER_MERGE_PX`(68/80/92)는 렌더와 분리돼 값 불변이다.
 *
 * **화면 로컬 컴포넌트다.** 지도 마커라는 도메인 형태가 강하고 사용처가 지도 홈 하나뿐이라
 * `packages/ui-native`로 승격하지 않는다(승격은 두 번째 사용처가 생길 때 — 빌드 리포트
 * "승격 필요" 항목). 렌더 자체는 `grid-map.tsx`의 `NaverMapMarkerOverlay` 안에서만 쓴다.
 *
 * 스타일을 className이 아니라 `style`로 주는 이유는 grid-map의 경로 번호 마커(MSG-298)와
 * 같다 — 네이티브 마커 서브뷰라 토큰 값을 직접 주입하는 쪽이 확실하다. 색은 전부
 * `@fillmap/design-tokens` 시맨틱 토큰이고 임의 hex는 없다.
 */

/** 웹 `rounded-[10px]` — radius 토큰 sm 8 / md 12 사이라 웹도 임의값 예외 */
const BUBBLE_RADIUS = 10;

/**
 * `shadow.raised` 토큰(`0 2px 10px rgba(25,31,40,0.12)`)의 RN 분해 — RN style은 CSS
 * 그림자 문자열을 받지 못한다. Android는 elevation만 반영한다.
 */
const RAISED_SHADOW = {
  shadowColor: semantic.textPrimary,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 10,
  elevation: 3,
} as const;

interface ClusterMarkerProps {
  marker: RegionClusterMarker;
}

export const ClusterMarker = ({ marker }: ClusterMarkerProps) => {
  const { box } = clusterBubbleSize(marker);
  return (
    /* 바깥 박스 = 마커 뷰 크기(그림자 여백 포함, 투명). Android 서브뷰 평탄화 방지
       collapsable={false} (MSG-298 경로 마커 선례). key는 라이브러리 계약 — 생김새 의존성을
       최상위 자식 key로 넘겨야 같은 지역 재조회 시 개수가 갱신된다 (MSG-558 Q6·S9) */
    <View
      key={`${marker.name}/${marker.count}`}
      collapsable={false}
      accessibilityLabel={
        marker.name !== null
          ? `${marker.name} 점령 격자 ${marker.count}개`
          : `점령 격자 ${marker.count}개`
      }
      style={{
        width: box.width,
        height: box.height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        collapsable={false}
        style={{
          alignSelf: "center",
          alignItems: "center",
          borderRadius: BUBBLE_RADIUS,
          paddingHorizontal: spacing.sm,
          paddingTop: BUBBLE_PADDING_TOP,
          paddingBottom: BUBBLE_PADDING_BOTTOM,
          backgroundColor: semantic.secondary,
          ...RAISED_SHADOW,
        }}
      >
        {/* 병합 마커·미판정 버킷은 이름이 없다 — 개수만 표시. 웹 `text-fm-label text-primary-foreground/85` */}
        {marker.name !== null && (
          <Text
            numberOfLines={1}
            style={{
              color: semantic.onPrimary,
              opacity: 0.85,
              fontSize: typography.label.fontSize,
              lineHeight: typography.label.lineHeight,
              fontWeight: "500",
            }}
          >
            {marker.name}
          </Text>
        )}
        {/* 웹 `text-fm-heading font-bold text-primary-foreground` */}
        <Text
          numberOfLines={1}
          style={{
            color: semantic.onPrimary,
            fontSize: typography.heading.fontSize,
            lineHeight: typography.heading.lineHeight,
            fontWeight: "700",
          }}
        >
          {formatClusterCount(marker.count)}
        </Text>
      </View>
    </View>
  );
};
