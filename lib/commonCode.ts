// common_code 통합 코드 테이블 데이터 액세스 헬퍼.
//
// 분리돼 있던 crop_types / varieties_master / sizes_master / harvest_units /
// expense_types 를 하나의 common_code 로 합치면서, 화면 코드가 테이블 스키마를
// 직접 알지 않도록 이 모듈로 질의를 중앙화한다.
//
// 규칙
//  · main_code : 'crop' | 'vari' | 'size' | 'unit' | 'exps'
//  · desc_code : main_code 안에서 0-패딩 3자리 ('001'..). (main_code,desc_code) 유일.
//  · 품종/사이즈는 부모가 작물 → hpos_main_code='crop', hpos_desc_code=작물 desc_code.

import { supabase } from './supabase';

export const TABLE = 'common_code';

export type MainCode = 'crop' | 'vari' | 'size' | 'unit' | 'exps';

export interface CommonCodeRow {
  id: string;
  main_code: string;
  desc_code: string;
  name: string;
  sort_order: number | null;
  hpos_main_code: string | null;
  hpos_desc_code: string | null;
  info: string | null;
}

const SELECT = 'id, main_code, desc_code, name, sort_order, hpos_main_code, hpos_desc_code, info';

/** 한 분류(main_code)의 코드 목록 (flat). 작물·단위·비용항목에 사용. */
export async function listCodes(main: MainCode): Promise<CommonCodeRow[]> {
  const { data } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('main_code', main)
    .order('sort_order', { nullsFirst: true })
    .order('desc_code');
  return (data as CommonCodeRow[] | null) ?? [];
}

/** 부모 코드 기준 하위 목록. 작물의 품종/사이즈 조회에 사용. */
export async function listChildren(
  main: MainCode,
  parentMain: MainCode,
  parentDesc: string,
): Promise<CommonCodeRow[]> {
  const { data } = await supabase
    .from(TABLE)
    .select(SELECT)
    .eq('main_code', main)
    .eq('hpos_main_code', parentMain)
    .eq('hpos_desc_code', parentDesc)
    .order('sort_order', { nullsFirst: true })
    .order('desc_code');
  return (data as CommonCodeRow[] | null) ?? [];
}

/** 작물 이름 → desc_code (품종/사이즈가 작물 '이름'만 아는 화면용). */
export async function getCropCode(cropName: string): Promise<string | null> {
  const { data } = await supabase
    .from(TABLE)
    .select('desc_code')
    .eq('main_code', 'crop')
    .eq('name', cropName)
    .maybeSingle();
  return (data as { desc_code: string } | null)?.desc_code ?? null;
}

/** 작물 이름으로 품종 목록 조회 (입력 폼용). */
export async function listVarietiesByCropName(cropName: string): Promise<CommonCodeRow[]> {
  const code = await getCropCode(cropName);
  if (!code) return [];
  return listChildren('vari', 'crop', code);
}

/** 작물 이름으로 사이즈 목록 조회 (입력 폼용). */
export async function listSizesByCropName(cropName: string): Promise<CommonCodeRow[]> {
  const code = await getCropCode(cropName);
  if (!code) return [];
  return listChildren('size', 'crop', code);
}

/** main_code 안에서 다음 desc_code('001'..) 계산. */
async function nextDescCode(main: MainCode): Promise<string> {
  const { data } = await supabase.from(TABLE).select('desc_code').eq('main_code', main);
  const max = (data as { desc_code: string }[] | null ?? []).reduce(
    (m, r) => Math.max(m, parseInt(r.desc_code, 10) || 0),
    0,
  );
  return String(max + 1).padStart(3, '0');
}

export interface AddCodeParams {
  main: MainCode;
  name: string;
  sortOrder: number;
  parentMain?: MainCode;
  parentDesc?: string;
  info?: string | null;
}

/** 코드 추가. desc_code 는 자동 부여. 반환값은 supabase insert 결과. */
export async function addCode(params: AddCodeParams) {
  const desc_code = await nextDescCode(params.main);
  return supabase.from(TABLE).insert({
    main_code: params.main,
    desc_code,
    name: params.name,
    sort_order: params.sortOrder,
    hpos_main_code: params.parentMain ?? null,
    hpos_desc_code: params.parentDesc ?? null,
    info: params.info ?? null,
  });
}

/** 코드 삭제 (id 기준). */
export async function deleteCode(id: string) {
  return supabase.from(TABLE).delete().eq('id', id);
}
