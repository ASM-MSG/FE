/** 아직 티켓이 착수되지 않은 섹션의 임시 페이지 — 각 섹션 구현 시 대체 */
export const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex h-full flex-col items-center justify-center gap-xs">
    <h1 className="text-fm-heading">{title}</h1>
    <p className="text-fm-body text-muted-foreground">준비 중인 페이지예요</p>
  </div>
);
