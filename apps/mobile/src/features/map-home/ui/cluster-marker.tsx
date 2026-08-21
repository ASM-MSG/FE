import { Text, View } from "react-native";
import { semantic, typography } from "@fillmap/design-tokens";
import { formatClusterCount } from "../model/cluster-format";
import {
  MARKER_MERGE_PX,
  type RegionClusterMarker,
} from "../model/region-cluster-overlay";

/**
 * SOURCE: Figma "클러스터 마커" (node 14599:7041 — variant 단위=동/구/시).
 * 저줌 지역 집계 마커의 원형 뷰 (MSG-428 S2·S3) — 위 지역명 / 아래 점령 격자 수.
 *
 * **화면 로컬 컴포넌트다.** 지도 마커라는 도메인 형태가 강하고 사용처가 지도 홈 하나뿐이라
 * `packages/ui-native`로 승격하지 않는다(승격은 두 번째 사용처가 생길 때 — 빌드 리포트
 * "승격 필요" 항목). 렌더 자체는 `grid-map.tsx`의 `NaverMapMarkerOverlay` 안에서만 쓴다.
 *
 * 스타일을 className이 아니라 `style`로 주는 이유는 grid-map의 경로 번호 마커(MSG-298)와
 * 같다 — 네이티브 마커 서브뷰라 토큰 값을 직접 주입하는 쪽이 확실하다. 색은 전부
 * `@fillmap/design-tokens` 시맨틱 토큰이고 임의 hex는 없다.
 */

/**
 * 마커 지름(px) = 병합 임계와 같은 표 — Figma 1x 실측 68/80/92(흰 링 포함 전체 지름).
 * 임계와 지름이 갈라지면 "겹쳐 보이는데 안 합쳐지는" 상태가 생기므로 출처를 하나로 둔다.
 * SIDO(92)는 줌 하한(MAP_MIN_ZOOM) 때문에 실사용 경로가 없다 — 전국 확장 시 되살아난다.
 */
export const CLUSTER_MARKER_PX = MARKER_MERGE_PX;

/** 흰 링 두께 — Figma 정본 3px 백색 스트로크 (지도 타일과 마커를 분리한다) */
const RING_WIDTH = 3;

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
  const size = CLUSTER_MARKER_PX[marker.unit];
  return (
    /* Android 서브뷰 평탄화 방지 — 평탄화되면 원·테두리가 사라진다 (MSG-298 경로 마커 선례) */
    <View
      collapsable={false}
      accessibilityLabel={
        marker.name !== null
          ? `${marker.name} 점령 격자 ${marker.count}개`
          : `점령 격자 ${marker.count}개`
      }
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: semantic.primary,
        borderWidth: RING_WIDTH,
        borderColor: semantic.canvas,
        alignItems: "center",
        justifyContent: "center",
        ...RAISED_SHADOW,
      }}
    >
      {/* 병합 마커·미판정 버킷은 이름이 없다 — 개수만 표시 (S5) */}
      {marker.name !== null && (
        <Text
          numberOfLines={1}
          style={{
            color: semantic.onPrimary,
            fontSize: typography.caption.fontSize,
            lineHeight: typography.caption.lineHeight,
            fontWeight: "400",
          }}
        >
          {marker.name}
        </Text>
      )}
      <Text
        style={{
          color: semantic.onPrimary,
          fontSize: typography["body-strong"].fontSize,
          lineHeight: typography["body-strong"].lineHeight,
          fontWeight: "600",
        }}
      >
        {formatClusterCount(marker.count)}
      </Text>
    </View>
  );
};
