import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@fillmap/ui-web";
import { ROUTES } from "@/app/routes";
import { DEFAULT_PROFILE_IMAGE } from "@/entities/profile";
import { useLogout } from "@/features/auth/api/use-auth-mutations";
import { formatJoinedDate } from "@/features/profile/model/profile-format";
import { useActivityQuery } from "@/features/profile/model/use-activity-query";
import { useProfileModalStore } from "@/features/profile/model/profile-modal-store";
import { useProfileQuery } from "@/features/profile/model/use-profile-query";
import { DeleteAccountModal } from "@/features/profile/ui/DeleteAccountModal";
import { ProfileEditModal } from "@/features/profile/ui/ProfileEditModal";
import { ActivityCard } from "./ui/ActivityCard";
import { ProfileHeader } from "./ui/ProfileHeader";
import { SettingInfoRow, SettingRow } from "./ui/SettingRow";

/**
 * 프로필 패널 (MSG-124 → MSG-329 실 API 전환) — 지속 셸(MapShell) 지도 위 좌측 오버레이.
 * 조회는 GET /api/users/me (A1) — 헤더에 닉네임·가입일(createdAt→KST 표기, MSG-378)·
 * 이메일(null이면 세그먼트 생략, A2)·아바타(profileImageUrl ?? 기본 이미지, MSG-378 기준 16)를
 * 표시한다. "내 활동" 카드는 MSG-395에서 실 연동했다 — 스트릭·수집률을 도감 요약과
 * 행정동 통계에서 유도한다(use-activity-query). 구 A4의 "—" 자리는 조회 전·실패 폴백으로 남았다.
 * 앱 버전은 빌드 주입 값(__APP_VERSION__, A5). 오류 게이트는 제목+안내+[다시 시도] (A3).
 * "계정" 섹션에 [계정 삭제] 행 신설 — danger 확인 모달 → DELETE /api/users/me,
 * 성공 시 세션·캐시 정리(훅 소관) 후 홈 이동 (A10·A11).
 * [로그아웃]은 기존 배선(logout API + 로컬 우선 종료 + 홈 이동) 그대로 (A12 — 코드 불변).
 */
export const ProfilePanel = () => {
  const { data, isLoading, isError, refetch } = useProfileQuery();
  // "내 활동" 두 축 (MSG-395) — 프로필 조회와 독립: 활동 조회가 늦거나 실패해도
  // 닉네임·설정은 그대로 뜨고 카드만 `—`로 남는다
  const activity = useActivityQuery();
  // 모달 열림은 스토어가 소유한다 — 사이드레일 재클릭 초기화가 패널 밖에서 닫아야 한다 (AC 16)
  const openModal = useProfileModalStore((s) => s.open);
  const setModal = useProfileModalStore((s) => s.openModal);
  const closeModal = useProfileModalStore((s) => s.close);
  const setModalOpen = (modal: "edit" | "delete") => (open: boolean) => {
    if (open) setModal(modal);
    else closeModal();
  };
  // 패널을 떠나면 모달 상태도 닫는다 — 스토어로 올린 뒤(AC 16) 로컬 state 시절의
  // "언마운트 = 초기화"가 사라져, 다른 섹션에 다녀오면 모달이 열린 채로 되돌아왔다
  useEffect(() => closeModal, [closeModal]);
  // 로그아웃·계정 삭제 후 홈으로 — 비로그인 상태로 보호 화면에 남지 않게 하고, 사이드레일
  // 활성 탭도 자연히 '홈'이 된다(getActiveNavKey가 pathname 기반)
  const navigate = useNavigate();
  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    onFinished: () => navigate(ROUTES.home),
  });

  return (
    <aside className="pointer-events-auto absolute inset-y-0 left-0 z-10 flex w-97 flex-col bg-background shadow-raised">
      <h1 className="sr-only">프로필</h1>
      {isError ? (
        <ProfileErrorState onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <p className="p-md text-fm-body text-foreground-muted">
          프로필을 불러오는 중이에요…
        </p>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto p-md scrollbar-gutter-stable">
            <ProfileHeader
              nickname={data.nickname}
              email={data.email}
              joinedDateLabel={formatJoinedDate(data.joinedAt)}
              avatarSrc={data.profileImageUrl ?? DEFAULT_PROFILE_IMAGE}
              onEdit={() => setModal("edit")}
            />

            <ProfileSection title="내 활동">
              <ActivityCard activity={activity} />
            </ProfileSection>

            {/* 포커스 순서는 DOM 순서 그대로 — [편집] → 설정 3행 → 약관 → 처리방침 → [계정 삭제] → [로그아웃] */}
            <ProfileSection title="설정">
              <SettingRow label="위치정보 동의 관리" />
              <SettingRow label="알림 설정" />
              <SettingRow label="신고 관리" />
            </ProfileSection>

            <ProfileSection title="계정">
              {/* 앱 버전은 정보 행 — 포커스 대상 아님, › 없음 (AC 8). 값은 빌드 주입 (A5) */}
              <SettingInfoRow label="앱 버전" value={__APP_VERSION__} />
              <SettingRow label="서비스 이용약관" />
              <SettingRow label="개인정보 처리방침" />
              {/* [계정 삭제] — 활성 행, 클릭 시 비가역 삭제 확인 모달 (A10) */}
              <SettingRow
                label="계정 삭제"
                tone="danger"
                onClick={() => setModal("delete")}
              />
            </ProfileSection>

            {/* [로그아웃] — logout API + 로컬 세션 종료 후 홈으로 이동 (A12 — 기존 배선 유지) */}
            <div className="mt-auto flex flex-col pt-md">
              <Button
                text="로그아웃"
                variant="danger"
                className="w-full"
                onClick={() => logout()}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut}
              />
            </div>
          </div>

          {/* 프로필 편집 모달 — 포털 렌더라 패널 DOM 밖(전면 스크림)에 뜬다 */}
          <ProfileEditModal
            open={openModal === "edit"}
            onOpenChange={setModalOpen("edit")}
            profile={data}
          />

          {/* 계정 삭제 확인 모달 (A10·A11) — 성공 시 홈 이동은 여기(라우터 보유층)서 주입 */}
          <DeleteAccountModal
            open={openModal === "delete"}
            onOpenChange={setModalOpen("delete")}
            onDeleted={() => navigate(ROUTES.home)}
          />
        </>
      )}
    </aside>
  );
};

/** 섹션 블록 — 제목(h2) + 내용. 제목 스타일은 도감 "최근 수집한 격자" 선례 */
const ProfileSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-xs">
    <h2 className="text-fm-title text-foreground">{title}</h2>
    {children}
  </section>
);

/** 오류 상태 + 재시도 (A3) — DexErrorState와 동일 패턴(제목+보조 문구+primary sm 버튼) */
const ProfileErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-md px-lg text-center">
    <div className="flex flex-col gap-xxs">
      <p className="text-fm-title text-foreground">
        프로필을 불러오지 못했어요
      </p>
      <p className="text-fm-body text-foreground-muted">
        네트워크 상태를 확인하고 다시 시도해 주세요
      </p>
    </div>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);
