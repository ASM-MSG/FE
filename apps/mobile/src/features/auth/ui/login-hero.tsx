import { Image, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { SHUTTER_ART_XML } from "../assets/shutter-art";
import cellPhoto from "../assets/cell-photo.jpg";

/**
 * SOURCE: Figma "소셜 로그인 · A-1 찍는 순간 점령" hero-stage (node 16026:466 하위, 342×400 r24) — MSG-601.
 * 연파랑 스테이지 위에 5×4 격자(채움·빈 점선·방금 채운 사진 칸) + 6° 기울어진 촬영 카드 + 셔터 + "+1 격자"
 * 배지. 화면 로컬 일러(도메인 장식) — 승격 대상 아님.
 *
 * 색은 Figma CSS 추출값(primary 100%)이 아니라 **스크린샷 톤**을 primary 알파로 표현한다(A2 —
 * 레이어 opacity가 CSS 추출에 빠졌다는 해석). 시안이 진파랑 스테이지였다면 `bg-primary` + 채움 칸
 * `bg-white/30`으로 클래스 3개만 뒤집는다.
 *
 * 스테이지는 `w-full`(화면폭−48), 안의 342 캔버스는 `self-center` 고정 — 격자·카드 배치는 기기폭과
 * 무관하고 좌우 연파랑 여백만 달라진다(오탐 방지 9). 접근성: 스테이지 하나가 라벨 1개로 낭독되고
 * 내부 칸·브래킷·배지는 개별 낭독되지 않는다(S5).
 */

type HeroCell = "fill" | "empty" | "photo";

/** 채움 맵 (Figma 실측, S2 대조 기준) — 행 = y, 열 = x. photo는 (3,1) 한 칸 */
const HERO_GRID: readonly (readonly HeroCell[])[] = [
  ["empty", "empty", "fill", "empty", "empty"],
  ["fill", "fill", "empty", "photo", "empty"],
  ["empty", "fill", "fill", "empty", "fill"],
  ["fill", "empty", "empty", "fill", "empty"],
];

const CELL_CLASS: Record<HeroCell, string> = {
  fill: "size-15 rounded-xs bg-primary/50",
  empty: "size-15 rounded-xs border border-dashed border-primary bg-white/60",
  photo: "size-15 overflow-hidden rounded-xs border-2 border-primary",
};

/** 촬영 카드 뷰파인더 브래킷 — 모서리마다 가로 14×2 + 세로 2×14, 카드 모서리에서 16px 안쪽 */
const BRACKET_BARS = [
  "absolute left-4 top-4 h-0.5 w-3.5 bg-white",
  "absolute left-4 top-4 h-3.5 w-0.5 bg-white",
  "absolute right-4 top-4 h-0.5 w-3.5 bg-white",
  "absolute right-4 top-4 h-3.5 w-0.5 bg-white",
  "absolute bottom-4 left-4 h-0.5 w-3.5 bg-white",
  "absolute bottom-4 left-4 h-3.5 w-0.5 bg-white",
  "absolute bottom-4 right-4 h-0.5 w-3.5 bg-white",
  "absolute bottom-4 right-4 h-3.5 w-0.5 bg-white",
] as const;

export const LoginHero = () => (
  <View
    accessible
    accessibilityLabel="격자를 채우는 촬영 일러스트"
    className="h-100 w-full overflow-hidden rounded-xl bg-primary/10"
  >
    <View
      importantForAccessibility="no-hide-descendants"
      className="h-full w-85.5 self-center"
    >
      {/* 격자 5×4 — 셀 60 r4 gap 2, 스테이지 하단 24 (Figma y=130 = 400−246−24) */}
      <View className="absolute inset-x-0 bottom-lg items-center gap-0.5">
        {HERO_GRID.map((row, y) => (
          <View key={y} className="flex-row gap-0.5">
            {row.map((cell, x) => (
              <View key={x} className={CELL_CLASS[cell]}>
                {cell === "photo" && (
                  <Image
                    source={cellPhoto}
                    resizeMode="cover"
                    className="size-full"
                  />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>
      {/* 촬영 카드 150×190 r12, 6° 기울기 — 사진 138×150 r8 + 브래킷 + 캡션 */}
      <View className="absolute left-5 top-5 h-47.5 w-37.5 rotate-6 rounded-md bg-background p-1.5 shadow-modal">
        <View className="h-37.5 w-full overflow-hidden rounded-sm">
          <Image source={cellPhoto} resizeMode="cover" className="size-full" />
        </View>
        {BRACKET_BARS.map((bar) => (
          <View key={bar} className={bar} />
        ))}
        <Text className="mt-xs px-0.5 text-fm-caption text-foreground-muted">
          서면 A-14 · 방금 촬영
        </Text>
      </View>
      {/* 셔터 60 — 그림자는 SVG filter 대신 래퍼 shadow-fab (A9, Android는 안 보일 수 있음) */}
      <View className="absolute top-44 size-18 self-center shadow-fab">
        <SvgXml xml={SHUTTER_ART_XML} width="100%" height="100%" />
      </View>
      {/* "+1 격자" 배지 */}
      <View className="absolute right-18.5 top-40 rounded-full bg-primary px-2.5 py-1.25 shadow-raised">
        <Text className="text-fm-label font-semibold text-primary-foreground">
          +1 격자
        </Text>
      </View>
    </View>
  </View>
);
