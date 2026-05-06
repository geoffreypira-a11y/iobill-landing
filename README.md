# IO BILL — Site vitrine `iobill.online`

Site vitrine du SaaS IO BILL, édité par OWL'S INDUSTRY.
Stack pure HTML statique, déploiement Vercel, fonctions serverless minimales pour le formulaire de contact.

---

## 1. Vue d'ensemble

Ce dépôt contient **uniquement** le site vitrine `iobill.online`.
L'application authentifiée est séparée et hébergée sur `app.iobill.online` (autre dépôt, stack Next.js + Supabase).

### Pages fournies

```
/                                 → Landing principale (index.html, ~1100 lignes)
/tarifs                           → 3 plans, toggle mensuel/annuel, calculateur
/comparatif-logiciels-facturation → Comparatif éditorial neutre 6 acteurs FR
/aide                             → Centre d'aide
/changelog                        → Timeline des versions 2026.x
/contact                          → Formulaire avec 7 sujets dropdown

/fonctionnalites/
  index.html             → Hub des 7 sections de fonctionnalités
  factur-x.html          → Page reine SEO (Factur-X 2026/2027)
  facturation.html       → 10 ancres internes (signature, OCR, TVA, URSSAF…)
  banque.html            → DSP2, Bridge by BPCE, lettrage IA
  cabinet.html           → Mode expert-comptable, FEC
  mobile.html            → Apps natives iOS/Android

/pour-qui/
  freelance.html         → Plan Solo, URSSAF micro, profils
  tpe.html               → Plan Pro, multi-utilisateurs
  cabinet-comptable.html → Plan Cabinet, dégressivité
  btp.html               → Devis chantier, signature mobile

/blog/
  index.html             → Sommaire 10 articles, regroupé en 3 sections
  facture-electronique-2026-tpe.html
  migration-pennylane-iobill.html
  factur-x-explique-simplement.html
  auto-entrepreneur-2026-checklist-conformite.html
  choisir-regime-tva-2026.html
  devis-bon-commande-facture-differences.html
  urssaf-freelance-automatiser-declarations.html
  pourquoi-connecter-sa-banque-dsp2.html
  ia-facturation-marketing-vraie-utilite.html
  owls-industry-pourquoi-iobill.html

/legal/
  mentions-legales.html
  cookies.html           → Aucun cookie tracking, Plausible sans cookies
  confidentialite.html   → Politique RGPD complète, sous-traitants, droits
  cgu.html               → Conditions Générales d'Utilisation
  cgv.html               → Conditions Générales de Vente
  dpa.html               → Résumé HTML + lien PDF
  dpa.pdf                → DPA téléchargeable, conforme art. 28 RGPD

/api/
  contact.js             → Vercel Function POST /api/contact (Resend)
  newsletter.js          → Vercel Function POST /api/newsletter (Resend Audiences)
```

### Ressources globales

- `styles-seo.css` — feuille de style partagée par toutes les pages SEO et blog/légal
- `favicon.svg`, `og-image.svg` — assets visuels
- `robots.txt`, `sitemap.xml` — SEO
- `vercel.json` — headers, redirects, cache

---

## 2. Stack technique

- **Pure HTML statique** — aucun bundler, aucun build step
- **Vercel** pour l'hébergement (CDN edge global) + Vercel Functions pour les 2 endpoints API
- **Resend** pour les envois d'email (formulaire contact + newsletter via Resend Audiences)
- **Plausible Analytics** pour les statistiques (sans cookies, conforme RGPD)
- **Polices** : Syne (titres) + DM Sans (corps) + JetBrains Mono (mono) via Google Fonts

Chaque page est **autonome** : elle inclut son nav, son footer, ses meta tags, son JSON-LD.
La feuille `styles-seo.css` est partagée par les pages SEO et blog/légal.
La page `index.html` a son CSS inline pour rester ultra-rapide en LCP.

---

## 3. Installation locale

### Prérequis

- Node.js ≥ 20
- Un compte Vercel (gratuit suffit)
- Optionnel : compte Resend pour tester `/api/contact` localement

### Démarrage

```bash
# Cloner ce dépôt
git clone <url-du-repo> iobill-landing
cd iobill-landing

# Installer la CLI Vercel (vercel + types Node)
npm install

# Copier le template d'environnement
cp .env.example .env.local

# Remplir au minimum :
#   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
#   CONTACT_TO_EMAIL=contact@iobill.online
#   RESEND_AUDIENCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (newsletter)

# Démarrer le serveur local
vercel dev
```

Le site est accessible sur `http://localhost:3000`.

### Tester sans Resend

Si vous n'avez pas de clé Resend en local, le formulaire de contact retournera une erreur 500.
Vous pouvez ajouter un mode mock dans `api/contact.js` en début de handler :

```js
if (process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY) {
  console.log('[mock contact]', req.body);
  return res.status(200).json({ ok: true, mock: true });
}
```

---

## 4. Variables d'environnement

À configurer dans Vercel (Project Settings → Environment Variables) :

| Variable | Usage | Obligatoire | Exemple |
|---|---|---|---|
| `RESEND_API_KEY` | API Key Resend | ✓ | `re_AbCd...` |
| `CONTACT_TO_EMAIL` | Destinataire formulaire contact | ✓ | `contact@iobill.online` |
| `CONTACT_FROM_EMAIL` | Expéditeur (domaine vérifié Resend) | optionnel | `IO BILL <noreply@iobill.online>` |
| `RESEND_AUDIENCE_ID` | UUID Audience Resend pour newsletter | ✓ si newsletter active | `01abcdef-...` |
| `NEXT_PUBLIC_APP_URL` | URL canonique de l'app | optionnel | `https://app.iobill.online` |
| `PLAUSIBLE_DOMAIN` | Domaine Plausible | optionnel | `iobill.online` |

Côté Resend :
1. Créer un compte sur https://resend.com
2. Vérifier le domaine `iobill.online` (DNS : DKIM + SPF)
3. Créer une API key
4. Pour la newsletter : créer une Audience, copier son UUID

---

## 5. Ajouter un nouvel article de blog

Le blog est généré par les scripts Python `scripts/build_blog.py` et `scripts/build_blog_2.py`.

### Méthode A — script (recommandé pour cohérence)

1. Ouvrir `scripts/build_blog_2.py`
2. Ajouter une entrée dans la liste `articles` :

```python
articles.append({
    'slug': 'mon-nouvel-article',
    'title': "Titre de l'article",
    'description': "Description meta de 120-160 caractères.",
    'keywords': "mot-clé1, mot-clé2, mot-clé3",
    'h1': "Titre H1 avec <em>emphase</em>",
    'eyebrow': "Catégorie",
    'date': "2026-06-01",
    'reading_time': 7,
    'content': """    <p class="page-lead">Introduction de l'article.</p>

    <h2>1. Premier titre</h2>
    <p>Contenu...</p>

    <h2>2. Deuxième titre</h2>
    <p>Contenu...</p>
""",
    'related': [
        {'href': '/fonctionnalites/factur-x', 'label': 'Guide', 'title': 'Factur-X', 'desc': 'Description'},
        {'href': '/blog/autre-article', 'label': 'Article', 'title': 'Autre', 'desc': 'Description'},
        {'href': '/contact', 'label': 'Contact', 'title': 'Nous contacter', 'desc': 'Pour aller plus loin'},
    ]
})
```

3. Régénérer : `python3 scripts/build_blog_2.py`
4. Ajouter l'URL dans `sitemap.xml` (section blog)
5. Ajouter une carte dans `/blog/index.html` (section appropriée)
6. Commit + push → Vercel redéploie automatiquement

### Méthode B — manuelle

Copier le HTML d'un article existant (ex: `blog/factur-x-explique-simplement.html`) et adapter :
- `<title>`, meta description, keywords, canonical, OG, Twitter
- JSON-LD Article (`headline`, `datePublished`, `dateModified`)
- JSON-LD BreadcrumbList (3ème ListItem `name` et `item`)
- `<h1>`, eyebrow, date affichée, contenu
- Cartes `related-grid` en bas

⚠️ Ne pas oublier d'ajouter au sitemap.xml et à blog/index.html.

---

## 6. Déploiement Vercel

### Premier déploiement

```bash
# Login Vercel (via navigateur)
npx vercel login

# Lier le projet
npx vercel link

# Configurer les variables d'environnement (UI Vercel ou CLI)
npx vercel env add RESEND_API_KEY production
# … répéter pour chaque variable

# Déployer en preview
npx vercel

# Déployer en production
npx vercel --prod
```

### Domaine custom

Dans Vercel Dashboard → Settings → Domains, ajouter :
- `iobill.online` (apex)
- `www.iobill.online` (alias canonique recommandé)

Redirections DNS :
- A record `iobill.online` → `76.76.21.21` (Vercel)
- CNAME `www.iobill.online` → `cname.vercel-dns.com`

### Déploiements continus

Connecter le dépôt Git (GitHub, GitLab) à Vercel pour des déploiements automatiques :
- Branch `main` → production
- Toute autre branche → preview avec URL temporaire

---

## 7. Performances & SEO

### Métriques cibles

- **LCP** < 1,5 s sur connexion 4G (mesure Lighthouse mobile)
- **CLS** < 0,1
- **Score Lighthouse** : 95+ Performance, 100 Accessibilité, 100 Best Practices, 100 SEO

### Pré-requis SEO satisfaits

- ✓ Toutes les pages ont une `<title>`, meta description, canonical
- ✓ JSON-LD structuré sur chaque page (Organization, BlogPosting, BreadcrumbList, FAQPage…)
- ✓ Open Graph + Twitter Card
- ✓ Sitemap.xml à 33 URLs
- ✓ Robots.txt avec allow IA bots, block scrapers SEO
- ✓ hreflang fr-FR + x-default
- ✓ HTTPS forcé via Vercel
- ✓ HSTS headers configurés dans vercel.json
- ✓ Image OG en SVG (à convertir en PNG 1200×630 avant production — voir checklist)

### Plausible Analytics

Configuré pour pointer vers `iobill.online`.
Tags d'événements ajoutés sur tous les CTAs principaux :
- `cta_top_nav` → bouton "Essayer 14 jours" du nav
- `cta_freelance_essayer`, `cta_tpe_essayer`, `cta_cabinet_essayer`
- `cta_mobile_essayer`
- `contact_form_submit`, `contact_form_success`
- `dpa_pdf_download`

---

## 8. Checklist de finalisation avant lancement

### Contenu

- [ ] Relire toutes les pages pour traque de coquilles
- [ ] Faire valider les pages CGU, CGV, Confidentialité, DPA par un avocat spécialisé en droit du numérique (recommandé avant exploitation publique)
- [ ] Convertir `og-image.svg` en `og-image.png` (1200×630 px) — `convert og-image.svg -resize 1200x630 og-image.png` ou via Figma export
- [ ] Vérifier que tous les liens internes fonctionnent (pas de 404)
- [ ] Vérifier que les liens externes sont bien `target="_blank" rel="noopener"`

### Resend & emails

- [ ] Créer le compte Resend
- [ ] Vérifier le domaine `iobill.online` (DKIM + SPF)
- [ ] Créer 4 alias email à router : `contact@`, `cabinet@`, `press@`, `dpo@`, `noreply@`
- [ ] Tester l'envoi via le formulaire `/contact` en preview Vercel

### Plausible

- [ ] Créer le site `iobill.online` dans Plausible
- [ ] Vérifier que les events arrivent (visite + clic CTA)
- [ ] Configurer les goals dans Plausible (cta_*, contact_form_success)

### Vercel

- [ ] Déploiement preview validé (toutes les pages OK)
- [ ] Variables d'env de production configurées
- [ ] Domaine custom rattaché et SSL actif
- [ ] `vercel.json` redirections testées (legacy URLs)

### SEO

- [ ] Soumettre le sitemap à Google Search Console : `https://www.iobill.online/sitemap.xml`
- [ ] Soumettre à Bing Webmaster Tools
- [ ] Vérifier la propriété (DNS TXT ou meta tag)
- [ ] Activer la couverture de lecture par les IA (Anthropic, OpenAI) — déjà autorisée dans robots.txt
- [ ] Tester avec Google Rich Results Test : https://search.google.com/test/rich-results

### Légal

- [ ] DPA signé par OWL'S INDUSTRY (template + version PDF)
- [ ] Inscription auprès d'une PDP partenaire pour la production réelle
- [ ] Conformité CNIL : pas de déclaration nécessaire (analytics anonyme), mais bien tenir le registre des traitements à jour

---

## 9. Architecture éditoriale

### Maillage interne

Chaque page principale pointe vers 3 "related cards" en bas :
- Une vers une fonctionnalité connexe
- Une vers un article de blog ou un comparatif
- Une vers une page Pour qui ou Tarifs

### CTAs

Tous les CTAs vers l'app utilisent les paramètres UTM :
```
https://app.iobill.online/?utm_source=site_vitrine&utm_medium=<contexte>&utm_campaign=launch
```

`<contexte>` peut être : `nav`, `footer`, `freelance`, `tpe`, `cabinet`, `btp`, `mobile`, `blog`, `blog_index`, `factur-x_essayer`, etc.

### Sujets de contact

Le dropdown du formulaire `/contact` propose :
- `commercial` — Demande commerciale
- `cabinet` — Partenariat cabinet d'expertise comptable
- `beta` — Programme bêta-testeur
- `migration` — Migration depuis un autre logiciel
- `bug` — Bug ou problème technique
- `presse` — Presse / journaliste
- `autre` — Autre

`api/contact.js` supporte également `support` et `rgpd` (tolérance pour évolution future).

---

## 10. Mainteneurs

- **Geoffrey PIRA** (Président OWL'S INDUSTRY) — direction produit
- Email : `contact@iobill.online`

OWL'S INDUSTRY · SAS au capital de 4 000 €
SIRET 852 788 470 00018 · TVA FR25852788470
44 Vieille Route de la Gavotte, 13170 Les Pennes-Mirabeau

---

## 11. Licence

Site et contenu propriété d'OWL'S INDUSTRY. Tous droits réservés.

Le code de ce site (HTML, CSS, JS) peut être consulté librement pour inspiration, mais ne peut être copié intégralement sans autorisation écrite.

Les marques "IO BILL" et "OWL'S INDUSTRY" sont déposées (ou en cours de dépôt) auprès de l'INPI.
