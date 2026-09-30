import { supabase } from './supabase';

const TABLE = 'inscriptions';
const PAGE_SIZE = 10;

export async function submitRegistration(values, photo) {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
  let photoPath = null;
  if (photo) {
    const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    photoPath = `portraits/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('portraits').upload(photoPath, photo, { contentType: photo.type, upsert: false });
    if (uploadError) throw uploadError;
  }
  const payload = { ...values, adresse: [values.adresse, values.pays, values.ville].filter(Boolean).join(', '), photo_url: photoPath };
  delete payload.pays;
  delete payload.ville;
  const { error } = await supabase.from(TABLE).insert(payload);
  if (error && photoPath) {
    const { error: cleanupError } = await supabase.storage.from('portraits').remove([photoPath]);
    if (cleanupError) console.error('Cleanup failed for uploaded portrait:', cleanupError.message);
  }
  if (error) throw error;
}

export async function fetchInscriptions({ page = 0, search = '', ville = '', niveau = '', ascending = false } = {}) {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
  const from = page * PAGE_SIZE;
  const { data, error } = await supabase.rpc('admin_list_inscriptions', {
    p_search: search.trim() || null,
    p_ville: ville || null,
    p_niveau: niveau || null,
    p_ascending: ascending,
    p_offset: from,
    p_limit: PAGE_SIZE,
  });
  if (error) throw error;
  let rows = data ?? [];
  if (rows.length) return { rows, count: Number(rows[0].total_count ?? 0), pageSize: PAGE_SIZE };
  if (page > 0) return { rows, count: page * PAGE_SIZE, pageSize: PAGE_SIZE };
  const { data: countData, error: countError } = await supabase.rpc('admin_count_inscriptions');
  if (countError) throw countError;
  return { rows, count: Number(countData ?? 0), pageSize: PAGE_SIZE };
}

export async function fetchAllInscriptions() {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
  const results = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.rpc('admin_export_inscriptions', { p_offset: start, p_limit: 1000 });
    if (error) throw error;
    results.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return results;
}


export async function getInscriptionsFilterOptions() {
  if (!supabase) return { villes: [], niveaux: [] };
  let villes = [];
  let niveaux = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase.from(TABLE).select('adresse,niveau').order('id').range(start, start + 999);
    if (error) throw error;
    villes.push(...(data ?? []).map(row => row.adresse?.split(',').at(-1)?.trim()).filter(Boolean));
    niveaux.push(...(data ?? []).map(row => row.niveau).filter(Boolean));
    if ((data ?? []).length < 1000) break;
  }
  return { villes: [...new Set(villes)].sort(), niveaux: [...new Set(niveaux)].sort() };
}

export async function getPhotoUrl(path) {
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage.from('portraits').createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function updateInscription(id, values) {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
  const { error } = await supabase.from(TABLE).update(values).eq('id', id);
  if (error) throw error;
}

export async function deleteInscription(id) {
  if (!supabase) throw new Error('Supabase n’est pas configuré.');
  const { data: existing, error: readError } = await supabase.from(TABLE).select('photo_url').eq('id', id).single();
  if (readError) throw readError;
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  if (existing?.photo_url) {
    const { error: cleanupError } = await supabase.storage.from('portraits').remove([existing.photo_url]);
    if (cleanupError) console.error('Cleanup failed for deleted portrait:', cleanupError.message);
  }
}
