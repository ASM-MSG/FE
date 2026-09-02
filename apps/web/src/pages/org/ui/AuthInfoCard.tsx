/**
 * 콘솔 인증 화면 하단 안내 카드 (MSG-542 — Figma 세 화면 공통 골격, 문구만 다르다):
 * 로그인 "계정이 아직 없나요?" · 설정 "왜 지금 바꿔야 하나요?" · 재설정 "이메일이 기억나지 않는다면".
 *
 * `tone`은 Figma의 실제 차이다 — 로그인 카드는 흰 배경 + 보더(surface-soft 위에서 떠 보인다),
 * 나머지 둘은 회색 채움이다. 임의 확장 지점이 아니라 지금 두 형태가 다 쓰인다.
 */
export const AuthInfoCard = ({
  title,
  lines,
  tone = "filled",
}: {
  title: string;
  lines: string[];
  tone?: "filled" | "outlined";
}) => (
  <section
    className={
      tone === "outlined"
        ? "rounded-sm border border-border bg-surface-elevated px-lg py-md"
        : "rounded-md bg-surface px-lg py-md"
    }
  >
    <h2 className="text-fm-label font-semibold text-primary">{title}</h2>
    <div className="mt-xs flex flex-col text-fm-body text-foreground-body">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  </section>
);
