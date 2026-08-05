import { Text, View } from "react-native";
import { Button } from "@fillmap/ui-native";
import { BADGE_GRID_COLUMNS, chunkIntoRows } from "../model/badge-grid";
import { MOCK_BADGES } from "../model/mock-badges";

/**
 * SOURCE: Figma "개인 도감 — 뱃지 탭" (node 14094:4816) — MSG-301.
 * "뱃지 진열장" 타이틀 + 뱃지 카드 3열 그리드 + "뱃지 전체 보기" 버튼 조립.
 * 카드 = 무라벨 dashed 이미지 플레이스홀더 + 뱃지명 (ASSUMPTION 2 — 시안
 * "Image" 라벨은 임시), 탭 무동작이라 View 유지 (button 역할 미부여 —
 * MSG-299 방문 기록 행과 동일 접근성 원칙). 그리드는 행 단위 flex-row gap +
 * flex-1 셀 (AC 2·4 — chunkIntoRows 근거는 badge-grid 참조). 6종은 정적
 * 대표 프리뷰로 badgeCount(23)와 비연동 (ASSUMPTION 5), "뱃지 전체 보기"는
 * 무동작 스텁 (AC 5 — 뱃지 전체 화면은 후속 티켓).
 */
export const BadgeShelf = () => (
  <>
    <Text className="mt-md text-fm-title text-foreground">뱃지 진열장</Text>
    <View className="mt-sm gap-sm">
      {chunkIntoRows(MOCK_BADGES, BADGE_GRID_COLUMNS).map((row) => (
        <View key={row[0].id} className="flex-row gap-sm">
          {row.map((badge) => (
            <View
              key={badge.id}
              className="flex-1 items-center gap-xs rounded-md border border-border bg-surface-soft p-sm"
            >
              <View className="aspect-square w-full rounded-sm border border-dashed border-border bg-surface" />
              <Text className="text-fm-caption text-foreground">
                {badge.name}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
    <Button
      text="뱃지 전체 보기"
      variant="primary"
      size="lg"
      shape="pill"
      className="mt-md w-full"
      onPress={() => {
        // 무동작 스텁 (AC 5) — 뱃지 전체 화면은 후속 티켓에서 연결
      }}
    />
  </>
);
