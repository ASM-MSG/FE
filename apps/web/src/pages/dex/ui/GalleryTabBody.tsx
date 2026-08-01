import { useState } from "react";
import { Button } from "@fillmap/ui-web";
import type { CollectedVideo } from "@/entities/dex";
import {
  GALLERY_PREVIEW_LIMIT,
  deriveGalleryPreview,
} from "@/features/dex/model/gallery";
import { useGalleryQuery } from "@/features/dex/model/use-gallery-query";
import { GalleryThumbnail } from "./GalleryThumbnail";

interface GalleryTabBodyProps {
  /** 표시 지역 — 수집 셀·최근 수집 행 클릭으로 선택된 지역 (gallery-region-store, ② B1) */
  region: string;
  /** 썸네일 클릭 — 격자 상세 시트 열기 배선은 부모(DexPanel) 몫 (AC 23) */
  onVideoClick: (video: CollectedVideo) => void;
}

/**
 * "지역별 갤러리" 뷰 본문 (MSG-122 AC 7~13·15·16, ② — 탭이 아니라 지도 탭 내부 뷰) —
 * 제목 + 선택 지역명 보조 표시(A8) + 최신 수집순 3열 썸네일 그리드. 기본 프리뷰 9개,
 * ">9개"일 때만 "갤러리 전체 보기"를 표시하고(A4) 클릭 시 인라인 확장 + 버튼 제거(티켓 명시),
 * 확장 목록은 패널 안에서 스크롤된다 (AC 15). 확장 상태는 로컬 state — 부모(DexPanel)가
 * key={region}으로 리마운트해 지역 변경 시 프리뷰로 복귀한다 (A5).
 * 빈 상태는 ② 개정으로 UI 도달 불가지만 방어 분기로 존치한다 (AC 8, Q5).
 */
export const GalleryTabBody = ({ region, onVideoClick }: GalleryTabBodyProps) => {
  const { data, isError, refetch } = useGalleryQuery(region);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
      <div className="flex flex-col gap-xxs">
        <h2 className="text-fm-title text-foreground">지역별 갤러리</h2>
        {/* 선택 지역명 보조 표시 (A8) — 어느 지역의 갤러리인지 항상 드러낸다 */}
        <p className="text-fm-caption text-foreground-muted">
          {data ? `${region} · 영상 ${data.length}개` : region}
        </p>
      </div>
      {isError ? (
        <GalleryErrorState onRetry={() => refetch()} />
      ) : !data ? (
        <GallerySkeleton />
      ) : data.length === 0 ? (
        <p className="pt-lg text-center text-fm-body text-foreground-muted">
          {region}에서 수집한 영상이 아직 없어요. 첫 영상을 올려 갤러리를 채워
          보세요.
        </p>
      ) : (
        <GalleryGrid
          videos={data}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          onVideoClick={onVideoClick}
        />
      )}
    </div>
  );
};

interface GalleryGridProps {
  /** 최신 수집순 정렬 완료 목록 (queryFn 계약) */
  videos: CollectedVideo[];
  expanded: boolean;
  onExpand: () => void;
  onVideoClick: (video: CollectedVideo) => void;
}

/** 3열 썸네일 그리드 + 전체 보기 버튼 (AC 13·15·16) — 그리드만 스크롤 영역이다 */
const GalleryGrid = ({
  videos,
  expanded,
  onExpand,
  onVideoClick,
}: GalleryGridProps) => {
  const preview = deriveGalleryPreview(videos);
  const shown = expanded ? videos : preview.videos;

  return (
    <>
      <ul className="grid min-h-0 grid-cols-3 content-start gap-xs overflow-y-auto scrollbar-gutter-stable">
        {shown.map((video) => (
          <li key={video.videoId}>
            <GalleryThumbnail video={video} onClick={onVideoClick} />
          </li>
        ))}
      </ul>
      {preview.hasMore && !expanded && (
        <Button
          text="갤러리 전체 보기"
          variant="primary"
          className="w-full shrink-0"
          onClick={onExpand}
        />
      )}
    </>
  );
};

/** 로딩 스켈레톤 — 그리드 자리 타일 9개 (AC 9). 상태 알림은 role="status"가 담당 */
const GallerySkeleton = () => (
  <div
    role="status"
    aria-label="갤러리 불러오는 중"
    className="grid grid-cols-3 gap-xs"
  >
    {Array.from({ length: GALLERY_PREVIEW_LIMIT }, (_, i) => (
      <div
        key={i}
        className="aspect-square animate-pulse rounded-sm bg-surface"
      />
    ))}
  </div>
);

/** 오류 상태 + 재시도 (AC 7) — DexErrorState와 동일 패턴(제목+보조 문구+primary sm 버튼) */
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
