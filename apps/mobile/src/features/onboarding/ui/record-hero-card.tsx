import { Text, View } from "react-native";
import { VideoCard } from "@fillmap/ui-native";

/**
 * SOURCE: Figma 온보딩 v2 · 2 — 기록 (node 14875:442) 히어로.
 * 연출용 정적 일러스트 (스펙 A2) — 실 영상·재생 동작이 없다(VideoCard에 onPress 미전달).
 * 다크 썸네일과 썸네일 위 AI 칩은 MSG-421이 VideoCard에 추가한 비파괴 확장
 * (`thumbnailClassName`·`overlay`)으로 재현한다 — 온보딩 전용 카드를 새로 만들지 않는다.
 */
export const RecordHeroCard = () => (
  <View className="rounded-xl bg-primary/5 p-md">
    <View className="rounded-lg border border-border bg-background p-sm shadow-raised">
      <VideoCard
        durationLabel="0:42"
        // #1D1D1F = foreground 토큰 정확 일치. NativeWind는 클래스 문자열 순서가 아니라
        // 스타일시트 순서로 승자를 정하므로(bg-foreground < bg-surface) important 수식자로 덮는다
        thumbnailClassName="!bg-foreground"
        overlay={
          <View className="absolute bottom-xs left-xs flex-row items-center rounded-full border border-background/40 bg-background/20 px-2.5 py-1">
            <Text className="text-fm-caption text-primary-foreground">
              ✦ AI 추천 0:03 – 0:08
            </Text>
          </View>
        }
        title={
          <View className="flex-row items-center justify-between">
            <Text className="text-fm-title text-foreground">서면 A-14</Text>
            <Text className="text-fm-label text-foreground-muted">
              방금 업로드
            </Text>
          </View>
        }
        meta={
          <View className="mt-xs flex-row items-center rounded-sm bg-primary/5 px-xs py-1.5">
            <Text className="text-fm-caption text-primary">
              🔒 얼굴·번호판은 AI가 자동으로 가려요
            </Text>
          </View>
        }
      />
    </View>
  </View>
);
