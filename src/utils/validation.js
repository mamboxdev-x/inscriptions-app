export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const PROMOTIONS = Array.from({ length: 19 }, (_, index) => `IT${index + 12}`);

export const emptyRegistration = {
  nom: '', prenoms: '', sexe: '', date_naissance: '', telephone: '', email: '', promotion: '',
  adresse: '', pays: '', ville: '', niveau: '', etablissement: '',
};

export function validateRegistration(values, photo, { photoRequired = true } = {}) {
  const errors = {};
  const required = ['nom', 'prenoms', 'sexe', 'date_naissance', 'telephone', 'email', 'promotion', 'pays', 'ville', 'niveau', 'etablissement'];
  if (values.promotion && !PROMOTIONS.includes(values.promotion)) errors.promotion = 'Sélectionnez une promotion valide.';
  for (const field of required) if (!String(values[field] ?? '').trim()) errors[field] = 'Ce champ est obligatoire.';
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Adresse e-mail invalide.';
  if (values.telephone && !/^\+?[0-9\s().-]{8,20}$/.test(values.telephone.trim())) errors.telephone = 'Numéro de téléphone invalide.';
  if (values.date_naissance && new Date(values.date_naissance) > new Date()) errors.date_naissance = 'La date ne peut pas être dans le futur.';
  if (photoRequired && !photo && !values.photo_url) errors.photo = 'Ajoutez un portrait.';
  if (photo && !ALLOWED_PHOTO_TYPES.includes(photo.type)) errors.photo = 'Formats acceptés : JPEG, PNG ou WebP.';
  if (photo && photo.size > MAX_PHOTO_BYTES) errors.photo = 'La photo ne doit pas dépasser 5 Mo.';
  return errors;
}
