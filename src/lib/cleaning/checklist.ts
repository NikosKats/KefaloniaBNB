import type { SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_CHECKLIST: string[] = [
  'Vacuum all rooms',
  'Mop hard floors',
  'Clean bathrooms (toilets, sinks, showers)',
  'Change bed linen',
  'Wipe kitchen surfaces & appliances',
  'Empty rubbish bins',
  'Check & restock toiletries',
  'Check & restock kitchen supplies',
  'Report any damages',
];

export async function seedDefaultChecklist(supabase: SupabaseClient, jobId: string) {
  const items = DEFAULT_CHECKLIST.map((label, i) => ({
    job_id: jobId,
    label,
    sort_order: i,
    is_done: false,
  }));
  await supabase.from('job_checklist_items').insert(items);
}

export async function getJobChecklist(supabase: SupabaseClient, jobId: string) {
  const { data } = await supabase
    .from('job_checklist_items')
    .select('*')
    .eq('job_id', jobId)
    .order('sort_order');
  return data ?? [];
}

export async function toggleChecklistItem(
  supabase: SupabaseClient,
  itemId: string,
  isDone: boolean
) {
  return supabase
    .from('job_checklist_items')
    .update({ is_done: isDone })
    .eq('id', itemId);
}

export async function addChecklistItem(
  supabase: SupabaseClient,
  jobId: string,
  label: string,
  sortOrder: number
) {
  return supabase
    .from('job_checklist_items')
    .insert({ job_id: jobId, label, sort_order: sortOrder, is_done: false })
    .select()
    .single();
}

export async function deleteChecklistItem(supabase: SupabaseClient, itemId: string) {
  return supabase.from('job_checklist_items').delete().eq('id', itemId);
}
