/* =========================================================================
   IO BILL — Bandeau de consentement cookies (RGPD / CNIL)
   -------------------------------------------------------------------------
   - Autonome : injecte son propre HTML + CSS, aucune dépendance.
   - Conforme CNIL : boutons "Tout accepter" et "Tout refuser" au même niveau,
     lien vers la politique cookies, choix mémorisé, possibilité de revenir
     sur son choix (fonction window.iobillOpenCookieSettings()).
   - Plausible Analytics est SANS cookie et anonyme => exempté de consentement.
     Il tourne donc dès l'arrivée. Les catégories ci-dessous sont prêtes pour
     de futurs traceurs (marketing/mesure avec cookies) : ceux-ci ne devront
     se déclencher QUE si getConsent().analytics / .marketing est true.
   - Durée de conservation du choix : 6 mois (recommandation CNIL 13 mois max).
   ========================================================================= */
(function () {
  "use strict";

  var STORAGE_KEY = "iobill_cookie_consent_v1";
  var CONSENT_DURATION_DAYS = 182; // ~6 mois

  // ---- Lecture / écriture du consentement ---------------------------------
  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      // Expiration
      if (data && data.ts) {
        var ageDays = (Date.now() - data.ts) / (1000 * 60 * 60 * 24);
        if (ageDays > CONSENT_DURATION_DAYS) return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(consent) {
    try {
      var data = {
        necessary: true,          // toujours actif (technique)
        analytics: !!consent.analytics,
        marketing: !!consent.marketing,
        ts: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      // Expose l'état pour d'éventuels scripts tiers
      window.iobillConsent = data;
      // Événement custom pour brancher de futurs scripts
      try {
        window.dispatchEvent(new CustomEvent("iobill:consent", { detail: data }));
      } catch (e) {}
      // Mesure Plausible (sans cookie) de l'action de consentement
      if (window.plausible) {
        window.plausible("cookie_consent", {
          props: {
            analytics: data.analytics ? "yes" : "no",
            marketing: data.marketing ? "yes" : "no"
          }
        });
      }
    } catch (e) {}
  }

  // Expose l'état courant en lecture pour de futurs scripts conditionnels
  window.iobillGetConsent = function () {
    return readConsent() || { necessary: true, analytics: false, marketing: false };
  };

  // ---- Styles --------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById("iobill-cc-styles")) return;
    var css = ''
      + '.iobill-cc-overlay{position:fixed;inset:0;background:rgba(6,7,10,0.55);backdrop-filter:blur(3px);z-index:99998;opacity:0;transition:opacity .25s;pointer-events:none;}'
      + '.iobill-cc-overlay.show{opacity:1;pointer-events:auto;}'
      + '.iobill-cc{position:fixed;z-index:99999;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);'
      + 'width:min(680px,calc(100vw - 32px));background:#111218;border:1px solid rgba(212,168,67,0.35);'
      + 'border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,0.55);padding:26px 28px;opacity:0;pointer-events:none;'
      + 'transition:opacity .3s,transform .3s;font-family:"DM Sans",system-ui,sans-serif;color:#f0eee8;}'
      + '.iobill-cc.show{opacity:1;transform:translateX(-50%) translateY(0);pointer-events:auto;}'
      + '.iobill-cc h2{font-family:"Syne",sans-serif;font-size:18px;font-weight:800;margin:0 0 8px;color:#f0eee8;letter-spacing:-0.3px;}'
      + '.iobill-cc p{font-size:13.5px;line-height:1.65;color:#b9b7b0;margin:0 0 18px;}'
      + '.iobill-cc a{color:#d4a843;text-decoration:underline;}'
      + '.iobill-cc-actions{display:flex;gap:10px;flex-wrap:wrap;}'
      + '.iobill-cc-btn{flex:1 1 auto;min-width:130px;padding:12px 18px;border-radius:10px;font-family:"DM Sans",sans-serif;'
      + 'font-size:13.5px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:all .2s;text-align:center;}'
      + '.iobill-cc-btn-accept{background:linear-gradient(135deg,#d4a843,#e8c36a);color:#0c0b0f;}'
      + '.iobill-cc-btn-accept:hover{filter:brightness(1.08);}'
      + '.iobill-cc-btn-refuse{background:#1b1d25;color:#f0eee8;border-color:rgba(255,255,255,0.14);}'
      + '.iobill-cc-btn-refuse:hover{border-color:rgba(255,255,255,0.3);}'
      + '.iobill-cc-btn-custom{background:transparent;color:#b9b7b0;border-color:rgba(255,255,255,0.14);flex:0 0 auto;min-width:auto;}'
      + '.iobill-cc-btn-custom:hover{color:#f0eee8;border-color:rgba(255,255,255,0.3);}'
      + '.iobill-cc-prefs{margin:6px 0 18px;display:none;}'
      + '.iobill-cc-prefs.show{display:block;}'
      + '.iobill-cc-row{display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-top:1px solid rgba(255,255,255,0.08);}'
      + '.iobill-cc-row-txt{flex:1;}'
      + '.iobill-cc-row-txt strong{display:block;font-size:13.5px;color:#f0eee8;margin-bottom:2px;font-family:"Syne",sans-serif;}'
      + '.iobill-cc-row-txt span{font-size:12.5px;color:#8b8983;line-height:1.5;}'
      + '.iobill-cc-switch{position:relative;width:44px;height:24px;flex:0 0 auto;margin-top:2px;}'
      + '.iobill-cc-switch input{opacity:0;width:0;height:0;}'
      + '.iobill-cc-slider{position:absolute;inset:0;background:#2a2d38;border-radius:24px;transition:.25s;cursor:pointer;}'
      + '.iobill-cc-slider:before{content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background:#f0eee8;border-radius:50%;transition:.25s;}'
      + '.iobill-cc-switch input:checked + .iobill-cc-slider{background:linear-gradient(135deg,#d4a843,#e8c36a);}'
      + '.iobill-cc-switch input:checked + .iobill-cc-slider:before{transform:translateX(20px);background:#0c0b0f;}'
      + '.iobill-cc-switch input:disabled + .iobill-cc-slider{opacity:0.5;cursor:not-allowed;}'
      + '.iobill-cc-badge{position:fixed;left:20px;bottom:20px;z-index:99990;width:42px;height:42px;border-radius:50%;'
      + 'background:#111218;border:1px solid rgba(212,168,67,0.35);color:#d4a843;font-size:20px;cursor:pointer;'
      + 'display:none;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,0.4);transition:transform .2s;}'
      + '.iobill-cc-badge:hover{transform:scale(1.08);}'
      + '.iobill-cc-badge.show{display:flex;}'
      + '@media(max-width:520px){.iobill-cc{padding:22px 20px;bottom:0;border-radius:16px 16px 0 0;width:100vw;}'
      + '.iobill-cc-btn{flex:1 1 100%;}.iobill-cc-btn-custom{order:3;}}';
    var style = document.createElement("style");
    style.id = "iobill-cc-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---- HTML ----------------------------------------------------------------
  function buildBanner() {
    var overlay = document.createElement("div");
    overlay.className = "iobill-cc-overlay";
    overlay.id = "iobill-cc-overlay";

    var banner = document.createElement("div");
    banner.className = "iobill-cc";
    banner.id = "iobill-cc";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Gestion des cookies");
    banner.innerHTML = ''
      + '<h2>🍪 On respecte votre vie privée</h2>'
      + '<p>IO BILL utilise un cookie technique indispensable au fonctionnement du site, '
      + 'et une mesure d\'audience anonyme (Plausible, sans cookie). '
      + 'Vous pouvez accepter ou refuser les cookies optionnels. '
      + 'En savoir plus dans notre <a href="/legal/cookies">politique cookies</a>.</p>'
      + '<div class="iobill-cc-prefs" id="iobill-cc-prefs">'
      +   '<div class="iobill-cc-row">'
      +     '<div class="iobill-cc-row-txt"><strong>Strictement nécessaires</strong><span>Cookie de session technique, sécurité. Toujours actifs — le site ne peut pas fonctionner sans eux.</span></div>'
      +     '<label class="iobill-cc-switch"><input type="checkbox" checked disabled><span class="iobill-cc-slider"></span></label>'
      +   '</div>'
      +   '<div class="iobill-cc-row">'
      +     '<div class="iobill-cc-row-txt"><strong>Mesure d\'audience</strong><span>Statistiques de visite. Aujourd\'hui via Plausible (anonyme, sans cookie). Ce réglage couvre de futurs outils de mesure utilisant des cookies.</span></div>'
      +     '<label class="iobill-cc-switch"><input type="checkbox" id="iobill-cc-analytics"><span class="iobill-cc-slider"></span></label>'
      +   '</div>'
      +   '<div class="iobill-cc-row">'
      +     '<div class="iobill-cc-row-txt"><strong>Marketing</strong><span>Cookies de personnalisation et de publicité. Non utilisés à ce jour. Ce réglage anticipe d\'éventuels outils futurs.</span></div>'
      +     '<label class="iobill-cc-switch"><input type="checkbox" id="iobill-cc-marketing"><span class="iobill-cc-slider"></span></label>'
      +   '</div>'
      + '</div>'
      + '<div class="iobill-cc-actions">'
      +   '<button class="iobill-cc-btn iobill-cc-btn-refuse" id="iobill-cc-refuse">Tout refuser</button>'
      +   '<button class="iobill-cc-btn iobill-cc-btn-custom" id="iobill-cc-custom">Personnaliser</button>'
      +   '<button class="iobill-cc-btn iobill-cc-btn-accept" id="iobill-cc-accept">Tout accepter</button>'
      + '</div>'
      + '<div class="iobill-cc-actions" id="iobill-cc-save-row" style="display:none;margin-top:10px;">'
      +   '<button class="iobill-cc-btn iobill-cc-btn-accept" id="iobill-cc-save">Enregistrer mes choix</button>'
      + '</div>';

    // Petit badge flottant pour rouvrir les préférences
    var badge = document.createElement("button");
    badge.className = "iobill-cc-badge";
    badge.id = "iobill-cc-badge";
    badge.setAttribute("aria-label", "Gérer les cookies");
    badge.title = "Gérer les cookies";
    badge.innerHTML = "🍪";

    document.body.appendChild(overlay);
    document.body.appendChild(banner);
    document.body.appendChild(badge);
    return { overlay: overlay, banner: banner, badge: badge };
  }

  // ---- Logique -------------------------------------------------------------
  function init() {
    injectStyles();
    var els = buildBanner();
    var overlay = els.overlay, banner = els.banner, badge = els.badge;

    var prefs = document.getElementById("iobill-cc-prefs");
    var saveRow = document.getElementById("iobill-cc-save-row");
    var chkAnalytics = document.getElementById("iobill-cc-analytics");
    var chkMarketing = document.getElementById("iobill-cc-marketing");

    function showBanner() {
      overlay.classList.add("show");
      banner.classList.add("show");
      badge.classList.remove("show");
    }
    function hideBanner() {
      overlay.classList.remove("show");
      banner.classList.remove("show");
      badge.classList.add("show");
    }
    function showPrefs() {
      prefs.classList.add("show");
      saveRow.style.display = "flex";
    }

    // Boutons
    document.getElementById("iobill-cc-accept").addEventListener("click", function () {
      writeConsent({ analytics: true, marketing: true });
      hideBanner();
    });
    document.getElementById("iobill-cc-refuse").addEventListener("click", function () {
      writeConsent({ analytics: false, marketing: false });
      hideBanner();
    });
    document.getElementById("iobill-cc-custom").addEventListener("click", function () {
      if (prefs.classList.contains("show")) {
        prefs.classList.remove("show");
        saveRow.style.display = "none";
      } else {
        showPrefs();
      }
    });
    document.getElementById("iobill-cc-save").addEventListener("click", function () {
      writeConsent({
        analytics: chkAnalytics.checked,
        marketing: chkMarketing.checked
      });
      hideBanner();
    });

    // Rouvrir via le badge ou via un lien [data-cookie-settings]
    badge.addEventListener("click", function () {
      var c = readConsent();
      if (c) { chkAnalytics.checked = !!c.analytics; chkMarketing.checked = !!c.marketing; }
      showPrefs();
      showBanner();
    });

    window.iobillOpenCookieSettings = function () {
      var c = readConsent();
      if (c) { chkAnalytics.checked = !!c.analytics; chkMarketing.checked = !!c.marketing; }
      showPrefs();
      showBanner();
    };

    // Liens dans le footer / page cookies
    document.querySelectorAll("[data-cookie-settings]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        window.iobillOpenCookieSettings();
      });
    });

    // Affichage initial
    var existing = readConsent();
    if (existing) {
      window.iobillConsent = existing;
      badge.classList.add("show");
    } else {
      showBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
