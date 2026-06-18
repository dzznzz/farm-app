// 거래처(clients) 데이터 액세스 헬퍼.
// 판매처를 관리하고, 판매 입력 시 채널(online/offline)에 맞는 거래처를 선택지로 제공한다.

import { supabase } from './supabase';

export type ClientChannel = 'online' | 'offline';
export type CommissionType = '%' | '원';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  channel: ClientChannel;
  commission_type: CommissionType;
  commission_value: number;
}

const SELECT = 'id, user_id, name, channel, commission_type, commission_value';

export async function listClients(userId: string): Promise<Client[]> {
  const { data } = await supabase
    .from('clients')
    .select(SELECT)
    .eq('user_id', userId)
    .order('channel', { ascending: true })
    .order('name', { ascending: true });
  return (data as Client[] | null) ?? [];
}

/** 특정 채널(online/offline)의 거래처만. 판매 입력 구매자 선택지용. */
export async function listClientsByChannel(userId: string, channel: ClientChannel): Promise<Client[]> {
  const { data } = await supabase
    .from('clients')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('channel', channel)
    .order('name', { ascending: true });
  return (data as Client[] | null) ?? [];
}

export interface ClientInput {
  name: string;
  channel: ClientChannel;
  commissionType: CommissionType;
  commissionValue: number;
}

export async function addClient(userId: string, input: ClientInput) {
  return supabase.from('clients').insert({
    user_id: userId,
    name: input.name,
    channel: input.channel,
    commission_type: input.commissionType,
    commission_value: input.commissionValue,
  });
}

export async function updateClient(id: string, input: ClientInput) {
  return supabase.from('clients').update({
    name: input.name,
    channel: input.channel,
    commission_type: input.commissionType,
    commission_value: input.commissionValue,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function deleteClient(id: string) {
  return supabase.from('clients').delete().eq('id', id);
}
