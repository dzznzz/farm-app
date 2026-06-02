import { supabase } from './supabase';

export interface ExportRow {
  date: string;
  farm_name: string;
  crop_type: string;
  variety: string;
  size: string;
  harvest: number;
  sales: number;
  price_per_unit: number;
  revenue: number;
  commission_rate: number;
  commission_amount: number;
  extra_cost: number;
  net_profit: number;
  other: number;
}

export async function fetchMonthlyExportData(
  userId: string, year: number, month: number
): Promise<{ rows: ExportRow[]; laborTotal: number }> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const [harvestRes, salesRes, otherRes, farmsRes, laborRes] = await Promise.all([
    supabase.from('harvest_records').select('date, farm_id, crop_type, variety, size, quantity').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('sales_records').select('date, farm_id, crop_type, variety, size, quantity, price_per_unit, total_revenue, commission_rate, commission_amount, extra_cost').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('other_records').select('date, farm_id, crop_type, variety, size, quantity').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('farms').select('id, name').eq('user_id', userId),
    supabase.from('labor_records').select('labor_cost').eq('user_id', userId).gte('date', from).lte('date', to),
  ]);

  const laborTotal = laborRes.error ? 0 :
    (laborRes.data ?? []).reduce((s: number, r: any) => s + (r.labor_cost ?? 0), 0);

  const farmMap: Record<string, string> = {};
  (farmsRes.data ?? []).forEach((f: any) => { farmMap[f.id] = f.name; });

  // date|farmId|cropType|variety|size 기준으로 그룹핑
  type Group = {
    date: string; farm_name: string; crop_type: string; variety: string; size: string;
    harvests: any[]; sales: any[]; others: any[];
  };
  const grouped = new Map<string, Group>();

  const key = (r: any) =>
    `${r.date}|${r.farm_id ?? ''}|${r.crop_type ?? ''}|${r.variety ?? ''}|${r.size ?? ''}`;

  const getOrCreate = (r: any): Group => {
    const k = key(r);
    if (!grouped.has(k)) {
      grouped.set(k, {
        date: r.date,
        farm_name: farmMap[r.farm_id] ?? '',
        crop_type: r.crop_type ?? '',
        variety: r.variety ?? '',
        size: r.size ?? '',
        harvests: [], sales: [], others: [],
      });
    }
    return grouped.get(k)!;
  };

  (harvestRes.data ?? []).forEach((r: any) => getOrCreate(r).harvests.push(r));
  (salesRes.data ?? []).forEach((r: any) => getOrCreate(r).sales.push(r));
  (otherRes.data ?? []).forEach((r: any) => getOrCreate(r).others.push(r));

  const rows = Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, g]) => {
      const harvestQty = g.harvests.reduce((s, r) => s + (r.quantity ?? 0), 0);
      const salesQty   = g.sales.reduce((s, r) => s + (r.quantity ?? 0), 0);
      const revenue    = g.sales.reduce((s, r) => s + (r.total_revenue ?? 0), 0);
      const commAmt    = g.sales.reduce((s, r) => s + (r.commission_amount ?? 0), 0);
      const extraCost  = g.sales.reduce((s, r) => s + (r.extra_cost ?? 0), 0);
      const commRate   = g.sales.length > 0 ? g.sales[0].commission_rate ?? 0 : 0;
      const price      = g.sales.length > 0 ? g.sales[0].price_per_unit ?? 0 : 0;
      const otherQty   = g.others.reduce((s, r) => s + (r.quantity ?? 0), 0);
      return {
        date: g.date, farm_name: g.farm_name,
        crop_type: g.crop_type, variety: g.variety, size: g.size,
        harvest: harvestQty, sales: salesQty, price_per_unit: price,
        revenue, commission_rate: commRate, commission_amount: commAmt,
        extra_cost: extraCost, net_profit: revenue - commAmt - extraCost,
        other: otherQty,
      };
    });

  return { rows, laborTotal };
}

// ── 스프레드시트 디자인 적용 ──────────────────────────────────────────────
async function applyFormatting(accessToken: string, spreadsheetId: string, dataRowCount: number) {
  const COLS = 14;
  // 0=일자 1=농장 2=작물 3=품종 4=사이즈
  // 5=수확량 6=판매량 7=단가 8=매출 9=수수료율
  // 10=수수료 11=부수비용 12=순수익 13=기타수량
  const summaryIdx = dataRowCount + 2; // header(0) + data(1..n) + empty(n+1) + summary(n+2)

  const GREEN_DARK  = { red: 0.180, green: 0.490, blue: 0.196 }; // #2E7D32
  const AMBER_LIGHT = { red: 1.0,   green: 0.953, blue: 0.804 }; // #FFF3CD
  const GREY_LINE   = { red: 0.85,  green: 0.85,  blue: 0.85  };
  const GREEN_BORDER= { red: 0.2,   green: 0.5,   blue: 0.2   };
  const WHITE       = { red: 1, green: 1, blue: 1 };

  const range = (r0: number, r1: number, c0: number, c1: number) =>
    ({ sheetId: 0, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 });

  const requests: any[] = [
    // 헤더 고정
    { updateSheetProperties: { properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },

    // 헤더행: 초록 배경 + 흰 굵은 글씨 + 가운데 정렬
    {
      repeatCell: {
        range: range(0, 1, 0, COLS),
        cell: {
          userEnteredFormat: {
            backgroundColor: GREEN_DARK,
            textFormat: { bold: true, fontSize: 10, foregroundColor: WHITE },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    },

    // 합계행: 연한 노란 배경 + 굵게
    {
      repeatCell: {
        range: range(summaryIdx, summaryIdx + 1, 0, COLS),
        cell: {
          userEnteredFormat: {
            backgroundColor: AMBER_LIGHT,
            textFormat: { bold: true },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    },

    // 원화 포맷: 단가(7) 매출(8) 수수료(10) 부수비용(11) 순수익(12)
    ...[7, 8, 10, 11, 12].map((col) => ({
      repeatCell: {
        range: range(1, summaryIdx + 1, col, col + 1),
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    })),

    // 수수료율(9): 숫자 뒤에 % 표시 (값 5 → "5.0%")
    {
      repeatCell: {
        range: range(1, summaryIdx + 1, 9, 10),
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '0.0"%"' } } },
        fields: 'userEnteredFormat.numberFormat',
      },
    },

    // 컬럼 자동 너비 조정
    { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: COLS } } },

    // 전체 테두리: 외곽은 녹색 굵게, 내부는 회색 얇게
    {
      updateBorders: {
        range: range(0, summaryIdx + 1, 0, COLS),
        top:    { style: 'SOLID_MEDIUM', color: GREEN_BORDER },
        bottom: { style: 'SOLID_MEDIUM', color: GREEN_BORDER },
        left:   { style: 'SOLID_MEDIUM', color: GREEN_BORDER },
        right:  { style: 'SOLID_MEDIUM', color: GREEN_BORDER },
        innerHorizontal: { style: 'SOLID', color: GREY_LINE },
        innerVertical:   { style: 'SOLID', color: GREY_LINE },
      },
    },
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) console.warn('디자인 적용 실패:', await res.text());
}

// ── 스프레드시트 생성 ─────────────────────────────────────────────────────
export async function createMonthlySpreadsheet(
  accessToken: string,
  year: number,
  month: number,
  rows: ExportRow[],
  laborTotal: number = 0,
): Promise<string> {
  const title = `농장 ${year}년 ${month}월 데이터`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!createRes.ok) throw new Error('스프레드시트 생성 실패: ' + (await createRes.text()));
  const { spreadsheetId } = await createRes.json();

  const header = ['일자', '농장', '작물', '품종', '사이즈', '수확량(kg)', '판매량(kg)', '단가(원)', '매출(원)', '수수료율(%)', '수수료(원)', '부수비용(원)', '순수익(원)', '기타수량(kg)'];

  const totalRevenue    = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission_amount, 0);
  const totalExtra      = rows.reduce((s, r) => s + r.extra_cost, 0);
  const realNetProfit   = totalRevenue - totalCommission - totalExtra - laborTotal;

  const summary = [
    '', '', '', '', '월 합계',
    rows.reduce((s, r) => s + r.harvest, 0),
    rows.reduce((s, r) => s + r.sales, 0),
    '',
    totalRevenue,
    '',
    totalCommission,
    totalExtra,
    realNetProfit,
    rows.reduce((s, r) => s + r.other, 0),
  ];

  // 인건비가 있는 경우 별도 행으로 표시
  const laborRow = laborTotal > 0
    ? ['', '', '', '', '※ 인건비', '', '', '', '', '', '', laborTotal, `−${laborTotal.toLocaleString()}원 차감됨`, '']
    : null;

  const dataRows = rows.map((r) => [
    r.date, r.farm_name, r.crop_type, r.variety, r.size,
    r.harvest, r.sales, r.price_per_unit, r.revenue,
    r.commission_rate, r.commission_amount, r.extra_cost, r.net_profit, r.other,
  ]);

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [header, ...dataRows, [], summary, ...(laborRow ? [laborRow] : [])] }),
    },
  );
  if (!updateRes.ok) throw new Error('데이터 입력 실패: ' + (await updateRes.text()));

  // 디자인 적용 (실패해도 URL은 반환)
  await applyFormatting(accessToken, spreadsheetId, rows.length);

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
