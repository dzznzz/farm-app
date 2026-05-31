import { supabase } from './supabase';

export interface ExportRow {
  date: string;
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

export async function fetchMonthlyExportData(userId: string, year: number, month: number): Promise<ExportRow[]> {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const [harvestRes, salesRes, otherRes] = await Promise.all([
    supabase.from('harvest_records').select('date, crop_type, variety, size, quantity').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('sales_records').select('date, crop_type, variety, size, quantity, price_per_unit, total_revenue, commission_rate, commission_amount, extra_cost').eq('user_id', userId).gte('date', from).lte('date', to),
    supabase.from('other_records').select('date, crop_type, variety, size, quantity').eq('user_id', userId).gte('date', from).lte('date', to),
  ]);

  const dateSet = new Set<string>();
  (harvestRes.data ?? []).forEach((r: any) => dateSet.add(r.date));
  (salesRes.data ?? []).forEach((r: any) => dateSet.add(r.date));
  (otherRes.data ?? []).forEach((r: any) => dateSet.add(r.date));

  const rows: ExportRow[] = [];

  const harvestByDate: Record<string, any[]> = {};
  (harvestRes.data ?? []).forEach((r: any) => {
    if (!harvestByDate[r.date]) harvestByDate[r.date] = [];
    harvestByDate[r.date].push(r);
  });

  const salesByDate: Record<string, any[]> = {};
  (salesRes.data ?? []).forEach((r: any) => {
    if (!salesByDate[r.date]) salesByDate[r.date] = [];
    salesByDate[r.date].push(r);
  });

  const otherByDate: Record<string, any[]> = {};
  (otherRes.data ?? []).forEach((r: any) => {
    if (!otherByDate[r.date]) otherByDate[r.date] = [];
    otherByDate[r.date].push(r);
  });

  const allDates = Array.from(dateSet).sort();

  for (const date of allDates) {
    const harvests = harvestByDate[date] ?? [];
    const sales = salesByDate[date] ?? [];
    const others = otherByDate[date] ?? [];

    const allRecords = [
      ...harvests.map((r) => ({ date: r.date, crop_type: r.crop_type ?? '', variety: r.variety ?? '', size: r.size ?? '' })),
      ...sales.map((r) => ({ date: r.date, crop_type: r.crop_type ?? '', variety: r.variety ?? '', size: r.size ?? '' })),
      ...others.map((r) => ({ date: r.date, crop_type: r.crop_type ?? '', variety: r.variety ?? '', size: r.size ?? '' })),
    ];

    const keys = new Set(allRecords.map((r) => `${r.crop_type}|${r.variety}|${r.size}`));

    for (const key of keys) {
      const [crop_type, variety, size] = key.split('|');
      const h = harvests.filter((r: any) => (r.crop_type ?? '') === crop_type && (r.variety ?? '') === variety && (r.size ?? '') === size);
      const s = sales.filter((r: any) => (r.crop_type ?? '') === crop_type && (r.variety ?? '') === variety && (r.size ?? '') === size);
      const o = others.filter((r: any) => (r.crop_type ?? '') === crop_type && (r.variety ?? '') === variety && (r.size ?? '') === size);

      const harvestQty = h.reduce((sum: number, r: any) => sum + (r.quantity ?? 0), 0);
      const salesQty = s.reduce((sum: number, r: any) => sum + (r.quantity ?? 0), 0);
      const revenue = s.reduce((sum: number, r: any) => sum + (r.total_revenue ?? 0), 0);
      const commissionAmt = s.reduce((sum: number, r: any) => sum + (r.commission_amount ?? 0), 0);
      const extraCost = s.reduce((sum: number, r: any) => sum + (r.extra_cost ?? 0), 0);
      const commissionRate = s.length > 0 ? s[0].commission_rate ?? 0 : 0;
      const pricePerUnit = s.length > 0 ? s[0].price_per_unit ?? 0 : 0;
      const otherQty = o.reduce((sum: number, r: any) => sum + (r.quantity ?? 0), 0);

      rows.push({
        date, crop_type, variety, size,
        harvest: harvestQty,
        sales: salesQty,
        price_per_unit: pricePerUnit,
        revenue,
        commission_rate: commissionRate,
        commission_amount: commissionAmt,
        extra_cost: extraCost,
        net_profit: revenue - commissionAmt - extraCost,
        other: otherQty,
      });
    }
  }

  return rows;
}

export async function createMonthlySpreadsheet(
  accessToken: string,
  year: number,
  month: number,
  rows: ExportRow[]
): Promise<string> {
  const title = `농장 ${year}년 ${month}월 데이터`;

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!createRes.ok) throw new Error('스프레드시트 생성 실패: ' + (await createRes.text()));
  const { spreadsheetId } = await createRes.json();

  const header = ['일자', '작물', '품종', '사이즈', '수확량(kg)', '판매량(kg)', '단가(원)', '매출(원)', '수수료율(%)', '수수료(원)', '부수비용(원)', '순수익(원)', '기타수량(kg)'];

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commission_amount, 0);
  const totalExtra = rows.reduce((s, r) => s + r.extra_cost, 0);
  const summary = ['', '', '', '월 합계', rows.reduce((s, r) => s + r.harvest, 0), rows.reduce((s, r) => s + r.sales, 0), '', totalRevenue, '', totalCommission, totalExtra, totalRevenue - totalCommission - totalExtra, rows.reduce((s, r) => s + r.other, 0)];

  const dataRows = rows.map((r) => [r.date, r.crop_type, r.variety, r.size, r.harvest, r.sales, r.price_per_unit, r.revenue, r.commission_rate, r.commission_amount, r.extra_cost, r.net_profit, r.other]);

  const values = [header, ...dataRows, [], summary];

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!updateRes.ok) throw new Error('데이터 입력 실패: ' + (await updateRes.text()));

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
}
