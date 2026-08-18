import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, DotsLoader } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import { usePreferenceMutation } from "@/features/notifications/api/use-preference-mutation";
import { usePreferencesQuery } from "@/features/notifications/api/use-preferences-query";
import { usePushToggle } from "@/features/notifications/api/use-push-toggle";
import { derivePermissionBanner } from "@/features/notifications/model/permission-banner";
import { NotificationToggleRow } from "./ui/NotificationToggleRow";
import { PermissionBanner } from "./ui/PermissionBanner";

/**
 * 알림 설정 상세 패널 (MSG-409, Figma 14783:3344) — /profile/notifications 라우트
 * 컴포넌트. 지속 셸(MapShell) 지도 위 388px 설정 상세 패널 (ProfilePanel 레이아웃 관례).
 * - 헤더 "‹ 알림 설정" — 뒤로는 /profile 복귀 (AC 2). 헤더는 셸 크롬이라 로딩 게이트
 *   밖이다 — 로딩 중에도 뒤로가기는 가능해야 한다
 * - 콘텐츠는 로딩 완료까지 DotsLoader만 — 부분 렌더 금지 (AC 4, MSG-403 관례)
 * - 권한 배너는 조건부(수신 불가 상태만 — AC 9·10). CTA는 408 use-push-toggle의
 *   ON 플로우 재사용, denied/실패 안내는 기존 PushNoticeHost 스택 몫
 * - 조회 실패는 오류 게이트(제목+안내+[다시 시도]) — ProfileErrorState 패턴 재현 (AC 11.
 *   원본은 ProfilePanel 파일 내부 비공개라 로컬 재작성 — 스펙 명시)
 */
export const NotificationSettingsPanel = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePreferencesQuery();
  const { toggle, isBusy } = usePreferenceMutation();
  // 배너 노출 정본 = 408 토글 표시 정본 (추정 3) — checked=false면 수신 불가
  const pushToggle = usePushToggle();
  const bannerMode = derivePermissionBanner({
    supported: pushToggle.supported,
    checked: pushToggle.checked,
  });

  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col bg-background shadow-raised">
      <header className="flex shrink-0 items-center gap-xs p-md">
        <button
          type="button"
          onClick={() => navigate(ROUTES.profile)}
          aria-label="뒤로"
          className="shrink-0 text-foreground"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-fm-title text-foreground">
          알림 설정
        </h1>
      </header>
      {isError ? (
        <PreferencesErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <div className="flex flex-1 items-center justify-center">
          <DotsLoader label="알림 설정 불러오는 중" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto px-md pb-md scrollbar-gutter-stable">
          {bannerMode !== null && (
            <PermissionBanner
              mode={bannerMode}
              onAllow={() => pushToggle.setEnabled(true)}
              busy={pushToggle.isPending}
            />
          )}

          {data.map((group) => (
            <section key={group.title} className="flex flex-col gap-xs">
              <h2 className="text-fm-title text-foreground">{group.title}</h2>
              {group.items.map((item) => (
                <NotificationToggleRow
                  key={item.category}
                  label={item.label}
                  description={item.description}
                  checked={item.enabled}
                  busy={isBusy(item.category)}
                  onCheckedChange={(next) => toggle(item.category, next)}
                />
              ))}
            </section>
          ))}

          {/* 각주 (AC 12) — 설정과 무관한 필수 발송 고지 */}
          <p className="text-fm-caption text-foreground-muted">
            신고 처리 결과와 계정 관련 안내는 설정과 무관하게 발송됩니다.
          </p>
        </div>
      )}
    </aside>
  );
};

/** 오류 상태 + 재시도 (AC 11) — ProfileErrorState 패턴(제목+보조 문구+primary sm 버튼) */
const PreferencesErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-md px-lg text-center">
    <div className="flex flex-col gap-xxs">
      <p className="text-fm-title text-foreground">
        알림 설정을 불러오지 못했어요
      </p>
      <p className="text-fm-body text-foreground-muted">
        네트워크 상태를 확인하고 다시 시도해 주세요
      </p>
    </div>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);
