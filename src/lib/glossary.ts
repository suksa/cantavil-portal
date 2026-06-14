// Plain-language explanations for the inspection vocabulary residents see on
// each card. Pure static content — rendered by the 용어집 tooltip/modal.

export interface GlossaryEntry {
  term: string;
  desc: string;
}

export const STATUS_GLOSSARY: GlossaryEntry[] = [
  { term: '접수', desc: '하자가 등록되어 시공사 확인을 기다리는 단계입니다.' },
  { term: '작업완료', desc: '시공사가 보수 작업을 마친 단계입니다. 직접 확인 후 미흡하면 "재등록"할 수 있어요.' },
  { term: '재접수', desc: '재보수를 요청해 다시 처리 중인 단계입니다.' },
  { term: '최종완료', desc: '보수와 확인이 모두 끝나 종결된 단계입니다.' },
];

export const TERM_GLOSSARY: GlossaryEntry[] = [
  { term: '실 (위치)', desc: '하자가 발견된 공간이에요. 예) 거실, 안방, 주방, 욕실.' },
  { term: '부위', desc: '실 안에서 하자가 있는 세부 위치예요. 예) 바닥, 벽, 천장, 창호.' },
  { term: '공종', desc: '하자와 관련된 공사 종류예요. 예) 도배, 타일, 도장, 가구.' },
  { term: '세부공종 / 원인', desc: '공종 안에서의 구체적인 하자 원인이에요. 예) 들뜸, 오염, 파손.' },
  { term: '유형', desc: '하자의 성격을 분류한 값이에요. 점검 유형에 따라 처리 방식이 달라질 수 있어요.' },
  { term: '시공사', desc: '해당 하자를 보수하는 담당 협력업체예요.' },
];
