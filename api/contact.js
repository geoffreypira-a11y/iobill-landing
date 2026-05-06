// =========================================================
// /api/contact — Reception du formulaire de contact
// Envoie un email via Resend à CONTACT_TO_EMAIL.
// =========================================================
//
// Variables d'environnement requises (à configurer sur Vercel) :
//   - RESEND_API_KEY    : clé API Resend (re_xxxxx)
//   - CONTACT_TO_EMAIL  : email destinataire (ex. contact@iobill.online)
//
// Sécurité :
//   - Validation des champs côté serveur (longueur, format email)
//   - Rate limiting léger via Vercel (auto sur free tier)
//   - Pas de stockage en base, juste un envoi email
//   - CORS limité à iobill.online
// =========================================================

const ALLOWED_ORIGINS = [
  'https://iobill.online',
  'https://www.iobill.online',
  'http://localhost:3000', // pour `vercel dev`
];

const SUBJECT_LABELS = {
  commercial: 'Demande commerciale',
  cabinet:    'Partenariat cabinet expert-comptable',
  beta:       'Programme bêta-testeurs',
  migration:  'Migration depuis un autre logiciel',
  bug:        'Signalement de bug',
  presse:     'Demande presse',
  support:    'Support technique',  // tolérant, au cas où
  rgpd:       'Demande RGPD',       // tolérant, au cas où
  autre:      'Autre',
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  // Validation simple, suffisante pour la grande majorité des cas
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;
}

export default async function handler(req, res) {
  // ------ CORS ------
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  // ------ Lecture & validation du payload ------
  const { name, email, company, subject, message } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Nom invalide.' });
  }
  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }
  if (!subject || !SUBJECT_LABELS[subject]) {
    return res.status(400).json({ error: 'Sujet invalide.' });
  }
  if (!message || typeof message !== 'string' || message.trim().length < 20 || message.length > 3000) {
    return res.status(400).json({ error: 'Message invalide (entre 20 et 3000 caractères).' });
  }
  if (company && (typeof company !== 'string' || company.length > 200)) {
    return res.status(400).json({ error: 'Société invalide.' });
  }

  // ------ Configuration Resend ------
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'contact@iobill.online';
  const FROM_EMAIL = 'IO BILL <noreply@iobill.online>';

  if (!RESEND_API_KEY) {
    console.error('[api/contact] RESEND_API_KEY manquante');
    return res.status(500).json({ error: 'Configuration serveur incomplète.' });
  }

  // ------ Construction de l'email HTML ------
  const subjectLabel = SUBJECT_LABELS[subject];
  const safeName    = escapeHtml(name);
  const safeEmail   = escapeHtml(email);
  const safeCompany = escapeHtml(company || '—');
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>');

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#f4f4f7;padding:24px;color:#222;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <div style="background:#0c0b0f;padding:24px 32px;color:#d4a843;font-family:Syne,sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.5px;">
    IO BILL — Nouveau message
  </div>
  <div style="padding:28px 32px;">
    <div style="font-size:13px;color:#666;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">${escapeHtml(subjectLabel)}</div>
    <div style="font-size:14px;line-height:1.7;color:#222;">
      <p><strong>Nom :</strong> ${safeName}</p>
      <p><strong>Email :</strong> <a href="mailto:${safeEmail}" style="color:#0066cc;">${safeEmail}</a></p>
      <p><strong>Société :</strong> ${safeCompany}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:18px 0;"/>
      <p style="white-space:pre-wrap;">${safeMessage}</p>
    </div>
  </div>
  <div style="padding:14px 32px;background:#f9f9fa;color:#888;font-size:12px;border-top:1px solid #eee;">
    Reçu via le formulaire de contact iobill.online · Pour répondre, utilisez "Répondre" pour écrire directement à l'expéditeur.
  </div>
</div>
</body></html>`;

  const textVersion = `IO BILL — Nouveau message
Sujet : ${subjectLabel}

Nom : ${name}
Email : ${email}
Société : ${company || '—'}

Message :
${message}
---
Reçu via le formulaire de contact iobill.online`;

  // ------ Envoi via Resend ------
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: email,
        subject: `[IO BILL Contact] ${subjectLabel} — ${name}`,
        html: html,
        text: textVersion,
        tags: [
          { name: 'source',  value: 'site_vitrine' },
          { name: 'subject', value: subject },
        ],
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error('[api/contact] Resend error:', resendRes.status, errBody);
      return res.status(502).json({ error: "Le service d'envoi est momentanément indisponible. Veuillez réessayer ou écrire à contact@iobill.online." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[api/contact] Exception:', err);
    return res.status(500).json({ error: 'Erreur interne. Veuillez réessayer ou écrire à contact@iobill.online.' });
  }
}
