import { Text, View } from "react-native";
import { Camera, MapPin } from "lucide-react-native";
import { palette } from "@fillmap/design-tokens";

/**
 * SOURCE: Figma "제안 — 영상 업로드 리디자인" A-2 hero (node 16175:358) — 2026-09-25.
 * 연파랑 스테이지 위 6×4 격자(채움·빈 칸) + 현재 격자를 뜻하는 primary 카메라 칸 + 하단에 떠 있는
 * 위치 카드. 로그인 히어로(`login-hero.tsx`)와 같은 도메인 장식 — 화면 로컬, 승격 대상 아님.
 * 격자는 그림이라 개별 낭독하지 않고 위치 카드만 접근성 트리에 남긴다.
 */

type HeroCell = "fill" | "empty" | "camera";

/** 채움 맵 (Figma 실측) — 행 = y, 열 = x. camera는 (2,3) 한 칸 */
const HERO_GRID: readonly (readonly HeroCell[])[] = [
  ["empty", "fill", "fill", "empty", "empty", "empty"],
  ["empty", "fill", "empty", "fill", "empty", "empty"],
  ["empty", "fill", "fill", "camera", "empty", "empty"],
  ["empty", "empty", "fill", "empty", "fill", "empty"],
];

const CELL_CLASS: Record<HeroCell, string> = {
  fill: "size-11 rounded-md bg-primary/40",
  empty: "size-11 rounded-md border border-primary/15 bg-white/70",
  camera:
    "size-11 items-center justify-center rounded-md bg-primary shadow-raised",
};

interface UploadHeroProps {
  /** 역지오코딩 라벨 또는 행사 `{행사명} · {위치명}` */
  locationLabel: string;
  /** 위치 카드 보조 문구 — 일반: "이 격자에 기록돼요" / 행사: "행사 위치에 기록돼요" */
  sublabel: string;
  /**
   * 위치 카드 pill 문구 — 기본 "지금 여기". 행사 귀속 업로드는 라벨이 GPS가 아니라 행사 장소라
   * (좌표 미전송, `eventUploadLabel`) "지금 여기"라고 단언할 수 없어 "행사 현장"으로 받는다 (#169 리뷰).
   */
  pillLabel?: string;
}

export const UploadHero = ({
  locationLabel,
  sublabel,
  pillLabel = "지금 여기",
}: UploadHeroProps) => (
  <View className="w-full overflow-hidden rounded-xl bg-primary/10 pb-lg pt-md">
    {/* 격자 6×4 — 셀 44 gap 6, 하단 위치 카드가 마지막 행을 살짝 덮는다 */}
    <View
      importantForAccessibility="no-hide-descendants"
      className="items-center gap-1.5"
    >
      {HERO_GRID.map((row, y) => (
        <View key={y} className="flex-row gap-1.5">
          {row.map((cell, x) => (
            <View key={x} className={CELL_CLASS[cell]}>
              {cell === "camera" && (
                <Camera size={20} color={palette.white} strokeWidth={2.2} />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
    {/* 위치 카드 — 흰 카드가 격자 위에 떠 있다 (Figma loc-card 318×76 r18) */}
    <View
      accessible
      accessibilityLabel={`${pillLabel} ${locationLabel}. ${sublabel}`}
      className="-mt-8 mx-4 flex-row items-center gap-sm rounded-lg bg-white/95 px-sm py-sm shadow-modal"
    >
      <View className="size-11 items-center justify-center rounded-full bg-primary/10">
        <MapPin size={22} color={palette["red-500"]} strokeWidth={2.2} />
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row">
          <View className="rounded-full bg-primary/10 px-2 py-0.5">
            <Text className="text-fm-label font-semibold text-primary">
              {pillLabel}
            </Text>
          </View>
        </View>
        <Text
          numberOfLines={1}
          className="text-fm-heading font-semibold text-foreground"
        >
          {locationLabel}
        </Text>
        <Text className="text-fm-label text-foreground-muted">{sublabel}</Text>
      </View>
    </View>
  </View>
);
