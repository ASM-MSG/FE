import { useCallback, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, DotsLoader } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import type {
  CollectedGrid,
  CollectedVideo,
  RecentRegion,
} from "@/entities/dex";
import {
  clampPct,
  formatExploreSummary,
} from "@/features/dex/model/dex-summary";
import { dexTabPath, parseDexTab } from "@/features/dex/model/dex-tab";
import { useGalleryRegionStore } from "@/features/dex/model/gallery-region-store";
import {
  deriveRecentRegions,
  excludeRemovedRegions,
} from "@/features/dex/model/recent-regions";
import { shortRegionName } from "@/features/dex/model/region-label";
import { useRecentRemovalStore } from "@/features/dex/model/recent-removal-store";
import {
  useBadgesQuery,
  useCollectionGridsQuery,
  useCollectionSummaryQuery,
  useUploadHistoryQuery,
} from "@/features/dex/model/use-collection-query";
import { useCurrentRegionStatQuery } from "@/features/dex/model/use-region-stat-query";
import { useProfileQuery } from "@/features/profile/model/use-profile-query";
import { useVideoMiniPanelStore } from "@/features/map-home/model/video-mini-panel-store";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";
import { VideoMiniPanel } from "@/widgets/video-mini-panel/VideoMiniPanel";
import { BadgeTabBody } from "./ui/BadgeTabBody";
import { DexProfileHeader } from "./ui/DexProfileHeader";
import { DexStatCards } from "./ui/DexStatCards";
import { DexTabs } from "./ui/DexTabs";
import { GalleryTabBody } from "./ui/GalleryTabBody";
import { RecentRegionRow } from "./ui/RecentRegionRow";
import { RecordTabBody } from "./ui/RecordTabBody";
import { RegionProgress } from "./ui/RegionProgress";

/**
 * 개인 도감 패널 (MSG-121·122·123 → MSG-327 실 API 전환, Figma node 14599:5081·19418·12529) —
 * 지속 셸(MapShell) 지도 위 388px 좌측 오버레이. 라우트 `/dex/:tab?`로 열리며 탭은
 * 지도·뱃지·기록 3개(URL 정본): /dex→지도, /dex/badges→뱃지 진열장,
 * /dex/history→업로드 잔디 (MSG-414).
 *
 * MSG-327 전환의 요지:
 * - 데이터 소스가 mock 단일 응답에서 실 API 5종(users/me · collections/summary ·
 *   collections/grids · badges · regions/stats/by-point)으로 갈렸다. 로딩·오류 게이트는
 *   "화면 골격을 이루는 셋"(프로필·요약·수집 격자)만 본다 — 수집률·뱃지는 부분 실패해도
 *   패널 전체를 막지 않는다.
 * - "최근 수집한 격자"가 동(행정동) 단위다 — 수집 격자를 regionName으로 묶어 최근순으로
 *   보여주고, 동을 누르면 그 동의 갤러리로 들어간다.
 * - 갤러리 영상 클릭은 격자 상세 시트(mock 격자 소스 의존)가 아니라 우측 미니 패널 재생이다
 *   (사용자 확정 — MSG-328 홈 관례 승계). 그래서 use-cells-query·widgets/cell-detail 배선이
 *   도감에서 빠졌다.
 */
export const DexPanel = () => {
  const { tab: tabParam } = useParams();
  const tab = parseDexTab(tabParam);
  const navigate = useNavigate();

  const profile = useProfileQuery();
  const summary = useCollectionSummaryQuery();
  const grids = useCollectionGridsQuery();
  const badges = useBadgesQuery();
  const regionStat = useCurrentRegionStatQuery();
  // 다른 도감 쿼리와 함께 발사(뱃지 관례) — 게이트만 기록 탭별 (MSG-414 AC 3·10)
  const uploadHistory = useUploadHistoryQuery();

  // 화면 골격 게이트 — 셋 중 하나라도 없으면 패널 본문을 그릴 수 없다
  const isError = profile.isError || summary.isError || grids.isError;
  const ready = profile.data && summary.data && grids.data;

  const recentRegions = useMemo(
    () => (grids.data ? deriveRecentRegions(grids.data) : []),
    [grids.data],
  );

  // X 감춤 상태(비영속) — 표시 목록만 줄인다. 통계 카드·지도 표시는 미참조
  const removedIds = useRecentRemovalStore((s) => s.removedIds);
  const removeRecent = useRecentRemovalStore((s) => s.removeRecent);
  const visibleRegions = useMemo(
    () => excludeRemovedRegions(recentRegions, removedIds),
    [recentRegions, removedIds],
  );

  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clearOverlay = useMapOverlayStore((s) => s.clear);

  // 갤러리 뷰 상태 — null=동 목록 본문, 값=그 동의 갤러리. URL 미관여
  const selectedRegion = useGalleryRegionStore((s) => s.selected);
  const selectRegion = useGalleryRegionStore((s) => s.select);
  const clearRegion = useGalleryRegionStore((s) => s.clear);

  const miniSelection = useVideoMiniPanelStore((s) => s.selected);
  const openMiniPanel = useVideoMiniPanelStore((s) => s.open);
  const closeMiniPanel = useVideoMiniPanelStore((s) => s.close);

  // 갤러리 진입·전환 공통 — 이전 재생을 닫아 다른 동의 영상이 남지 않게 한다
  const enterGallery = useCallback(
    (regionName: string, gridId: string) => {
      closeMiniPanel();
      selectRegion({ regionName, gridId });
    },
    [closeMiniPanel, selectRegion],
  );

  const handleRegionSelect = useCallback(
    (region: RecentRegion) =>
      enterGallery(region.regionName, region.sampleGridId),
    [enterGallery],
  );

  // 지도 위 수집 격자 클릭 → 그 격자가 속한 동의 갤러리 (기준 16).
  // 수집 목록에 없는 격자·행정동 미판정 격자는 no-op (동을 특정할 수 없다)
  const collectedGrids = grids.data;
  const handleOverlayCellClick = useCallback(
    (gridId: string) => {
      const hit: CollectedGrid | undefined = collectedGrids?.find(
        (g) => g.gridId === gridId,
      );
      if (!hit || hit.regionName === null) return;
      enterGallery(hit.regionName, hit.gridId);
    },
    [collectedGrids, enterGallery],
  );

  // 영상 카드 클릭 → 우측 미니 패널 재생 (기준 25). 도감 영상은 전부 내 영상이라 mine=true
  const handleVideoSelect = useCallback(
    (video: CollectedVideo) => {
      openMiniPanel(
        {
          videoId: video.videoId,
          thumbnailUrl: video.thumbnailUrl,
          durationSec: video.durationSec,
          viewCount: null,
          recordedAt: video.createdAt,
        },
        true,
      );
    },
    [openMiniPanel],
  );

  // 지도 탭에서 셀 클릭 핸들러 등록, 탭 이탈(뱃지)·패널 언마운트 시 해제
  useEffect(() => {
    if (tab === "map" && ready) setOnCellClick(handleOverlayCellClick);
    return () => clearOverlay();
  }, [tab, ready, setOnCellClick, handleOverlayCellClick, clearOverlay]);

  // 지도 탭 도달 = 갤러리 뷰 해제 — 브라우저 뒤로가기 등 탭 버튼을 거치지 않는 복귀를 커버
  useEffect(() => {
    if (tab === "map") clearRegion();
  }, [tab, clearRegion]);

  // 패널 언마운트(섹션 이탈) — 갤러리 뷰·재생 해제: 도감 재진입은 항상 동 목록에서 시작하고,
  // 도감에서 연 미니 패널이 홈으로 새지 않는다 (zustand 액션 참조는 안정)
  useEffect(
    () => () => {
      clearRegion();
      closeMiniPanel();
    },
    [clearRegion, closeMiniPanel],
  );

  return (
    <>
      <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 shrink-0 flex-col bg-background shadow-raised">
        <h1 className="sr-only">도감</h1>
        {isError ? (
          <DexErrorState
            onRetry={() => {
              void profile.refetch();
              void summary.refetch();
              void grids.refetch();
            }}
          />
        ) : !ready ? (
          <div className="flex flex-1 items-center justify-center">
            <DotsLoader label="도감 불러오는 중" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-md p-md">
              <DexProfileHeader
                nickname={profile.data.nickname}
                profileImageUrl={profile.data.profileImageUrl}
                exploreSummary={formatExploreSummary(summary.data)}
                onProfileClick={() => navigate(ROUTES.profile)}
              />
              {/* 수집률은 좌표 1회 측위 → by-point. 미도착이면 표시를 보류한다 —
                  자리를 비워두는 편이 잘못된 0%를 스치듯 보여주는 것보다 낫다 */}
              {regionStat.data && (
                <RegionProgress
                  regionName={shortRegionName(regionStat.data.regionName)}
                  pct={clampPct(regionStat.data.progressRate)}
                />
              )}
              <DexStatCards
                collectedCellCount={summary.data.totalGridCount}
                badgeCount={summary.data.badgeCount}
                streakDays={summary.data.currentStreak}
              />
              <DexTabs
                active={tab}
                onSelect={(next) => {
                  // 지도 탭 클릭 = 갤러리 뷰 해제 → 동 목록 복귀 (같은 탭 재클릭은
                  // tab 불변이라 위 effect가 안 돌아 여기서만 해제된다)
                  if (next === "map") clearRegion();
                  navigate(dexTabPath(next));
                }}
              />
            </div>

            {tab === "map" ? (
              selectedRegion !== null ? (
                // key — 동 변경 시 리마운트로 스크롤·상태를 초기화한다
                <GalleryTabBody
                  key={selectedRegion.regionName}
                  selection={selectedRegion}
                  onViewAll={clearRegion}
                  onVideoSelect={handleVideoSelect}
                />
              ) : (
                <RecentRegionList
                  regions={visibleRegions}
                  hasCollected={recentRegions.length > 0}
                  onRegionSelect={handleRegionSelect}
                  onRemove={removeRecent}
                />
              )
            ) : tab === "badges" ? (
              badges.isError ? (
                <DexTabErrorState
                  message="뱃지를 불러오지 못했어요"
                  onRetry={() => void badges.refetch()}
                />
              ) : !badges.data ? (
                // 도착 전을 빈 진열장으로 보여주면 "획득 0개"로 오독된다 (codex 리뷰 지적)
                <div className="flex flex-1 items-center justify-center py-lg">
                  <DotsLoader label="뱃지 불러오는 중" />
                </div>
              ) : (
                <BadgeTabBody
                  badges={badges.data}
                  nickname={profile.data.nickname}
                  profileImageUrl={profile.data.profileImageUrl}
                />
              )
            ) : // 기록 탭 게이트 — 뱃지 탭 패턴 미러 (MSG-414 AC 10)
            uploadHistory.isError ? (
              <DexTabErrorState
                message="업로드 기록을 불러오지 못했어요"
                onRetry={() => void uploadHistory.refetch()}
              />
            ) : !uploadHistory.data ? (
              <div className="flex flex-1 items-center justify-center py-lg">
                <DotsLoader label="업로드 기록 불러오는 중" />
              </div>
            ) : (
              <RecordTabBody history={uploadHistory.data} />
            )}
          </>
        )}
      </aside>
      {/* 영상 미니 디테일 패널 — 좌측 패널 오른쪽 flush 보조 패널 (홈과 공유하는 위젯) */}
      {miniSelection && (
        <VideoMiniPanel selected={miniSelection} onClose={closeMiniPanel} />
      )}
    </>
  );
};

/** 도감 조회 실패 + 재시도 (기준 22) — MapFallback과 동일 패턴(제목+보조 문구+primary sm 버튼) */
const DexErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-md px-lg text-center">
    <div className="flex flex-col gap-xxs">
      <p className="text-fm-title text-foreground">도감을 불러오지 못했어요</p>
      <p className="text-fm-body text-foreground-muted">
        네트워크 상태를 확인하고 다시 시도해 주세요
      </p>
    </div>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);

/**
 * 탭 조회 실패 — 그 탭만 막는다 (요약·목록은 이미 떠 있다). 뱃지 탭(MSG-327)과
 * 기록 탭(MSG-414 AC 10)이 공유 — 두 번째 사용처가 생겨 message만 파라미터화했다.
 */
const DexTabErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-md px-lg text-center">
    <p className="text-fm-body text-foreground-muted">{message}</p>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);

interface RecentRegionListProps {
  /** 표시 목록 — 최근순 동 목록에서 X로 감춘 항목을 뺀 것 (기준 5·8) */
  regions: RecentRegion[];
  /** 원본 수집 존재 여부 — 빈 상태 안내는 "수집 0건"일 때만 (X로 전부 감춘 경우와 구분) */
  hasCollected: boolean;
  onRegionSelect: (region: RecentRegion) => void;
  onRemove: (regionName: string) => void;
}

/** "최근 수집한 격자" 섹션 — 동 목록 또는 빈 상태 안내 (기준 6·9) */
const RecentRegionList = ({
  regions,
  hasCollected,
  onRegionSelect,
  onRemove,
}: RecentRegionListProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
    <h2 className="text-fm-title text-foreground">최근 수집한 격자</h2>
    {regions.length === 0 ? (
      hasCollected ? null : (
        <p className="pt-lg text-center text-fm-body text-foreground-muted">
          아직 수집한 격자가 없어요. 첫 영상을 올려 격자를 수집해 보세요.
        </p>
      )
    ) : (
      <ul className="flex flex-1 flex-col overflow-y-auto scrollbar-gutter-stable">
        {regions.map((region) => (
          <li key={region.regionName}>
            <RecentRegionRow
              region={region}
              onSelect={onRegionSelect}
              onRemove={onRemove}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);
