import { useState } from 'react';
import { ArrowRight, Camera, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { emptyRegistration, validateRegistration } from '../utils/validation';
import { submitRegistration } from '../services/inscriptions';

const inputFields = [
  { name: 'nom', label: 'Nom', placeholder: 'Ex. Kouassi', autocomplete: 'family-name' },
  { name: 'prenoms', label: 'Prénoms', placeholder: 'Ex. Aïcha Mariam', autocomplete: 'given-name' },
  { name: 'telephone', label: 'Téléphone', placeholder: '+225 07 00 00 00 00', autocomplete: 'tel' },
  { name: 'email', label: 'Adresse e-mail', placeholder: 'vous@exemple.ci', autocomplete: 'email', type: 'email' },
  { name: 'pays', label: 'Pays', placeholder: 'Côte d’Ivoire', autocomplete: 'country-name' },
  { name: 'ville', label: 'Ville', placeholder: 'Abidjan', autocomplete: 'address-level2' },
  { name: 'etablissement', label: 'Établissement', placeholder: 'Nom de votre établissement' },
];

export default function RegistrationForm() {
  const [values, setValues] = useState(emptyRegistration);
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  function change(name, value) {
    setValues(current => ({ ...current, [name]: value }));
    setErrors(current => ({ ...current, [name]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRegistration(values, photo);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      await submitRegistration(values, photo);
      setStatus('success');
      setMessage('Votre inscription a bien été enregistrée. Nous vous contacterons prochainement.');
      setValues(emptyRegistration);
      setPhoto(null);
      event.currentTarget.reset();
    } catch (error) {
      setStatus('error');
      setMessage(error.message || 'Une erreur est survenue. Veuillez réessayer.');
    }
  }

  return (
    <section className="form-card" aria-labelledby="form-title">
      <div className="card-heading">
        <div><span className="eyebrow">VOTRE PROFIL</span><h2 id="form-title">Vos informations</h2><p>Complétez les champs ci-dessous pour finaliser votre inscription.</p></div>
        <span className="secure-chip"><ShieldCheck size={15} /> Sécurisé</span>
      </div>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          {inputFields.slice(0, 2).map(field => <TextField key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={change} />)}
          <div className="field"><label htmlFor="sexe">Sexe <Required /></label><select id="sexe" name="sexe" value={values.sexe} onChange={e => change('sexe', e.target.value)} aria-invalid={!!errors.sexe}><option value="">Sélectionner</option><option value="Femme">Femme</option><option value="Homme">Homme</option><option value="Autre">Autre</option></select><FieldError error={errors.sexe} /></div>
          <div className="field"><label htmlFor="date_naissance">Date de naissance <Required /></label><input id="date_naissance" name="date_naissance" type="date" max={new Date().toISOString().slice(0, 10)} value={values.date_naissance} onChange={e => change('date_naissance', e.target.value)} aria-invalid={!!errors.date_naissance} /><FieldError error={errors.date_naissance} /></div>
          {inputFields.slice(2, 6).map(field => <TextField key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={change} />)}
          <div className="field"><label htmlFor="niveau">Niveau d’étude <Required /></label><select id="niveau" name="niveau" value={values.niveau} onChange={e => change('niveau', e.target.value)} aria-invalid={!!errors.niveau}><option value="">Sélectionner un niveau</option>{['Collège', 'Lycée', 'Baccalauréat', 'Bac+1', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5', 'Doctorat', 'Autre'].map(item => <option key={item}>{item}</option>)}</select><FieldError error={errors.niveau} /></div>
          {inputFields.slice(6).map(field => <TextField key={field.name} field={field} value={values[field.name]} error={errors[field.name]} onChange={change} wide />)}
          <div className="field photo-field"><label htmlFor="photo">Portrait professionnel <Required /></label><label htmlFor="photo" className={`upload-zone ${errors.photo ? 'invalid' : ''}`}><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { setPhoto(e.target.files?.[0] ?? null); setErrors(current => ({ ...current, photo: undefined })); }} /><span className="upload-icon"><Camera size={20} /></span><span className="upload-copy"><strong>{photo ? photo.name : 'Choisir une photo'}</strong><small>JPG, PNG ou WebP · 5 Mo maximum</small></span><span className="upload-browse">Parcourir</span></label><FieldError error={errors.photo} /></div>
        </div>
        {message && <div className={`form-notice ${status}`} role="status">{status === 'success' && <CheckCircle2 size={18} />}{message}</div>}
        <div className="form-footer"><span><ShieldCheck size={16} /> Vos informations restent confidentielles.</span><button className="button button-primary submit-button" type="submit" disabled={status === 'loading'}>{status === 'loading' ? <>Envoi en cours <LoaderCircle className="spin" size={17} /></> : <>Envoyer mon inscription <ArrowRight size={17} /></>}</button></div>
        <p className="privacy-note">En envoyant ce formulaire, vous acceptez le traitement de vos données pour la gestion de votre inscription.</p>
      </form>
    </section>
  );
}

function TextField({ field, value, error, onChange, wide = false }) { return <div className={`field ${wide ? 'field-wide' : ''}`}><label htmlFor={field.name}>{field.label} <Required /></label><input id={field.name} name={field.name} type={field.type || 'text'} placeholder={field.placeholder} autoComplete={field.autocomplete} value={value} onChange={e => onChange(field.name, e.target.value)} aria-invalid={!!error} />{field.name === 'telephone' && <span className="field-hint">Indicatif international accepté</span>}<FieldError error={error} /></div>; }
function Required() { return <span className="required-mark" aria-hidden="true">*</span>; }
function FieldError({ error }) { return error ? <span className="field-error" role="alert">{error}</span> : null; }
