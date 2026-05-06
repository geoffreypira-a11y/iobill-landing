// =========================================================
// /api/newsletter — Inscription newsletter via Resend Audiences
// =========================================================
//
// Variables d'environnement requises :
//   - RESEND_API_KEY        : clé API Resend
//   - RESEND_AUDIENCE_ID    : identifiant de l'audience Resend
//
// Notes :
//   - L'utilisateur devrait recevoir un email de confirmation côté Resend
//     (à configurer dans le dashboard Resend Audiences avec le double opt-in).
//   - Pas de stockage en base, tout est délégué à Resend.
// =========================================================

const ALLOWED_ORIGINS = [
  'https://iobill.online',
  'https://www.iobill.online',
  'http://localhost:3000',
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { email, first_name, last_name, source } = req.body || {};

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }
  if (first_name && (typeof first_name !== 'string' || first_name.length > 100)) {
    return res.status(400).json({ error: 'Prénom invalide.' });
  }
  if (last_name && (typeof last_name !== 'string' || last_name.length > 100)) {
    return res.status(400).json({ error: 'Nom invalide.' });
  }

  const RESEND_API_KEY     = process.env.RESEND_API_KEY;
  const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;

  if (!RESEND_API_KEY || !RESEND_AUDIENCE_ID) {
    console.error('[api/newsletter] RESEND_API_KEY ou RESEND_AUDIENCE_ID manquante');
    return res.status(500).json({ error: 'Configuration serveur incomplète.' });
  }

  try {
    const resendRes = await fetch(
      `https://api.resend.com/audiences/${RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          first_name: first_name || undefined,
          last_name:  last_name  || undefined,
          unsubscribed: false,
        }),
      }
    );

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      // Cas du contact déjà inscrit : on retourne success silencieux
      // (Resend renvoie 422 avec message "Contact already exists")
      if (resendRes.status === 422 && /already/i.test(errBody)) {
        return res.status(200).json({ success: true, alreadySubscribed: true });
      }
      console.error('[api/newsletter] Resend error:', resendRes.status, errBody);
      return res.status(502).json({ error: "Le service d'inscription est momentanément indisponible." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[api/newsletter] Exception:', err);
    return res.status(500).json({ error: 'Erreur interne.' });
  }
}
