import { supabase } from './supabase';

// 농장 공유(농장주/구성원 + 권한 신청) 관련 헬퍼.
// 모든 쓰기/검색은 마이그레이션 015의 SECURITY DEFINER RPC 를 통해 수행한다.

export type FarmJoinStatus = 'owner' | 'member' | 'pending' | 'none';

export interface FarmSearchResult {
  id: string;
  name: string;
  address: string | null;
  crop_type: string;
  owner_name: string | null;
  member_count: number;
  my_status: FarmJoinStatus;
}

export async function searchFarms(q: string): Promise<FarmSearchResult[]> {
  const { data, error } = await supabase.rpc('search_farms', { p_q: q.trim() });
  if (error) throw error;
  return (data ?? []) as FarmSearchResult[];
}

export async function requestFarmJoin(farmId: string): Promise<void> {
  const { error } = await supabase.rpc('request_farm_join', { p_farm: farmId });
  if (error) throw error;
}

export interface PendingRequest {
  request_id: string;
  farm_id: string;
  farm_name: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

export async function ownerPendingRequests(): Promise<PendingRequest[]> {
  const { data, error } = await supabase.rpc('owner_pending_requests');
  if (error) throw error;
  return (data ?? []) as PendingRequest[];
}

export async function approveRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_join_request', { p_req: requestId });
  if (error) throw error;
}

export async function rejectRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('reject_join_request', { p_req: requestId });
  if (error) throw error;
}

export interface FarmMemberDetail {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  role: 'owner' | 'member';
  created_at: string;
}

export async function farmMembersDetail(farmId: string): Promise<FarmMemberDetail[]> {
  const { data, error } = await supabase.rpc('farm_members_detail', { p_farm: farmId });
  if (error) throw error;
  return (data ?? []) as FarmMemberDetail[];
}

export async function removeFarmMember(farmId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_farm_member', { p_farm: farmId, p_user: userId });
  if (error) throw error;
}

export async function transferOwnership(farmId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_farm_ownership', { p_farm: farmId, p_user: userId });
  if (error) throw error;
}

// 현재 계정이 농장주인 농장 개수 (더보기 메뉴 노출 판단용)
export async function myOwnedFarmCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('farm_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'owner');
  return count ?? 0;
}

export interface OwnedFarm {
  id: string;
  name: string;
  crop_type: string;
  address: string | null;
}

// 농장주로 속한 농장 목록
export async function myOwnedFarms(userId: string): Promise<OwnedFarm[]> {
  const { data, error } = await supabase
    .from('farm_members')
    .select('role, farms(id, name, crop_type, address)')
    .eq('user_id', userId)
    .eq('role', 'owner');
  if (error) throw error;
  return (data ?? [])
    .map((r: any) => r.farms)
    .filter(Boolean)
    .map((f: any) => ({ id: f.id, name: f.name, crop_type: f.crop_type, address: f.address }));
}

// 내가 접근 가능한(소유+참여) 농장 ID 목록 — 데이터 조회 범위 산정용.
// 데이터 테이블 쿼리에서 user_id 대신 이 농장들 기준으로 조회하면
// 구성원이 공유 농장 데이터를 함께 볼 수 있다(RLS는 마이그레이션 015가 이미 허용).
export async function accessibleFarmIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('farm_members')
    .select('farm_id')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.farm_id).filter(Boolean);
}

export interface MyFarm {
  id: string;
  name: string;
  crop_type: string;
  is_primary: boolean;
  role: 'owner' | 'member';
}

// 내가 속한 모든 농장(소유+참여) — 입력/통계 농장 선택용.
export async function myFarms(userId: string): Promise<MyFarm[]> {
  const { data, error } = await supabase
    .from('farm_members')
    .select('role, farms(id, name, crop_type, is_primary)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? [])
    .filter((r: any) => r.farms)
    .map((r: any) => ({
      id: r.farms.id,
      name: r.farms.name,
      crop_type: r.farms.crop_type,
      is_primary: r.farms.is_primary ?? false,
      role: r.role,
    }))
    // 대표 농장 우선, 그다음 이름순
    .sort((a: MyFarm, b: MyFarm) =>
      (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.name.localeCompare(b.name));
}

export interface JoinedFarm extends OwnedFarm {
  role: 'owner' | 'member';
}

// 내가 참여 중인(구성원) 농장 목록 — 농장주가 아닌 것만
export async function myJoinedFarms(userId: string): Promise<JoinedFarm[]> {
  const { data, error } = await supabase
    .from('farm_members')
    .select('role, farms(id, name, crop_type, address)')
    .eq('user_id', userId)
    .eq('role', 'member');
  if (error) throw error;
  return (data ?? [])
    .filter((r: any) => r.farms)
    .map((r: any) => ({ id: r.farms.id, name: r.farms.name, crop_type: r.farms.crop_type, address: r.farms.address, role: r.role }));
}
