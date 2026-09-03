import { Pressable, Text, View } from "react-native";
import { Heart, MessageCircle } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Button, Toast, cx } from "@fillmap/ui-native";
import type { HomeSheetContentContext } from "../../map-home/ui/home-sheet";
import { SheetHeader } from "../../map-home/ui/sheet-header";
import { SheetScrollView } from "../../map-home/ui/sheet-scroll-view";
import {
  useEventVideoSheet,
  type EventVideoInput,
} from "../api/use-event-video-sheet";
import { eventVideoMetaLine, eventVideoTitle } from "../model/event-video-view";
import { EventVideoCommentInput } from "./event-video-comment-input";
import { EventVideoCommentRow } from "./event-video-comment-row";
import { EventVideoPlayer } from "./event-video-player";

/**
 * 현장 영상 상세 시트 (MSG-562 D4~D6·D9·D10·D14, Figma 15794:822) — 헤더(‹ 위치명 ✕) ·
 * 플레이어 · 제목/메타/배지 · 액션 행(도움돼요 버튼 + `댓글 N` pill) · `댓글 N` 라벨 · 댓글 목록 ·
 * `더 보기` · 인라인 토스트 · 입력 footer(스크롤 밖 — 1단계에서 탭바 바로 위).
 * 웹 `EventVideoMiniPanel.tsx` 참조본. 상세 도착 전엔 헤더 + 플레이어 로딩만 그린다(웹 게이트 동형).
 *
 * 시안과 의도적으로 다른 지점(스펙 Figma 오탐 방지): 조회수 미표시(DTO 부재), 제목은
 * `eventVideoTitle` 폴백만, 배지 이모지 없음, 댓글 오래된순, 아바타 첫 글자 폴백, 재생
 * 컨트롤은 expo-video 네이티브. 헤더 ⋯(유틸리티 메뉴)는 제외 범위.
 * 토스트는 시트 안 인라인(`ActionToast` Modal은 3초간 전 화면 터치를 삼켜 재생 조작을 막는다).
 */
interface EventVideoSheetContentProps extends HomeSheetContentContext {
  video: EventVideoInput;
}

const ICON_SIZE = 16;

export const EventVideoSheetContent = ({
  video,
  ...sheet
}: EventVideoSheetContentProps) => {
  const {
    detail,
    isPending,
    isError,
    retry,
    comments,
    interaction,
    draft,
    setDraft,
    pressHelpful,
    submitComment,
    submitDisabled,
    toast,
    back,
    close,
  } = useEventVideoSheet(video.videoId);
  const helpfulByMe = detail?.helpfulByMe ?? false;
  const helpfulDisabled = interaction?.helpfulDisabled ?? true;

  return (
    <View className="flex-1 gap-sm">
      <SheetHeader
        title={detail?.locationName ?? video.locationName}
        onBack={back}
        onClose={close}
      />

      <EventVideoPlayer
        uri={detail?.playbackUrl ?? null}
        isPending={isPending}
        isError={isError}
        onRetry={retry}
      />

      {detail !== null && interaction !== null && (
        <>
          <SheetScrollView {...sheet} resetKey={video.videoId}>
            <View className="gap-xxs">
              <Text className="text-fm-title text-foreground">
                {eventVideoTitle(detail)}
              </Text>
              {/* 조회수 미표시 — DTO 부재 (오탐 방지 1) */}
              <Text className="text-fm-caption text-foreground-muted">
                {eventVideoMetaLine(detail.uploaderNickname, detail.createdAt)}
              </Text>
              <View className="self-start rounded-full bg-event-tint px-sm py-0.5">
                <Text className="text-fm-caption text-primary">
                  {video.occurrenceTitle} · {detail.locationName}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-xs">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`도움돼요 ${detail.helpfulCount}`}
                accessibilityState={{
                  selected: helpfulByMe,
                  disabled: helpfulDisabled,
                }}
                disabled={helpfulDisabled}
                onPress={pressHelpful}
                hitSlop={10}
                className={cx(
                  "flex-row items-center gap-xxs rounded-full border px-sm py-1 active:opacity-80",
                  helpfulByMe ? "border-primary" : "border-border",
                  helpfulDisabled && "opacity-50",
                )}
              >
                <Heart
                  size={ICON_SIZE}
                  color={helpfulByMe ? semantic.primary : semantic.muted}
                  fill={helpfulByMe ? semantic.primary : "none"}
                />
                <Text
                  className={cx(
                    "text-fm-caption",
                    helpfulByMe ? "text-primary" : "text-foreground-muted",
                  )}
                >
                  도움돼요 {detail.helpfulCount}
                </Text>
              </Pressable>
              {/* 표시 전용 pill (웹 추정 3) — 탭 동작 정의 부재로 비버튼 */}
              <View className="flex-row items-center gap-xxs rounded-full border border-border px-sm py-1">
                <MessageCircle size={ICON_SIZE} color={semantic.muted} />
                <Text className="text-fm-caption text-foreground-muted">
                  댓글 {detail.commentCount}
                </Text>
              </View>
            </View>

            <View className="gap-sm">
              <Text className="text-fm-body-strong text-foreground">
                댓글 {detail.commentCount}
              </Text>
              {comments.comments.length === 0 ? (
                <Text className="py-sm text-center text-fm-caption text-foreground-muted">
                  아직 댓글이 없어요. 첫 댓글을 남겨보세요
                </Text>
              ) : (
                <View className="gap-md">
                  {comments.comments.map((comment) => (
                    <EventVideoCommentRow
                      key={comment.commentId}
                      comment={comment}
                    />
                  ))}
                </View>
              )}
              {comments.hasNext && (
                <Button
                  text={comments.isLoadingMore ? "불러오는 중" : "더 보기"}
                  variant="secondary"
                  size="sm"
                  className="w-full border border-border"
                  disabled={comments.isLoadingMore}
                  onPress={comments.loadMore}
                />
              )}
            </View>
          </SheetScrollView>

          {/* 실패 안내 — footer 바로 위, 터치 통과 (D10). pb-9 = SheetScrollView 하단 여유와 동일 — 카메라 FAB 겹침 회피 */}
          <View className="pb-9">
            {toast !== null && (
              <View
                pointerEvents="none"
                className="absolute inset-x-0 bottom-full pb-xs"
              >
                <Toast title={toast} />
              </View>
            )}
            <EventVideoCommentInput
              value={draft}
              onChange={setDraft}
              onSubmit={submitComment}
              disabled={interaction.inputDisabled}
              placeholder={interaction.placeholder}
              submitDisabled={submitDisabled}
            />
          </View>
        </>
      )}
    </View>
  );
};
