import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownAZ, ArrowLeft, ChevronLeft, ChevronRight, Download, Eye, FileSpreadsheet, FilterX, LoaderCircle, LockKeyhole, LogOut, Pencil, Search, ShieldCheck, Trash2, UserRoundPlus, Users, X } from 'lucide-react';
import { supabase, isConfigured } from '../services/supabase';
import { deleteInscription, fetchAllInscriptions, fetchInscriptions, getInscriptionsFilterOptions, getPhotoUrl, updateInscription } from '../services/inscriptions';
const loadExcelExporter = () => import('../utils/exportExcel');

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [ville, setVille] = useState('');
  const [niveau, setNiveau] = useState('');
  const [ascending, setAscending] = useState(false);
  const [options, setOptions] = useState({ villes: [], niveaux: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photoUrls, setPhotoUrls] = useState({});
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true); setError('');
    try {
      const [result, filterOptions] = await Promise.all([fetchInscriptions({ page, search, ville, niveau, ascending }), getInscriptionsFilterOptions()]);
      setRows(result.rows); setTotal(result.count); setOptions(filterOptions);
      const signed = await Promise.all(result.rows.filter(row => row.photo_url).map(async row => [row.id, await getPhotoUrl(row.photo_url)]));
      setPhotoUrls(Object.fromEntries(signed.filter(([, url]) => url)));
    } catch (e) { setError(e.message || 'Impossible de charger les inscriptions.'); }
    finally { setLoading(false); }
  }, [session, page, search, ville, niveau, ascending]);
  useEffect(() => { load(); }, [load]);

  async function signIn(event) {
    event.preventDefault(); setBusy(true); setLoginError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword(login);
      if (authError) setLoginError('Connexion impossible. Vérifiez votre e-mail et votre mot de passe.');
    } catch {
      setLoginError('Connexion impossible pour le moment. Vérifiez votre réseau puis réessayez.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() { await supabase.auth.signOut(); setRows([]); }
  function applySearch(event) { event.preventDefault(); setPage(0); setSearch(searchInput.trim()); }
  async function remove(row) {
    if (!window.confirm(`Supprimer définitivement l’inscription de ${row.prenoms} ${row.nom} ?`)) return;
    try { await deleteInscription(row.id); setSelected(null); await load(); }
    catch (e) { setError(e.message || 'Suppression impossible.'); }
  }
  async function saveEdit(event) {
    event.preventDefault(); setSaving(true);
    const photo = edit.photoFile;
    let photoPath = edit.photo_url;
    try {
      if (photo) {
        const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
        photoPath = `portraits/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('portraits').upload(photoPath, photo, { contentType: photo.type, upsert: false });
        if (uploadError) throw uploadError;
      }
      await updateInscription(edit.id, { nom: edit.nom.trim(), prenoms: edit.prenoms.trim(), telephone: edit.telephone.trim(), email: edit.email.trim(), sexe: edit.sexe, date_naissance: edit.date_naissance, adresse: edit.adresse.trim(), niveau: edit.niveau.trim(), etablissement: edit.etablissement.trim(), ...(photo ? { photo_url: photoPath } : {}) });
      if (photo && edit.photo_url) {
        const { error: cleanupError } = await supabase.storage.from('portraits').remove([edit.photo_url]);
        if (cleanupError) console.error('Cleanup failed for replaced portrait:', cleanupError.message);
      }
      setEdit(null); await load();
    } catch (e) {
      if (photoPath && photo) {
        const { error: cleanupError } = await supabase.storage.from('portraits').remove([photoPath]);
        if (cleanupError) console.error('Cleanup failed for failed portrait upload:', cleanupError.message);
      }
      setError(e.message || 'Modification impossible.');
    }
    finally { setSaving(false); }
  }
  async function exportAll() {
    try {
      const all = await fetchAllInscriptions();
      const { exportInscriptions } = await loadExcelExporter();
      await exportInscriptions(all);
    } catch (e) { setError(e.message || 'Export impossible.'); }
  }

  if (!isConfigured) return <div className="admin-screen"><div className="login-card"><Link to="/" className="back-link"><ArrowLeft size={16}/> Retour au formulaire</Link><span className="admin-emblem"><LockKeyhole/></span><span className="eyebrow">CONFIGURATION REQUISE</span><h1>Connectez Supabase</h1><p>Renseignez <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> dans votre fichier <code>.env</code>, puis rechargez la page.</p><a className="button button-primary" href="/">Retour à l’accueil</a></div></div>;
  if (!session) return <div className="admin-screen"><form className="login-card" onSubmit={signIn}><Link to="/" className="back-link"><ArrowLeft size={16}/> Retour au formulaire</Link><span className="admin-emblem"><LockKeyhole/></span><span className="eyebrow">ESPACE PRIVÉ</span><h1>Connexion admin</h1><p>Connectez-vous avec le compte administrateur autorisé pour gérer les inscriptions.</p><label htmlFor="admin-email">Adresse e-mail</label><input id="admin-email" type="email" autoComplete="username" required value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })}/><label htmlFor="admin-password">Mot de passe</label><input id="admin-password" type="password" autoComplete="current-password" required value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })}/>{loginError && <div className="admin-error" role="alert">{loginError}</div>}<button className="button button-primary login-submit" disabled={busy}>{busy ? <><LoaderCircle size={16} className="spin"/> Connexion…</> : <>Se connecter <ArrowLeft className="arrow-right" size={16}/></>}</button><span className="login-footnote"><ShieldCheck size={14}/> Accès réservé aux administrateurs</span></form></div>;

  return <main className="dashboard"><header className="dashboard-header"><Link to="/" className="brand aicpes-brand"><img src="/aicpes-logo.png" alt="AICPES" /></Link><span className="admin-label"><span className="live-dot"/> ADMINISTRATION</span><div className="header-actions"><span className="account-label"><span className="avatar">{session.user.email?.[0]?.toUpperCase()}</span>{session.user.email}</span><button className="icon-button" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17}/></button></div></header>
    <div className="dashboard-content"><div className="dashboard-title-row"><div><span className="eyebrow">AICPES · VUE D’ENSEMBLE</span><h1>Les inscriptions</h1><p>Consultez et gérez les dossiers reçus.</p></div><button className="button button-primary export-button" onClick={exportAll}><FileSpreadsheet size={17}/> Exporter en Excel <Download size={15}/></button></div>
    <div className="stats-row"><article className="stat-card"><span className="stat-icon"><Users size={19}/></span><div><span className="stat-label">Total des inscriptions</span><strong>{total}</strong></div><span className="stat-caption">Tous les dossiers</span></article><article className="stat-card stat-card-accent"><span className="stat-icon"><UserRoundPlus size={19}/></span><div><span className="stat-label">Page actuelle</span><strong>{rows.length}<small> / {Math.max(total, 0)}</small></strong></div><span className="stat-caption">{total ? `Page ${page + 1} sur ${Math.max(1, Math.ceil(total / 10))}` : 'Aucun dossier'}</span></article></div>
    <section className="table-card"><div className="table-card-head"><div><h2>Liste des candidats</h2><span>{total} inscription{total > 1 ? 's' : ''} au total</span></div><span className="secure-chip"><ShieldCheck size={14}/> Données protégées</span></div><div className="filters-row"><form className="search-box" onSubmit={applySearch}><Search size={17}/><input placeholder="Rechercher un nom ou prénom…" value={searchInput} onChange={e => setSearchInput(e.target.value)}/>{searchInput && <button type="button" aria-label="Effacer la recherche" onClick={() => { setSearchInput(''); setSearch(''); setPage(0); }}><X size={14}/></button>}</form><select aria-label="Filtrer par ville" value={ville} onChange={e => { setVille(e.target.value); setPage(0); }}><option value="">Toutes les villes</option>{options.villes.map(x => <option key={x}>{x}</option>)}</select><select aria-label="Filtrer par niveau" value={niveau} onChange={e => { setNiveau(e.target.value); setPage(0); }}><option value="">Tous les niveaux</option>{options.niveaux.map(x => <option key={x}>{x}</option>)}</select><button className={`sort-button ${ascending ? 'active' : ''}`} onClick={() => setAscending(!ascending)} title="Trier par date"><ArrowDownAZ size={16}/><span>{ascending ? 'Plus ancien' : 'Plus récent'}</span></button>{(search || ville || niveau) && <button className="reset-filter" onClick={() => { setSearch(''); setSearchInput(''); setVille(''); setNiveau(''); setPage(0); }}><FilterX size={15}/> Réinitialiser</button>}</div>
    {error && <div className="admin-error dashboard-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Fermer"><X size={15}/></button></div>}
    <div className="table-scroll"><table><thead><tr><th>CANDIDAT</th><th>TÉLÉPHONE</th><th>EMAIL</th><th>NIVEAU</th><th>DATE</th><th aria-label="Actions"/></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="empty-state"><LoaderCircle className="spin"/> Chargement des inscriptions…</td></tr> : rows.length ? rows.map(row => <tr key={row.id}><td><div className="candidate-cell">{photoUrls[row.id] ? <img src={photoUrls[row.id]} alt="Portrait"/> : <span className="candidate-avatar">{row.prenoms?.[0]}{row.nom?.[0]}</span>}<span><strong>{row.nom}</strong><small>{row.prenoms}</small></span></div></td><td>{row.telephone}</td><td className="email-cell">{row.email}</td><td><span className="level-pill">{row.niveau}</span></td><td>{formatDate(row.created_at)}</td><td><div className="row-actions"><button onClick={() => setSelected(row)} aria-label="Voir le dossier" title="Voir le dossier"><Eye size={16}/></button><button onClick={() => setEdit({ ...row })} aria-label="Modifier" title="Modifier"><Pencil size={15}/></button><button className="delete-action" onClick={() => remove(row)} aria-label="Supprimer" title="Supprimer"><Trash2 size={15}/></button></div></td></tr>) : <tr><td colSpan="6" className="empty-state"><span>Aucune inscription trouvée.</span></td></tr>}</tbody></table></div>
    <div className="table-footer"><span>Affichage de <strong>{total ? page * 10 + 1 : 0}–{Math.min((page + 1) * 10, total)}</strong> sur <strong>{total}</strong></span><div className="pagination"><button disabled={page === 0 || loading} onClick={() => setPage(page - 1)} aria-label="Page précédente"><ChevronLeft size={17}/></button><span>Page {page + 1}</span><button disabled={(page + 1) * 10 >= total || loading} onClick={() => setPage(page + 1)} aria-label="Page suivante"><ChevronRight size={17}/></button></div></div></section><p className="dashboard-footer"><ShieldCheck size={14}/> Seuls les administrateurs autorisés peuvent accéder à ces données.</p></div>
    {selected && <Modal title="Détail de l’inscription" close={() => setSelected(null)}><div className="detail-profile">{photoUrls[selected.id] ? <img src={photoUrls[selected.id]} alt="Portrait"/> : <span className="detail-avatar">{selected.prenoms?.[0]}{selected.nom?.[0]}</span>}<div><h3>{selected.prenoms} {selected.nom}</h3><span>{selected.niveau}</span></div></div><div className="detail-grid">{[['Sexe', selected.sexe],['Date de naissance', formatDate(selected.date_naissance)],['Téléphone', selected.telephone],['E-mail', selected.email],['Pays & ville', selected.adresse],['Établissement', selected.etablissement],['Date d’inscription', formatDate(selected.created_at)]].map(([k,v]) => <div key={k}><span>{k}</span><strong>{v || '—'}</strong></div>)}</div><button className="button button-primary modal-done" onClick={() => setSelected(null)}>Fermer</button></Modal>}
    {edit && <Modal title="Modifier le dossier" close={() => setEdit(null)}><form className="edit-form" onSubmit={saveEdit}>{[['nom','Nom'],['prenoms','Prénoms'],['telephone','Téléphone'],['email','E-mail'],['sexe','Sexe'],['date_naissance','Date de naissance'],['niveau','Niveau'],['etablissement','Établissement'],['adresse','Pays et ville']].map(([key,label]) => <label key={key}>{label}<input required type={key === 'email' ? 'email' : key === 'date_naissance' ? 'date' : 'text'} value={edit[key] || ''} onChange={e => setEdit({ ...edit, [key]: e.target.value })}/></label>)}<label className="edit-photo-label">Portrait professionnel<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const photoFile = e.target.files?.[0]; if (!photoFile) return; if (!['image/jpeg','image/png','image/webp'].includes(photoFile.type) || photoFile.size > 5 * 1024 * 1024) { setError('Choisissez une image JPEG, PNG ou WebP de 5 Mo maximum.'); e.target.value = ''; return; } setEdit({ ...edit, photoFile }); }}/><small>{edit.photoFile?.name || (edit.photo_url ? 'Portrait actuel conservé' : 'Choisir un portrait')}</small></label><div className="modal-buttons"><button type="button" className="button button-outline" onClick={() => setEdit(null)}>Annuler</button><button className="button button-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button></div></form></Modal>}
    </main>;
}

function Modal({ title, close, children }) {
  useEffect(() => {
    function handleKeyDown(event) { if (event.key === 'Escape') close(); }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [close]);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button onClick={close} aria-label="Fermer"><X size={18}/></button></header>{children}</section></div>;
}
function formatDate(value) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d); }
