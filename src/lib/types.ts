export type DongOption = { dong: string; nmDong: string };
export type HoOption = { ho: string };

export type FlawCategory = 'received' | 'workDone' | 'reAccepted' | 'finalDone';

export const CATEGORY_LABEL: Record<FlawCategory, string> = {
  received: '접수',
  workDone: '작업완료',
  reAccepted: '재접수',
  finalDone: '최종완료',
};

export const CATEGORY_ORDER: FlawCategory[] = ['received', 'workDone', 'reAccepted', 'finalDone'];

export interface FlawItem {
  noIdx: number;
  dfctCnts: string | null;
  nmLoc: string | null;
  nmRgon: string | null;
  nmDfctCaus: string | null;
  nmDfctCl: string | null;
  nmCstCpny: string | null;
  nmWrkPrsn: string | null;
  cdHndlStat: string;
  cdRcptPhs: string | null;
  dtRcpt: string | null;
  dtWrk: string | null;
  dtCplt: string | null;
  ynReRcpt: string | null;
  ynImg: string | null;
  workMemo: string | null;
  customerMemo: string | null;
  dong: string;
  ho: string;
  nmApltPrsn: string | null;
  images: string[];
  category: FlawCategory;
}

export interface SessionInfo {
  cdSite: string;
  dong: string;
  displayDong: string;
  ho: string;
  nmCstm: string;
  noMphn: string;
  nmSite: string;
  isAdmin: boolean;
}

export interface BootData {
  cdSite: string;
  nmSite: string;
  dongList: DongOption[];
}

// ----- 점검등록 (inspection registration) -----

/** One selectable code option. `parent` is the parent-level name token used for cascading. */
export interface CodeOption {
  code: number;
  name: string;
  parent: string; // empty for level 1 (room)
}

export interface InspectBootstrap {
  cdSite: string;
  dong: string;
  displayDong: string;
  ho: string;
  nmCstm: string;
  noMphn: string;
  tppgPrefix: string | null;
  voiceEnabled: boolean;
  reRequestEnabled: boolean;
  rooms: CodeOption[]; // 실  (level 1, already filtered to the unit's floor plan)
  parts: CodeOption[]; // 부위 (level 2)
  details: CodeOption[]; // 세부공종 (level 3)
  works: CodeOption[]; // 공종 (level 4)
  types: CodeOption[]; // 점검유형 (level 5)
  /** 공종 name -> 시공사 name (from AS warranty table) */
  contractorByWork: Record<string, string>;
  existingCount: number;
}

export interface AiVerifyInput {
  nmLoc: string;
  nmRgon: string;
  nmDfctCaus: string;
  nmDfctCl: string;
  nmDfctType: string;
  sttText: string;
}

export interface AiVerifyResult {
  resultOfLlm: string | null;
  typeUnique: boolean;
  locRgonUnique: boolean;
  dfctCausUnique: boolean;
  nmLoc: string | null;
  nmRgon: string | null;
  nmDfctCaus: string | null;
  nmDfctCl: string | null;
  nmDfctType: string | null;
}

export interface InspectSubmitInput {
  cdLoc: number;
  cdRgon: number;
  cdDfctCaus: number;
  cdDfctCl: number;
  cdDfctType: number;
  nmLoc: string;
  nmRgon: string;
  nmDfctCaus: string;
  nmDfctCl: string;
  nmDfctType: string;
  dfctCnts: string;
  image1: string; // data URL (전체)
  image2: string; // data URL (근접)
  resultOfLlm?: string | null;
  nmCstCpny?: string | null;
}
