import type { ReactNode } from "react";
import { Calendar, Home, IdCard } from "lucide-react";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import type { ConsoleNavItem } from "./console-nav";
import { OrgPermissionNotice } from "./OrgPermissionNotice";
import { OrgSidebarProfile } from "./OrgSidebarProfile";

/** 레일 섹션 — 사이드바 메뉴와 같은 계약 + 아이콘 */
export interface ConsoleRailItem extends ConsoleNavItem {
  icon: ReactNode;
}

/** 콘솔 변형(운영자·관리자)의 전체 설정 — 셸은 이 객체만 읽고 도메인 분기를 하지 않는다 */
export interface ConsoleConfig {
  /** 사이드바 제목 (고정 텍스트) */
  title: string;
  /** 레일 `<nav>` 접근 가능한 이름 */
  railLabel: string;
  rail: ConsoleRailItem[];
  menu: ConsoleNavItem[];
  /** 사이드바 제목 아래 계정 정보 슬롯 — 미지정이면 렌더 불변 (MSG-545) */
  sidebarHeader?: ReactNode;
  /** 사이드바 하단 안내 슬롯 — 미지정이면 렌더 불변 (MSG-545) */
  sidebarFooter?: ReactNode;
}

/**
 * 운영자 콘솔 설정 — SOURCE: Figma "[v2] [행사 운영자 2] 홈·신청 현황" (node 15525:8652)
 * + "레일 / OpsRail" (15551:1906). 레일 2섹션(홈·행사), 사이드바 5메뉴
 * ("내 신청 목록"은 MSG-549에서 추가 — 그전에는 레일 "행사"만 진입로였다).
 * "등록 가이드"는 대응 티켓이 없지만 자리표시로 존치한다 (질문 7 (b) 확정).
 * 사이드바 슬롯 2종(계정 정보·행사 등록 권한 안내)은 MSG-545에서 배선했다 —
 * `ADMIN_CONSOLE`은 슬롯을 주지 않아 렌더가 불변이다.
 */
export const ORG_CONSOLE: ConsoleConfig = {
  title: "행사 운영자 콘솔",
  railLabel: "운영자 콘솔 섹션",
  sidebarHeader: <OrgSidebarProfile />,
  sidebarFooter: <OrgPermissionNotice />,
  rail: [
    {
      key: "home",
      label: "홈",
      path: CONSOLE_ROUTES.orgHome,
      icon: <Home className="size-full" />,
    },
    {
      key: "events",
      label: "행사",
      path: CONSOLE_ROUTES.orgSubmissions,
      icon: <Calendar className="size-full" />,
    },
  ],
  menu: [
    {
      key: "status",
      label: "신청 현황",
      path: CONSOLE_ROUTES.orgHome,
    },
    {
      key: "submission-new",
      label: "새 행사 등록",
      path: CONSOLE_ROUTES.orgSubmissionNew,
    },
    // MSG-549: 티켓 문면의 "사이드바 '내 신청 목록' 진입"에 대응하는 항목 —
    // 접두 최장 일치라 상세·재신청 경로도 이 항목이 활성이고, 더 긴
    // `/org/submissions/new`는 계속 "새 행사 등록"이 이긴다(matches 불필요)
    {
      key: "submissions",
      label: "내 신청 목록",
      path: CONSOLE_ROUTES.orgSubmissions,
    },
    { key: "guide", label: "등록 가이드", path: CONSOLE_ROUTES.orgGuide },
    { key: "settings", label: "계정 설정", path: CONSOLE_ROUTES.orgSettings },
  ],
};

/**
 * 관리자 콘솔 설정 — SOURCE: Figma "[v2] [관리자 2] 행사 심사 큐" (node 15525:9124).
 * 레일 2섹션(계정·행사), 사이드바 2메뉴(행사 심사·승인 행사).
 */
export const ADMIN_CONSOLE: ConsoleConfig = {
  title: "관리자 콘솔",
  railLabel: "관리자 콘솔 섹션",
  rail: [
    {
      key: "accounts",
      label: "계정",
      path: CONSOLE_ROUTES.adminAccounts,
      icon: <IdCard className="size-full" />,
    },
    {
      key: "events",
      label: "행사",
      path: CONSOLE_ROUTES.adminReview,
      // 레일 "행사" 섹션이 심사 큐와 승인 행사를 함께 덮는다
      matches: [CONSOLE_ROUTES.adminEvents],
      icon: <Calendar className="size-full" />,
    },
  ],
  menu: [
    { key: "review", label: "행사 심사", path: CONSOLE_ROUTES.adminReview },
    { key: "events", label: "승인 행사", path: CONSOLE_ROUTES.adminEvents },
  ],
};
