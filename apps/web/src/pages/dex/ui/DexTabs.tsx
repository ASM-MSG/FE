import {
  DEX_TABS,
  DEX_TAB_LABELS,
  type DexTab,
} from "@/features/dex/model/dex-tab";

interface DexTabsProps {
  active: DexTab;
  onSelect: (tab: DexTab) => void;
}

/**
 * 도감 탭 pill (AC 1·3, MSG-122 ② 개정: 지도/뱃지 2탭 — Figma node 13399:1575의 3탭은
 * 개정 전 정본, 갤러리 탭 제거는 티켓 명시 사용자 결정 AC 20).
 * explore SortChip의 "폭 고정·색 전환" pill 시각을 따르되 a11y 역할이 달라(role="tab" vs
 * aria-pressed) 로컬 재구현한다. ui-web Chip은 active 시 체크 아이콘으로 폭이 변해 부적합.
 * 3번째 pill 사용처가 나오면 ui-web 승격을 검토한다 (스펙 승격 후보 기록).
 */
export const DexTabs = ({ active, onSelect }: DexTabsProps) => (
  <div role="tablist" aria-label="도감 탭" className="flex gap-xs">
    {DEX_TABS.map((tab) => (
      <button
        key={tab}
        type="button"
        role="tab"
        aria-selected={tab === active}
        onClick={() => onSelect(tab)}
        className={
          tab === active
            ? "min-w-10 rounded-full bg-primary px-3 py-1.5 text-fm-body-strong text-primary-foreground"
            : "min-w-10 rounded-full border border-border bg-surface-soft px-3 py-1.5 text-fm-body-strong text-foreground-body"
        }
      >
        {DEX_TAB_LABELS[tab]}
      </button>
    ))}
  </div>
);
