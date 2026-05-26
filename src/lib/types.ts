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
}

export interface BootData {
  cdSite: string;
  nmSite: string;
  dongList: DongOption[];
}
