import type { ReactNode } from "react";
import { Button } from "@fillmap/ui-web";
import { formatJoinedDate } from "@/features/profile/model/profile-format";
import { useProfileQuery } from "@/features/profile/model/use-profile-query";
import { ActivityCard } from "./ui/ActivityCard";
import { ProfileHeader } from "./ui/ProfileHeader";
import { SettingInfoRow, SettingRow } from "./ui/SettingRow";

/**
 * 프로필 패널 (MSG-124) — 지속 셸(MapShell) 지도 위 388px 좌측 오버레이 (AC 1).
 * Figma node 13399:2106은 지도 위 플로팅 카드(400px)지만, 티켓 명시 결정으로
 * 홈·탐색·도감과 동일한 전고 사이드탭(w-97) 패턴을 따른다 — Figma에서는 섹션 구성·콘텐츠만.
 * 구성: 프로필 헤더 → "내 활동" 카드 → "설정" 3행 → "계정" 3행(앱 버전은 정보 행) → [로그아웃].
 * 전부 mock이고 › 행·[편집]·[로그아웃]은 렌더만 — 실동작 없음 (핸들러 미배선, A4·A5).
 * 본문은 패널 내부 세로 스크롤(AC 11), [로그아웃]은 본문 마지막 항목 + 콘텐츠가 짧으면
 * mt-auto로 패널 하단 정렬 (A6). 로딩/오류 게이트는 use-dex-query 패턴 미러링 (A7).
 */
export const ProfilePanel = () => {
  const { data, isLoading, isError, refetch } = useProfileQuery();

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
        <div className="flex min-h-0 flex-1 flex-col gap-lg overflow-y-auto p-md scrollbar-gutter-stable">
          <ProfileHeader
            nickname={data.nickname}
            email={data.email}
            joinedDateLabel={formatJoinedDate(data.joinedAt)}
          />

          <ProfileSection title="내 활동">
            <ActivityCard
              streakDays={data.streakDays}
              collectionRate={data.collectionRate}
            />
          </ProfileSection>

          {/* 포커스 순서는 DOM 순서 그대로 — [편집] → 설정 3행 → 약관 → 처리방침 → [로그아웃] (AC 10) */}
          <ProfileSection title="설정">
            <SettingRow label="위치정보 동의 관리" />
            <SettingRow label="알림 설정" />
            <SettingRow label="신고 관리" />
          </ProfileSection>

          <ProfileSection title="계정">
            {/* 앱 버전은 정보 행 — 포커스 대상 아님, › 없음 (AC 8). 티켓·Figma 순서상 첫 행이며
                비포커스라 AC 10 포커스 순회(약관 → 처리방침)에는 관여하지 않는다 */}
            <SettingInfoRow label="앱 버전" value={data.appVersion} />
            <SettingRow label="서비스 이용약관" />
            <SettingRow label="개인정보 처리방침" />
          </ProfileSection>

          {/* [로그아웃] — danger 활성 외관 + 핸들러 미배선(클릭 no-op) (AC 9, A5·A6) */}
          <div className="mt-auto flex flex-col pt-md">
            <Button text="로그아웃" variant="danger" className="w-full" />
          </div>
        </div>
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

/** 오류 상태 + 재시도 (A7) — DexErrorState와 동일 패턴(제목+보조 문구+primary sm 버튼) */
const ProfileErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-md px-lg text-center">
    <div className="flex flex-col gap-xxs">
      <p className="text-fm-title text-foreground">프로필을 불러오지 못했어요</p>
      <p className="text-fm-body text-foreground-muted">
        네트워크 상태를 확인하고 다시 시도해 주세요
      </p>
    </div>
    <Button text="다시 시도" variant="primary" size="sm" onClick={onRetry} />
  </div>
);
