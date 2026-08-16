import { Button, DotsLoader } from "@fillmap/ui-web";
import type { CollectedVideo } from "@/entities/dex";
import { groupVideosByGrid } from "@/features/dex/model/gallery-groups";
import type { GallerySelection } from "@/features/dex/model/gallery-region-store";
import { useGridRegionStatQuery } from "@/features/dex/model/use-region-stat-query";
import { shortRegionName } from "@/features/dex/model/region-label";
import { useRegionVideosQuery } from "@/features/dex/model/use-region-videos-query";
import { isNewVideo } from "@/features/dex/model/video-new";
import { GalleryVideoCard } from "./GalleryVideoCard";

interface GalleryTabBodyProps {
  /** 표시 동 — 수집 격자·최근 수집 행 클릭으로 선택 (gallery-region-store) */
  selection: GallerySelection;
  /** "전체 보기" — 동 목록으로 복귀 (기준 10, 추정 7) */
  onViewAll: () => void;
  /** 영상 카드 클릭 — 우측 미니 패널 재생 배선은 부모(DexPanel) 몫 (기준 25) */
  onVideoSelect: (video: CollectedVideo) => void;
}

/**
 * "지역별 갤러리" 뷰 본문 (MSG-327 기준 10·12~15, Figma node 14599:19418) —
 * 헤더("{동} · 격자 N개 · 영상 N개" + "전체 보기") + 격자별 그룹 + 그룹당 1열 영상 카드.
 *
 * 조회는 2단이다: 선택 동의 대표 격자로 `by-grid`를 물어 regionCode를 얻고(명세에
 * regionCode가 없는 갭을 메운다), 그 코드로 `collections/videos`를 조회한다.
 * 그래서 상태 분기도 두 쿼리를 합쳐 본다 — 코드 조회 실패도 갤러리 실패다.
 * 구 3열 썸네일 그리드·프리뷰 확장(deriveGalleryPreview)은 1열 그룹 구조로 대체돼 폐기됐다.
 */
export const GalleryTabBody = ({
  selection,
  onViewAll,
  onVideoSelect,
}: GalleryTabBodyProps) => {
  const stat = useGridRegionStatQuery(selection.gridId);
  const videos = useRegionVideosQuery(stat.data?.regionCode ?? null);

  const isPending = stat.isPending || videos.isPending;
  const isError = stat.isError || videos.isError;
  const retry = stat.isError ? stat.retry : videos.retry;
  /*
   * by-grid는 조회 성공이어도 data: null(격자 중심이 행정동 밖·미판정)을 돌려줄 수 있다.
   * 그러면 regionCode가 없어 영상 쿼리가 비활성이고 pending·error 어느 쪽도 아니라,
   * 처리하지 않으면 스켈레톤이 영원히 남는다 (codex 리뷰 지적 — 실패를 로딩으로 위장하지 않는다).
   */
  const regionUnresolved =
    !stat.isPending && !stat.isError && stat.data === null;

  // 격자 라벨 폴백(구역 밖 격자)과 헤더는 축약명을 쓴다 — 원문은 388px 패널에서 잘린다
  const regionLabel = shortRegionName(selection.regionName);
  const groups = videos.data ? groupVideosByGrid(videos.data, regionLabel) : [];
  const videoTotal = videos.data?.length ?? 0;
  // NEW 판정 기준 시각 — 렌더 시점 1회로 고정해 그룹 간 판정이 엇갈리지 않게 한다
  const now = Date.now();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
      <div className="flex flex-col gap-xxs">
        <div className="flex items-center justify-between gap-sm">
          <h2 className="text-fm-title text-foreground">지역별 갤러리</h2>
          <button
            type="button"
            className="shrink-0 text-fm-body text-primary"
            onClick={onViewAll}
          >
            전체 보기
          </button>
        </div>
        <p className="truncate text-fm-caption text-foreground-muted">
          {videos.data
            ? `${regionLabel} · 격자 ${groups.length}개 · 영상 ${videoTotal}개`
            : regionLabel}
        </p>
      </div>

      {isError ? (
        <GalleryErrorState onRetry={retry} />
      ) : regionUnresolved ? (
        <p className="pt-lg text-center text-fm-body text-foreground-muted">
          행정동 정보를 찾지 못해 이 동의 갤러리를 열 수 없어요.
        </p>
      ) : isPending || !videos.data ? (
        <GallerySkeleton />
      ) : groups.length === 0 ? (
        <p className="pt-lg text-center text-fm-body text-foreground-muted">
          {regionLabel}에서 수집한 영상이 아직 없어요. 첫 영상을 올려 갤러리를
          채워 보세요.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-md overflow-y-auto scrollbar-gutter-stable">
          {groups.map((group) => (
            <li key={group.gridId} className="flex flex-col gap-xs">
              <div className="flex items-baseline justify-between gap-sm">
                <h3 className="min-w-0 truncate text-fm-body-strong text-foreground">
                  {group.label}
                </h3>
                <span className="shrink-0 text-fm-caption text-foreground-muted">
                  영상 {group.videos.length}개
                </span>
              </div>
              <ul className="flex flex-col gap-sm">
                {group.videos.map((video, index) => (
                  <li key={video.videoId}>
                    <GalleryVideoCard
                      video={video}
                      seq={group.videos.length - index}
                      isNew={isNewVideo(video.createdAt, now)}
                      onSelect={onVideoSelect}
                    />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** 로딩 자리 — 공통 도트 로더로 통일 (MSG-403 후속). 상태 알림은 role="status"가 담당 */
const GallerySkeleton = () => (
  <div className="flex flex-1 items-center justify-center py-lg">
    <DotsLoader label="갤러리 불러오는 중" />
  </div>
);

/** 오류 상태 + 재시도 (기준 15) — DexErrorState와 동일 패턴(제목+보조 문구+primary sm 버튼) */
const GalleryErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-md px-lg text-center">
    <div className="flex flex-col gap-xxs">
      <p className="text-fm-title text-foreground">
        갤러리를 불러오지 못했어요
      </p>
      <p className="text-fm-body text-foreground-muted">
        네트워크 상태를 확인하고 다시 시도해 주세요
      </p>
    </div>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);
