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
  /**
   * 썸네일 박스에 덧붙일 클래스 (MSG-421 온보딩 2장 히어로 요구로 추가된 비파괴 확장).
   * 기본 `h-48 w-full` 뒤에 이어붙지만, NativeWind는 클래스 **문자열 순서가 아니라 CSS
   * 캐스케이드(생성 스타일시트 순서)** 로 승자를 정한다 — Thumbnail 기본값(`bg-surface` 등)과
   * 충돌하는 속성을 덮으려면 important 수식자를 쓴다(예: `!bg-foreground`).
   * 미지정 시 렌더 불변.
   */
  thumbnailClassName?: string;
  /**
   * 썸네일 위에 겹칠 추가 오버레이 노드 (MSG-421 온보딩 2장 히어로 요구로 추가된 비파괴 확장).
   * 썸네일 래퍼(relative) 안에 그대로 렌더되므로 절대 위치·정렬은 호출부가 정한다.
   * 미지정 시 렌더 불변.
   */
  overlay?: ReactNode;
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
 * 화면에 두 양식이 섞인다. 근거·대안은 docs/spec/MSG-420.md "검토한 대안"과 MSG-420
 * 지라 코멘트(잔여 항목 1)에 있다.
 *
 * **MSG-425(도감 갤러리)에서 판단 완료 — 현행 유지**(사용자 승인 Q2). 도감 갤러리만
 * Figma대로 바꾸면 `grid-video-card`·`theme-video-card`와 앱 안에서 양식이 갈린다.
 * 통일은 카드 3종을 함께 이관하는 별도 티켓으로 다시 이월한다 — 남은 판단 주체는
 * **MSG-423(지도 홈 시트)** 및 그 후속 카드 통일 티켓이다.
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
  thumbnailClassName,
  overlay,
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
      <Thumbnail
        src={src}
        fallback={fallback}
        className={cx("h-48 w-full", thumbnailClassName)}
      />
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <View className="size-10 items-center justify-center rounded-full bg-background shadow-raised">
          <Play size={16} color={semantic.primary} fill={semantic.primary} />
        </View>
      </View>
      {overlay}
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
