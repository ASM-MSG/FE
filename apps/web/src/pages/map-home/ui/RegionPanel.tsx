import { Button, DotsLoader } from "@fillmap/ui-web";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { useRegionGridsQuery } from "@/features/region/model/use-region-grids-query";
import { useReverseGeocodeQuery } from "@/features/region/model/use-reverse-geocode-query";
import { RegionGridCard } from "./RegionGridCard";
import { RegionListView } from "./RegionListView";
import { RetryNotice } from "./RetryNotice";

interface RegionPanelProps {
  /**
   * 격자 카드 클릭 — 첫 영상 미니 패널 재생 + 지도 테두리 강조 배선(사용자 피드백 —
   * 지도 이동·상세 없음)은 페이지(MapHomePage)가 조립한다
   */
  onGridSelect: (gridId: string) => void;
}

/**
 * 지역 격자 패널 (MSG-328 AC 4~12, Figma 14357-18972) — 홈 좌측 패널의 기본 분기.
 * 확정 행정동(region-panel-store)의 격자 카드를 세로 리스트로 보여준다.
 * MSG-403: 헤더는 **확정 지역명에 고정**된다 — 지도를 움직여도 바뀌지 않고 "장소 불러오기"
 * ·전체 보기 선택만 바꾼다(AC 13, MSG-328의 라이브 동기화를 되돌림). 확정·재검색 버튼은
 * 칩 화면과 공유하므로 페이지(MapHomePage)가 소유한다. "전체 보기"는 패널 안 전체 지역
 * 리스트로 전환한다.
 *
 * 기본 패널의 데이터원(역지오코딩·격자 리스트)은 여전히 로그인 전용 API다(익명 401
 * 실측 2026-08-13, api.fillmap.kr) — 비로그인은 조회를 게이트하고 로그인 유도 UI를
 * 보여준다(현행 유지 — MSG-463 확정 1). 401을 그대로 쏘면 auth-pipeline의 재발급 실패
 * → 세션 만료 처리(로그인 모달 강제 오픈)가 홈 진입만으로 발동한다. 전체 지역
 * 리스트(explore)만 MSG-454로 익명 조회가 허용됐고, 훅 레벨 게이트는 해제했지만
 * 비로그인 기본 패널에 "전체 보기" 진입로를 새로 열지는 않는다.
 */
export const RegionPanel = ({ onGridSelect }: RegionPanelProps) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const center = useViewportStore((s) => s.center);

  const displayed = useRegionPanelStore((s) => s.displayedRegion);
  const mode = useRegionPanelStore((s) => s.mode);
  const selectRegion = useRegionPanelStore((s) => s.selectRegion);
  const openRegionList = useRegionPanelStore((s) => s.openRegionList);

  const reverse = useReverseGeocodeQuery(isAuthenticated ? center : null);
  const grids = useRegionGridsQuery(
    isAuthenticated ? (displayed?.regionCode ?? null) : null,
  );

  if (!isAuthenticated) {
    return (
      <section className="flex flex-col items-center gap-md py-lg text-center">
        <p className="text-fm-body text-foreground-muted">
          로그인하면 이 지역의 격자와 영상을 볼 수 있어요.
        </p>
        <Button
          text="로그인"
          variant="primary"
          size="sm"
          onClick={openLoginModal}
        />
      </section>
    );
  }

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col gap-md">
        {mode === "regions" ? (
          <>
            <header className="flex items-center justify-between gap-sm">
              <h2 className="truncate text-fm-heading text-foreground">
                전체 지역
              </h2>
            </header>
            {/* 지역 선택은 격자 리스트만 바꾼다 — 확정 영역(지도 데이터)은 그대로 (codex 리뷰) */}
            <RegionListView onSelect={selectRegion} />
          </>
        ) : displayed === null ? (
          reverse.isError ? (
            <RetryNotice
              message="지역 정보를 불러오지 못했어요"
              onRetry={reverse.retry}
            />
          ) : !reverse.isResolved ? (
            <div className="flex flex-1 items-center justify-center">
              <DotsLoader label="현재 지역 확인 중" />
            </div>
          ) : (
            // reverse-geocode data null — 바다·행정동 밖 (AC 12). 격자 조회는 실행되지 않는다
            <p className="py-sm text-fm-body text-foreground-muted">
              지도 중심에 행정동이 없어요. 지도를 움직여 다른 지역을 살펴보세요.
            </p>
          )
        ) : (
          <>
            <header className="flex items-center justify-between gap-sm">
              {/* 행정동 표기는 서버 regionName 원문 (추정 8) — 길면 truncate.
                  확정 지역명 고정 — 지도 이동은 헤더를 바꾸지 않는다 (MSG-403 AC 13) */}
              <h2 className="truncate text-fm-heading text-foreground">
                {displayed.regionName}
              </h2>
              <button
                type="button"
                onClick={openRegionList}
                className="shrink-0 text-fm-label text-primary transition-opacity active:opacity-60"
              >
                전체 보기
              </button>
            </header>
            {/* 표시 지역이 있어도 이동 후 행정동 조회 실패를 숨기지 않는다 (리뷰 P2) —
                실패 시 currentRegion이 null이라 재검색 버튼이 못 뜨므로, 이 재시도가
                "장소 불러오기" 흐름의 유일한 복구 경로다. 헤더·리스트는 이전 지역 유지 */}
            {reverse.isError && (
              <RetryNotice
                message="현재 지역을 확인하지 못했어요"
                onRetry={reverse.retry}
              />
            )}
            {grids.isError ? (
              <RetryNotice
                message="격자 정보를 불러오지 못했어요"
                onRetry={grids.retry}
              />
            ) : grids.isPending || grids.data === undefined ? (
              <div className="flex flex-1 items-center justify-center">
                <DotsLoader label="지역 격자 불러오는 중" />
              </div>
            ) : grids.data.grids.length === 0 ? (
              <p className="py-sm text-fm-body text-foreground-muted">
                이 지역에는 아직 격자가 없어요. 지도를 움직여 다른 지역을
                둘러보세요.
              </p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto scrollbar-gutter-stable">
                {grids.data.grids.map((grid) => (
                  <li key={grid.gridId}>
                    <RegionGridCard
                      grid={grid}
                      regionName={displayed.regionName}
                      onSelect={onGridSelect}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </>
  );
};
