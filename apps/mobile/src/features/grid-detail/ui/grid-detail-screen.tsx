import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MoreHorizontal, Share2 } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import {
  BottomSheet,
  Button,
  MapIconButton,
  ModalCard,
  Toast,
  VideoRow,
} from "@fillmap/ui-native";
import { GridMap } from "../../map-home/ui/grid-map";
import { deriveCellDetail } from "../model/cell-detail";
import { MoreMenuSheet } from "./more-menu-sheet";
import { ReportModal } from "./report-modal";
import { VideoPreview } from "./video-preview";

/** 상세 지도 줌 — 100m 셀이 Figma(14094:4194)처럼 화면 폭의 1/3 규모로 보이는 수준 */
const DETAIL_ZOOM = 17;

/** 통계 1칸 (AC 7) — Figma 14094:4221 stat 카드. 웹 CellDetailSheet도 로컬 구현 — 승격 안 함 (스펙) */
const Stat = ({ value, label }: { value: string; label: string }) => (
  <View className="flex-1 items-center gap-0.5 rounded-md bg-surface-soft py-sm">
    <Text className="text-fm-title text-foreground">{value}</Text>
    <Text className="text-fm-caption text-foreground-muted">{label}</Text>
  </View>
);

/**
 * 공유·더보기 원형 아이콘 버튼 — Figma 14094:4210/4216. onPress 지정 시 실동작
 * (MSG-317 더보기 배선), 미지정은 no-op 스텁 + 준비 중 hint (공유 — 범위 밖 유지)
 */
const CircleIconButton = ({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress?: () => void;
  children: ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={onPress ? undefined : "아직 준비 중인 기능입니다"}
    onPress={onPress}
    className="size-9 items-center justify-center rounded-full bg-surface-soft active:opacity-60"
  >
    {children}
  </Pressable>
);

/** 신고 접수 토스트 자동 소멸 (MSG-317 추정 4) */
const REPORT_TOAST_MS = 2500;

interface GridDetailScreenProps {
  cellId: string;
}

/**
 * 격자 상세 화면 (MSG-296 AC 1~11, Figma 14094:4192) — 상단 지도(선택 격자 점선
 * 강조 + 뒤로 가기) + 고정형 바텀시트(내부 스크롤만 — 추정 3 승인).
 * 서버 연동 없이 mock 파생 모델(deriveCellDetail) 기반. 재생·공유는 스텁.
 * MSG-317: 더보기(⋯) 배선 — 메뉴 시트 + 삭제 확인·영상 신고 모달 + 접수 토스트.
 * 삭제는 화면 로컬 제외 id 상태 — 이탈 후 재진입 시 복원되는 mock 한계는 정상
 * (스펙 리스크 2, DELETE /api/videos 실연동 티켓에서 대체).
 */
export const GridDetailScreen = ({ cellId }: GridDetailScreenProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  /** 신고 접수 토스트 표시 카운터 — 0이면 숨김. boolean이면 표시 중 재제출 시 동일 값
   * 재설정으로 이펙트가 재실행되지 않아 타이머가 연장되지 않는다 (리뷰 반영) */
  const [reportToastCount, setReportToastCount] = useState(0);
  /** 삭제된 영상 id (AC 5) — deriveCellDetail 재파생 입력 */
  const [excludedVideoIds, setExcludedVideoIds] = useState<string[]>([]);
  const detail = useMemo(
    () => deriveCellDetail(cellId, new Date(), excludedVideoIds),
    [cellId, excludedVideoIds],
  );

  // 접수 토스트 자동 소멸 (AC 12) — 재제출 시 카운터 증가로 이펙트가 재실행되어 타이머 재설정
  useEffect(() => {
    if (reportToastCount === 0) return;
    const timer = setTimeout(() => setReportToastCount(0), REPORT_TOAST_MS);
    return () => clearTimeout(timer);
  }, [reportToastCount]);

  // 유일한 진입 경로(지도 탭)는 항상 인코딩 id를 만든다 — 형식 밖 param은 렌더 없음
  if (!detail) return null;

  /** 수정하기 (AC 3) — 업로드 플로우 진입까지 (영상 교체 연동은 제외 범위) */
  const handleEdit = () => {
    setMenuOpen(false);
    router.navigate("/upload");
  };

  /** 삭제 확인 (AC 5) — 대상은 대표 영상 = 목록 첫 항목 (사용자 확정 추정 1) */
  const handleDeleteConfirm = () => {
    setDeleteOpen(false);
    const targetId = detail.videos[0]?.id;
    // 전부 삭제해 목록이 빈 뒤의 재삭제 — 제외할 대상 없음
    if (targetId) setExcludedVideoIds((prev) => [...prev, targetId]);
  };

  /** 신고 제출 (AC 12) — mock: 서버 전송 없이 접수 토스트만 */
  const handleReportSubmit = () => {
    setReportOpen(false);
    setReportToastCount((count) => count + 1);
  };

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* 상단 지도 — 시트(top 36%)에 하단이 덮이는 44% 높이라 카메라 중심(22% 지점)이 노출 영역 안에 온다 (AC 2) */}
      <View className="absolute inset-x-0 top-0 h-[44%]">
        <GridMap
          initialCenter={detail.center}
          initialZoom={DETAIL_ZOOM}
          showCellGrid={false}
          showZoomControls={false}
          highlightCell={detail.index}
        />
      </View>

      {/* 뒤로 가기 (AC 3) — Figma 흰 원형·raised 그림자 (스펙 재사용 계획) */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 px-md"
        style={{ paddingTop: insets.top + 8 }}
      >
        <MapIconButton
          icon="back"
          onPress={() => router.back()}
          className="self-start bg-surface-elevated shadow-raised"
        />
      </View>

      {/* 고정형 상세 시트 (추정 3) — ui-native BottomSheet 쉘 + 내부 스크롤 */}
      <BottomSheet className="absolute inset-x-0 bottom-0 top-[36%]">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-sm"
          // 시트 쉘 pb-md(16) 위에 홈 인디케이터 인셋만 추가 확보
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          <VideoPreview durationLabel={detail.previewDurationLabel} />

          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 gap-0.75">
              <Text
                numberOfLines={1}
                className="text-fm-display text-foreground"
              >
                {detail.label}
              </Text>
              <Text
                numberOfLines={1}
                className="text-fm-label text-foreground-muted"
              >
                {detail.recentUploadText
                  ? `${detail.location} · ${detail.recentUploadText}`
                  : detail.location}
              </Text>
            </View>
            <CircleIconButton label="공유">
              <Share2 size={18} color={semantic.textPrimary} />
            </CircleIconButton>
            {/* 더보기 (MSG-317 AC 1) — 메뉴 시트 열기 */}
            <CircleIconButton label="더보기" onPress={() => setMenuOpen(true)}>
              <MoreHorizontal size={18} color={semantic.textPrimary} />
            </CircleIconButton>
          </View>

          <View className="flex-row gap-xs">
            <Stat value={detail.stats.fillRate} label="담수율" />
            <Stat value={detail.stats.videoCount} label="영상" />
            <Stat value={detail.stats.viewCount} label="조회" />
          </View>

          {/* 업로드 플로우는 MSG-302 — 탭 스텁 (AC 8) */}
          <Button
            text="이 격자에 영상 업로드"
            shape="pill"
            className="w-full"
          />

          <Text className="text-fm-title text-foreground">이 격자의 영상</Text>
          {detail.isEmpty ? (
            <View className="items-center py-lg">
              <Text className="text-fm-body text-foreground-muted">
                이 격자에 아직 업로드된 영상이 없어요
              </Text>
            </View>
          ) : (
            <View className="gap-sm">
              {detail.videos.map((video) => (
                <VideoRow
                  key={video.id}
                  title={video.title}
                  meta={video.meta}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* 더보기 메뉴 시트 (AC 1~3) — 수정/삭제/신고 진입점, 취소·딤 탭 닫기 */}
      <MoreMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onEdit={handleEdit}
        onDelete={() => {
          setMenuOpen(false);
          setDeleteOpen(true);
        }}
        onReport={() => {
          setMenuOpen(false);
          setReportOpen(true);
        }}
      />

      {/* 삭제 확인 모달 (AC 4~6, 추정 6) — MSG-306 로그아웃 확인 관례 미러 */}
      <ModalCard
        visible={deleteOpen}
        title="영상 삭제"
        description="정말 삭제하시겠습니까?"
        cancelText="취소"
        confirmText="삭제"
        confirmVariant="danger"
        onCancel={() => setDeleteOpen(false)}
        onOverlayPress={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />

      {/* 영상 신고 모달 (AC 9~13) */}
      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleReportSubmit}
      />

      {/* 신고 접수 토스트 (AC 12, 추정 4) — 홈 인디케이터 위 오버레이, 자동 소멸 */}
      {reportToastCount > 0 && (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 px-md"
          style={{ bottom: insets.bottom + 16 }}
        >
          <Toast title="신고가 접수되었어요" />
        </View>
      )}
    </View>
  );
};
