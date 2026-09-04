import { Button, Input, Toast } from "@fillmap/ui-web";

/**
 * SOURCE: Figma "[v2] [행사 운영자 5] 계정 설정" (15651:2974) — 카드 1 "로그인 정보".
 *
 * 아이디(공식 이메일)는 기관 인증의 근거라 **읽기 전용**이고, 변경은 관리자 승인 경로만
 * 있다 (MSG-544 AC 1·8·9). 승인 대기 안내는 **세션 로컬 표시**다 — org 쪽 대기 요청 조회
 * API가 없어 새로고침하면 사라진다(스펙 질문 2 승인 사항, BE 환류 후보).
 *
 * 대기 중에도 "이메일 변경 요청" 버튼을 남긴다: 서버가 마지막 요청으로 갱신하므로
 * 재요청이 정상 동작이다 (AC 9).
 *
 * 시안의 "마지막 변경 2026. 9. 18."은 렌더할 데이터가 없어 미구현이다 —
 * `OrgProfileResponseDto`에 passwordChangedAt이 없다(추정 3, BE 환류 후보).
 */
export const SettingsLoginCard = ({
  email,
  pendingEmail,
  onRequestEmailChange,
  onChangePassword,
}: {
  email: string;
  /** 이번 세션에서 접수된 변경 요청 이메일 — 없으면 null */
  pendingEmail: string | null;
  onRequestEmailChange: () => void;
  onChangePassword: () => void;
}) => (
  <section className="rounded-md border border-border bg-surface-elevated">
    <h2 className="border-b border-border px-lg py-md text-fm-title text-foreground">
      로그인 정보
    </h2>
    <div className="flex flex-col px-lg py-md">
      <label className="flex flex-col gap-xs">
        <span className="text-fm-label text-foreground-body">
          공식 이메일 (아이디)
        </span>
        <Input readOnly value={email} className="bg-surface" />
      </label>
      <p className="mt-sm text-fm-caption text-foreground-muted">
        기관 인증에 사용된 주소라 직접 바꿀 수 없습니다. 담당자가 바뀌었다면
        변경을 요청해 주세요.
      </p>
      {pendingEmail !== null && (
        <Toast
          variant="light"
          className="mt-md"
          title="관리자 승인 대기"
          description={`${pendingEmail}로 변경 요청이 접수됐습니다. 관리자가 승인하면 새 이메일로 로그인하게 됩니다.`}
        />
      )}
      <Button
        text="이메일 변경 요청"
        variant="secondary"
        size="sm"
        onClick={onRequestEmailChange}
        className="mt-md self-start border border-border"
      />
    </div>
    <div className="flex items-center justify-between gap-md border-t border-border px-lg py-md">
      <span className="text-fm-label text-foreground-body">비밀번호</span>
      <Button
        text="비밀번호 변경"
        variant="secondary"
        size="sm"
        onClick={onChangePassword}
        className="border border-border"
      />
    </div>
  </section>
);
