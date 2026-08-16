import { ChevronLeft } from "lucide-react";
import { Button, DotsLoader, cn } from "@fillmap/ui-web";
import type {
  HomeCellBadge,
  HomeCellDetail,
} from "@/features/map-home/model/home-cell-detail";
import { decodeGridCenter } from "@/entities/cell";
import type { FeedVideo } from "@/features/map-home/model/grid-videos";
import type { HourlyChart } from "@/features/map-home/model/hourly-uploads";
import type { GridVideosResult } from "@/features/map-home/model/use-grid-videos-query";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { CellActionRow } from "./CellActionRow";
import { FeedVideoList } from "./FeedVideoList";
import { GridHourlyChart } from "./GridHourlyChart";
import { RegionLocationLine } from "./RegionLocationLine";
import { useEscapeClose } from "./use-escape-close";

interface HomeCellDetailPanelProps {
  detail: HomeCellDetail;
  /** 격자 영상 목록 조합 결과 — 피드·상태 3종(로딩·실패·빈 목록) 분기 근거 (MSG-326 기준 8·10) */
  videos: GridVideosResult;
  /** 영상 카드 클릭 — 미니 디테일 패널 열기/교체 (MSG-277 3차 관례 복원, 테마 피드와 공통 배선) */
  onVideoSelect: (video: FeedVideo, mine: boolean) => void;
  /** 닫기 — Escape 키 배선 (AC 9-1). 칩 해제·전환 닫힘은 스토어 연동이 담당 */
  onClose: () => void;
  /** "전체 보기" 클릭 — 요약 패널과 동일하게 탐색으로 이동 (MSG-253 AC 11) */
  onViewAll: () => void;
  /**
   * 뒤로 — 제공 시 헤더에 `<`가 뜬다 (MSG-395 AC 6·11·24).
   * 핫구역 동 요약·코스 상세에서 내려온 격자 상세는 "닫기"가 아니라 "돌아가기"가 맞다.
   */
  onBack?: () => void;
  /** 배지 아래 한 줄 — `핫구역 안 N칸 · …부터 내가 점령 중`·`{코스} N번째 스팟 · 방문 완료` (AC 11·24) */
  contextLine?: string;
  /** 자유 배지 — 코스 스팟의 `코스 N번` (AC 24). 테마 배지 매핑 밖이라 중립 톤 */
  extraBadgeLabel?: string;
  /** 활발한 시간대 (AC 12) — 표본이 없으면 호출부가 넘기지 않는다 */
  chart?: HourlyChart;
}

/** 배지 스타일 매핑 — 연한 배경 pill (Figma 셀 선택 프레임). 토큰 클래스 리터럴만 사용 */
const BADGE_CLASS: Record<HomeCellBadge["id"], string> = {
  occupied: "bg-primary/10 text-primary",
  hot: "bg-theme-hot/10 text-theme-hot",
  festival: "bg-theme-festival/10 text-theme-festival",
  popup: "bg-theme-popup/10 text-theme-popup",
  route: "bg-theme-route/10 text-theme-route",
};

/**
 * 상세 로딩 자리 (MSG-325 리뷰 반영) — 격자를 바꿔 탭하면 새 응답이 올 때까지 detail이
 * 비는데, 그 사이 요약 패널로 되돌아가면 선택 컨텍스트가 있는데도 화면이 통째로 튄다.
 * 상세 슬롯을 지키면서 로딩만 알린다. Escape 닫기는 유지한다 — 조회가 실패해 영영
 * 상세가 오지 않는 경우에도 사용자가 빠져나올 수 있어야 한다.
 */
export const HomeCellDetailLoading = ({ onClose }: { onClose: () => void }) => {
  useEscapeClose(onClose);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <div className="flex flex-1 items-center justify-center">
        <DotsLoader label="격자 정보 불러오는 중" />
      </div>
    </div>
  );
};

/**
 * 상세 조회 실패 자리 (MSG-325 리뷰 반영) — 실패를 로딩으로 위장하지 않는다.
 * 로딩 자리와 같은 슬롯을 쓰되 재시도 수단을 준다(요약 패널의 실패 상태와 같은 결).
 */
export const HomeCellDetailError = ({
  onRetry,
  onClose,
}: {
  onRetry: () => void;
  onClose: () => void;
}) => {
  useEscapeClose(onClose);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-sm">
      <p className="text-fm-body text-foreground-muted">
        격자 정보를 불러오지 못했어요
      </p>
      <Button
        text="다시 시도"
        variant="secondary"
        size="sm"
        onClick={onRetry}
      />
    </div>
  );
};

/**
 * 홈 격자 상세 패널 (MSG-252 AC 9·9-1·10 → MSG-277 정보 구조 → MSG-325 실 API 전환 →
 * MSG-326 영상 목록·재생 복원) —
 * 좌측 패널에서 요약(CellSummaryPanel)·테마 피드 자리에 전환 렌더된다(SearchBox 유지).
 * 별도 닫기 버튼 없음(A3) — 칩 해제·전환(스토어 연동)·다른 격자 탭(교체)·Escape로 닫힌다.
 *
 * MSG-326 기준 8·10 (추정 1): MSG-325 결정 B①로 사라졌던 영상 목록 피드를 실 API로
 * 복원하고, 대역이던 전역 대표 영상 단독 섹션은 목록으로 대체했다(전역 인기 1위와 중복 —
 * 복원 판단 시 home-cell-detail.ts 상단 주석 참조). 피드는 내 영상 앞(MSG-277 정렬 관례),
 * 카드 클릭은 미니 디테일 패널 열기(onVideoSelect). 목록 상태 3종은 상세 슬롯을 지킨 채
 * 피드 영역에서만 분기한다 — 목록 실패가 상세 전체를 무너뜨리지 않는다.
 * 활발한 시간대·전역 지표·마지막 업로드 줄은 복원하지 않는다(MSG-325 결정 B① 존치).
 * 액션 행 실동작은 계속 제외 범위 — 클릭 no-op 유지 (MSG-326 잔여분).
 */
export const HomeCellDetailPanel = ({
  detail,
  videos,
  onVideoSelect,
  onClose,
  onViewAll,
  onBack,
  contextLine,
  extraBadgeLabel,
  chart,
}: HomeCellDetailPanelProps) => {
  // Escape 닫기 (AC 9-1) — 입력 요소 타깃 무시 계약 포함 (use-escape-close, MSG-277 공용 추출)
  useEscapeClose(onClose);

  // [영상 추가] = 격자 고정 진입 (MSG-329) — 이 격자 중심을 지목해 업로드 모달을 연다
  // (위치 태그·확정 좌표가 이 격자를 따른다)
  const openUploadModal = useUploadModalStore((s) => s.openModal);
  const handleUpload = () => openUploadModal(decodeGridCenter(detail.gridId));

  // 요소가 전부 준비되기 전에는 도트 로더만 (MSG-403 후속 — 부분 렌더 금지).
  // 실패는 게이트하지 않는다 — 에러 UI도 "렌더된 상태"다
  if (videos.isPending) return <HomeCellDetailLoading onClose={onClose} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <header className="flex flex-col gap-xs">
        <div className="flex items-center gap-xs">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="목록으로"
              className="shrink-0 text-foreground-muted"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
          )}
          {/* 배지·"전체 보기"와 한 줄을 나눠 쓰므로 라벨이 길면 잘려야 한다 —
              min-w-0 없이는 긴 격자명이 버튼을 화면 밖으로 밀어낸다 (ChipDetailHeader 관례) */}
          <h2 className="min-w-0 flex-1 truncate text-fm-title text-foreground">
            {detail.label}
          </h2>
          {extraBadgeLabel && (
            <span className="rounded-full bg-surface px-xs py-0.5 text-fm-caption text-foreground-muted">
              {extraBadgeLabel}
            </span>
          )}
          {detail.badges.map((badge) => (
            <span
              key={badge.id}
              className={cn(
                "rounded-full px-xs py-0.5 text-fm-caption",
                BADGE_CLASS[badge.id],
              )}
            >
              {badge.label}
            </span>
          ))}
          {/* "전체 보기" — 요약 패널(BottomSheet actionLabel)과 동일 시각·동작 (AC 11) */}
          <button
            type="button"
            onClick={onViewAll}
            className="ml-auto shrink-0 text-fm-label text-primary"
          >
            전체 보기
          </button>
        </div>
        {contextLine && (
          <p className="text-fm-caption text-foreground-muted">{contextLine}</p>
        )}
        <p className="text-fm-caption text-foreground-muted">
          {detail.subtitle}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-md">
          <CellActionRow onUpload={handleUpload} />

          {/* 1열 피드 — 내 영상 앞·중복 제거는 모델(mergeFeedItems) 소관.
              상태 3종(기준 10): 실패는 로딩·성공분으로 위장하지 않는다 (추정 7) */}
          {videos.isError ? (
            <div className="flex flex-col gap-sm">
              <p className="text-fm-body text-foreground-muted">
                영상 목록을 불러오지 못했어요
              </p>
              <Button
                text="다시 시도"
                variant="secondary"
                size="sm"
                onClick={videos.retry}
              />
            </div>
          ) : videos.isEmpty ? (
            <p className="text-fm-body text-foreground-muted">
              아직 이 격자에 영상이 없어요
            </p>
          ) : (
            <FeedVideoList items={videos.items} onVideoSelect={onVideoSelect} />
          )}

          {/* 활발한 시간대 (MSG-395 AC 12) — Figma는 동 요약에 뒀으나 시간대 API가
              격자 단위라 여기로 옮겼다(사용자 확정). 표본 0이면 호출부가 넘기지 않는다 */}
          {chart && <GridHourlyChart chart={chart} />}

          {/* 위치 줄 — 행정동. by-grid가 무귀속·미판정이면 null이라 줄을 그리지 않는다 */}
          {detail.regionLabel && (
            <RegionLocationLine regionName={detail.regionLabel} />
          )}
        </div>
      </div>
    </div>
  );
};
