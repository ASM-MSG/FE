import { useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Share2 } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { BottomSheet, Button, MapIconButton, Toast } from "@fillmap/ui-native";
import { serverGridIdFromCellId } from "../../../entities/cell/model/cell-id";
import { useReportVideo } from "../../video-actions/api/use-video-mutations";
import {
  reportFailureNotice,
  type ReportReasonId,
} from "../../video-actions/model/report";
import { useAutoDismissToast } from "../../video-actions/model/use-auto-dismiss-toast";
import { GridMap } from "../../map-home/ui/grid-map";
import { useGridVideosQuery } from "../api/use-grid-videos-query";
import { deriveCellDetail } from "../model/cell-detail";
import { GridVideoRow } from "./grid-video-row";
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
 * 공유 원형 아이콘 버튼 — Figma 14094:4210. 준비 중 스텁(공유는 범위 밖 유지).
 * 짝이던 더보기(⋯)는 MSG-431에서 제거했다 — 아래 화면 JSDoc 참조.
 */
const CircleIconButton = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint="아직 준비 중인 기능입니다"
    className="size-9 items-center justify-center rounded-full bg-surface-soft active:opacity-60"
  >
    {children}
  </Pressable>
);

interface GridDetailScreenProps {
  cellId: string;
}

/**
 * 격자 상세 화면 (MSG-296 AC 1~11, Figma 14094:4192) — 상단 지도(선택 격자 점선
 * 강조 + 뒤로 가기) + 고정형 바텀시트(내부 스크롤만).
 *
 * **MSG-431 — "이 격자의 영상"만 실 API로 전환했다.** 상단 통계·지도·미리보기는 여전히
 * `deriveCellDetail` mock이다(이 티켓의 목적은 신고 배선이지 격자 상세 실연동이 아니다 —
 * 남은 mock은 빌드 리포트에 명시하고 환류한다). 영상 목록은 전역·내 영상 2개 응답의
 * videoId 교집합으로 소유를 판정해(`useGridVideosQuery`) 행마다 ⋯ 를 얹고, 도감 갤러리와
 * **같은** 시트를 연다 — 내 영상은 공개 범위·삭제, 타인 영상은 신고하기.
 *
 * **화면 상단의 격자 단위 ⋯(수정/삭제/신고)는 제거했다** (스펙 신고 배선 결정 4의 "정리"
 * 판정 = 제거). 세 항목 모두 영상 단위 메뉴와 의미가 겹치면서 대상이 불분명했다:
 * ①"삭제하기"는 목록 첫 영상을 화면 로컬 상태로 감추는 mock이었고 이제 실 삭제가 행마다
 * 있다 ②"신고하기"는 대상 영상이 지정되지 않아 실 API로 옮길 수 없다 ③"수정하기"는 어떤
 * 영상과도 연결되지 않은 채 `/upload`로 보내는데 영상 교체는 티켓 [제외 범위]다.
 * 남겨 두면 같은 화면에 대상이 다르고 정확도도 다른(mock vs 실 API) 두 메뉴가 공존한다.
 */
export const GridDetailScreen = ({ cellId }: GridDetailScreenProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reportTarget, setReportTarget] = useState<number | null>(null);
  const [reportToast, setReportToast] = useAutoDismissToast();
  const [reportFailure, setReportFailure] = useAutoDismissToast();

  const detail = useMemo(() => deriveCellDetail(cellId), [cellId]);
  // 라우트 셀 id(구 위경도 스텝 체계)를 서버 격자 id(EPSG:5179)로 옮긴다 — 두 체계를
  // 잇는 유일한 정확한 경로다 (serverGridIdFromCellId JSDoc)
  const gridId = useMemo(() => serverGridIdFromCellId(cellId), [cellId]);
  const videos = useGridVideosQuery(gridId);

  /**
   * 신고 모달 닫기 — **대상과 실패 안내를 함께 비운다**. 실패 안내는 3초 자동 소멸이라
   * 그 사이에 닫고 다른 영상의 신고 모달을 열면 A의 실패 문구가 B의 카드에 뜬다
   * (모달 로컬 선택 상태와 같은 부류의 잔존 — MSG-431 재작업에서 함께 잡았다).
   */
  const closeReport = () => {
    setReportTarget(null);
    setReportFailure(null);
  };

  const report = useReportVideo({
    onReported: () => {
      closeReport();
      setReportToast("신고가 접수되었어요");
    },
    onFailed: (error) => {
      const notice = reportFailureNotice(error);
      if (notice.shouldClose) {
        closeReport();
        setReportToast(notice.message);
        return;
      }
      setReportFailure(notice.message);
    },
  });

  // 유일한 진입 경로(지도 탭)는 항상 인코딩 id를 만든다 — 형식 밖 param은 렌더 없음
  if (!detail) return null;

  const handleReportSubmit = (reasonId: ReportReasonId) => {
    if (reportTarget === null) return;
    // 연타 방어는 `mutate`에 씌워진 in-flight 가드가 맡는다 (guardMutate — codex 리뷰 2)
    report.mutate({ videoId: reportTarget, reasonId });
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

      {/* 고정형 상세 시트 — ui-native BottomSheet 쉘 + 내부 스크롤 */}
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
          {videos.isError ? (
            <View className="items-center gap-xs py-lg">
              <Text className="text-fm-body text-foreground-muted">
                영상을 불러오지 못했어요
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={videos.retry}
                className="active:opacity-60"
              >
                <Text className="text-fm-label text-primary">다시 시도</Text>
              </Pressable>
            </View>
          ) : videos.isPending || !videos.rows ? (
            <View className="py-xl">
              <ActivityIndicator color={semantic.primary} />
            </View>
          ) : videos.rows.length === 0 ? (
            <View className="items-center py-lg">
              <Text className="text-fm-body text-foreground-muted">
                이 격자에 아직 업로드된 영상이 없어요
              </Text>
            </View>
          ) : (
            <View className="gap-sm">
              {videos.rows.map((row) => (
                <GridVideoRow
                  key={row.videoId}
                  row={row}
                  // gridId는 목록이 도착했다는 것 자체가 non-null임을 뜻한다(쿼리 게이트)
                  gridId={gridId ?? ""}
                  gridLabel={detail.label}
                  onReport={(target) => setReportTarget(target.videoId)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </BottomSheet>

      {/* 영상 신고 모달 (AC 9~13) — 대상 videoId는 영상 행이 정한다 */}
      <ReportModal
        visible={reportTarget !== null}
        onClose={closeReport}
        onSubmit={handleReportSubmit}
        submitting={report.isPending}
        failureMessage={reportFailure}
      />

      {/* 신고 접수·중복 안내 토스트 — 홈 인디케이터 위 오버레이, 자동 소멸 */}
      {reportToast !== null && (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 px-md"
          style={{ bottom: insets.bottom + 16 }}
        >
          <Toast title={reportToast} />
        </View>
      )}
    </View>
  );
};
