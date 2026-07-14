import { Button } from "@fillmap/ui-web";
import {
  palette,
  semantic,
  typography,
  type ButtonVariant,
} from "@fillmap/design-tokens";

const buttonVariants: ButtonVariant[] = ["primary", "secondary", "danger"];

/** 디자인 시스템 동작 확인용 데모 페이지 — 실제 화면 구현 시 pages/로 대체 */
function App() {
  return (
    <main className="mx-auto flex max-w-240 flex-col gap-section p-xl">
      <header className="flex flex-col gap-xs">
        <h1 className="text-fm-display">FillMap Design System</h1>
        <p className="text-fm-body text-muted-foreground">
          packages/design-tokens · tailwind-preset · ui-web 동작 확인 데모
        </p>
      </header>

      <section className="flex flex-col gap-md">
        <h2 className="text-fm-heading">Button — Figma variant 1:1</h2>
        <div className="flex flex-wrap items-center gap-sm">
          {buttonVariants.map((v) => (
            <Button key={v} text={v} variant={v} />
          ))}
          {buttonVariants.map((v) => (
            <Button key={`${v}-sm`} text={v} variant={v} size="sm" />
          ))}
          <Button text="disabled" variant="primary" disabled />
        </div>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="text-fm-heading">Colors — Semantic</h2>
        <div className="flex flex-wrap gap-sm">
          {Object.entries(semantic).map(([name, hex]) => (
            <div
              key={name}
              className="flex w-33 flex-col gap-xxs rounded-sm border border-border p-xs"
            >
              <div
                className="h-10 rounded-xs border border-border"
                style={{ backgroundColor: hex }}
              />
              <span className="text-fm-label">{name}</span>
              <span className="text-fm-caption text-muted-foreground">{hex}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="text-fm-heading">Colors — Primitives</h2>
        <div className="flex flex-wrap gap-sm">
          {Object.entries(palette).map(([name, hex]) => (
            <div
              key={name}
              className="flex w-26 flex-col gap-xxs rounded-sm border border-border p-xs"
            >
              <div
                className="h-8 rounded-xs border border-border"
                style={{ backgroundColor: hex }}
              />
              <span className="text-fm-caption">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="text-fm-heading">Typography</h2>
        <div className="flex flex-col gap-sm">
          <p className="text-fm-display">Display · 필맵에서 지금 이 순간을 기록해요</p>
          <p className="text-fm-heading">Heading · 필맵에서 지금 이 순간을 기록해요</p>
          <p className="text-fm-title">Title · 필맵에서 지금 이 순간을 기록해요</p>
          <p className="text-fm-base">Base · 필맵에서 지금 이 순간을 기록해요</p>
          <p className="text-fm-body-strong">Body Strong · 필맵에서 지금 이 순간을 기록해요</p>
          <p className="text-fm-body">Body · 필맵에서 지금 이 순간을 기록해요</p>
          <p className="text-fm-label">Label · 필맵에서 지금 이 순간을 기록해요</p>
          <p className="text-fm-caption">Caption · 필맵에서 지금 이 순간을 기록해요</p>
        </div>
        <p className="text-fm-caption text-muted-foreground">
          토큰 {Object.keys(typography).length}종 · Inter Variable
        </p>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="text-fm-heading">Shadow / Radius</h2>
        <div className="flex flex-wrap gap-lg">
          <div className="flex h-24 w-33 items-center justify-center rounded-md bg-surface-elevated shadow-raised text-fm-label">raised · md</div>
          <div className="flex h-24 w-33 items-center justify-center rounded-lg bg-surface-elevated shadow-sheet text-fm-label">sheet · lg</div>
          <div className="flex h-24 w-33 items-center justify-center rounded-xl bg-surface-elevated shadow-fab text-fm-label">fab · xl</div>
          <div className="flex h-24 w-33 items-center justify-center rounded-full bg-surface-elevated shadow-toast text-fm-label">toast · full</div>
          <div className="flex h-24 w-33 items-center justify-center rounded-md bg-surface-elevated shadow-modal text-fm-label">modal · md</div>
        </div>
      </section>
    </main>
  );
}

export default App;
