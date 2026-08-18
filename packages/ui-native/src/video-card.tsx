import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { Play } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Thumbnail } from "./thumbnail";
import { cx } from "./lib/cx";

interface VideoCardProps {
  /** 썸네일 이미지 URL — 미지정·로드 실패 시 Thumbnail 폴백(회색 박스 + fallback 텍스트) */
  src?: string;
  /** 폴백 상태에 표시할 짧은 텍스트 (예: "서면") */
  fallback?: string;
  /**
   * 재생시간 라벨 — **포맷된 문자열**을 받는다(예: "0:42").
   * ui-native는 도메인 무관 계층이라 포맷 유틸(shared/format)을 갖지 않는다.
   */
  durationLabel?: string;
  /** 메타 첫 줄 — 문자열이면 카드 제목 스타일로 감싸고, 노드면 그대로 렌더한다 */
  title: ReactNode;
  /** 메타 둘째 줄 — 보조 정보(문자열 또는 배지 등 노드 조합) */
  meta?: ReactNode;
  onPress?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "video-card" (node 14829:503, 342×216) — 1열 영상 카드.
 * 도감 갤러리·격자 상세 등에서 공통으로 쓰는 도메인 무관 카드다 — 제목/보조 줄은
 * 슬롯으로 받아 소비처가 도메인 문구를 조합한다(features의 grid-video-card·
 * theme-video-card는 도메인 결합이라 별도 존치).
 * 썸네일 높이는 Figma 실측(191px)에 가장 가까운 스케일 h-48(192px) 고정 —
 * ui-native 카드 관례(theme-video-card h-50·grid-video-card h-25)와 동일하다.
 *
 * 재생 원은 Figma 14829:503(파란 원 + 흰 삼각)과 **의도적으로 다르다** — 앱에 이미 있는
 * 카드 관례(흰 원 + 파란 삼각, grid-video-card·theme-video-card)를 우선한다. 두 카드의
 * VideoCard 이관이 이번 범위 밖(MSG-420 스펙 추정 2)이라, 여기만 Figma를 따르면 같은
 * 화면에 두 양식이 섞인다. 양식 통일은 카드 이관 티켓에서 한다.
 *
 * @example
 * <VideoCard
 *   src={video.thumbnailUrl}
 *   durationLabel={formatDuration(video.durationSec)}
 *   title="서면 1번가 야경"
 *   meta="조회 214 · 어제"
 *   onPress={play}
 * />
 */
export const VideoCard = ({
  src,
  fallback,
  durationLabel,
  title,
  meta,
  onPress,
  className,
}: VideoCardProps) => (
  <Pressable
    // onPress가 없으면 버튼으로 낭독되지 않게 role을 비운다 — 눌러도 아무 일이 없는
    // "버튼"을 스크린리더에 노출하지 않기 위함 (codex 리뷰)
    accessibilityRole={onPress ? "button" : undefined}
    onPress={onPress}
    className={cx("w-full gap-xs active:opacity-80", className)}
  >
    <View className="w-full">
      <Thumbnail src={src} fallback={fallback} className="h-48 w-full" />
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <View className="size-10 items-center justify-center rounded-full bg-background shadow-raised">
          <Play size={16} color={semantic.primary} fill={semantic.primary} />
        </View>
      </View>
      {durationLabel && (
        <View className="absolute bottom-xs right-xs rounded-xs bg-foreground/75 px-1.5 py-0.5">
          <Text className="text-fm-caption text-primary-foreground">
            {durationLabel}
          </Text>
        </View>
      )}
    </View>
    <View className="gap-0.5">
      {typeof title === "string" ? (
        <Text numberOfLines={1} className="text-fm-body-strong text-foreground">
          {title}
        </Text>
      ) : (
        title
      )}
      {typeof meta === "string" ? (
        <Text
          numberOfLines={1}
          className="text-fm-caption text-foreground-muted"
        >
          {meta}
        </Text>
      ) : (
        meta
      )}
    </View>
  </Pressable>
);
