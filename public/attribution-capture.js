/**
 * Ecom - landing page attribution capture.
 *
 * Paste as-is into your landing page (a <script> tag, or your page builder's
 * "custom JS" / "before </body>" box). It does NOT send anything anywhere and
 * does NOT touch your existing form submission, webhook, or CRM integration -
 * it only:
 *
 *   1. Reads campaign_id / adset_id / ad_id / utm_* / fbclid / placement /
 *      site_source from the current page's URL as soon as it loads.
 *   2. Stores them (sessionStorage, with a cookie fallback) so they are still
 *      available later even if the visitor browses to another page on your
 *      site before filling out the form.
 *   3. Adds/fills matching hidden <input> fields on every <form> on the page,
 *      so those values ride along inside your form's OWN existing submission
 *      exactly like any other field you already collect - no change needed
 *      to how or where your form actually submits.
 *
 * If you forward your form's fields to Make/CRM already, these will simply
 * be additional fields in that same payload - add one HTTP module to your
 * existing Make scenario (alongside your current CRM step, not replacing
 * it) that POSTs the same fields as JSON to:
 *
 *   POST https://<your-dashboard-domain>/api/landing-leads
 *   Authorization: Bearer <LANDING_LEADS_API_SECRET>
 *   Content-Type: application/json
 *
 *   { "name", "phone", "email", "submitted_at", "landing_page_url",
 *     "campaign_id", "adset_id", "ad_id", "utm_source", "utm_medium",
 *     "utm_campaign", "utm_content", "utm_term", "fbclid", "placement",
 *     "site_source" }
 *
 * Only "name" and "phone" are required; everything else may be omitted.
 */
(function () {
  "use strict";

  var FIELDS = [
    "campaign_id",
    "adset_id",
    "ad_id",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
    "placement",
    "site_source",
  ];

  var STORAGE_KEY = "ecom_attribution_v1";

  function readFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var found = {};
    var any = false;
    for (var i = 0; i < FIELDS.length; i++) {
      var key = FIELDS[i];
      var value = params.get(key);
      if (value) {
        found[key] = value;
        any = true;
      }
    }
    return any ? found : null;
  }

  function readStored() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // sessionStorage unavailable (private browsing, embedded iframe) - fall through to the cookie.
    }
    try {
      var match = document.cookie.match(new RegExp("(?:^|; )" + STORAGE_KEY + "=([^;]*)"));
      if (match) return JSON.parse(decodeURIComponent(match[1]));
    } catch {
      // no storage available at all - attribution simply won't survive a page navigation, but the current pageview's own URL params still work.
    }
    return null;
  }

  function persist(data) {
    var json = JSON.stringify(data);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, json);
    } catch {
      // ignore - falls through to the cookie below regardless
    }
    try {
      // 1 day is plenty for a single visit's attribution window; adjust here if your funnel spans longer.
      var expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = STORAGE_KEY + "=" + encodeURIComponent(json) + "; expires=" + expires + "; path=/; SameSite=Lax";
    } catch {
      // ignore
    }
  }

  /** Landing-page-tool-native fields sometimes already exist under a different name (WordPress plugins, ClickFunnels, etc). Never overwrite a field that already has a real value typed/set by the page itself. */
  function fillForm(form, data) {
    for (var i = 0; i < FIELDS.length; i++) {
      var key = FIELDS[i];
      var value = data[key];
      if (!value) continue;

      var input = form.querySelector('input[name="' + key + '"]');
      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        form.appendChild(input);
      }
      if (!input.value) input.value = value;
    }

    var urlInput = form.querySelector('input[name="landing_page_url"]');
    if (!urlInput) {
      urlInput = document.createElement("input");
      urlInput.type = "hidden";
      urlInput.name = "landing_page_url";
      form.appendChild(urlInput);
    }
    if (!urlInput.value) urlInput.value = window.location.href;
  }

  function fillAllForms(data) {
    var forms = document.querySelectorAll("form");
    for (var i = 0; i < forms.length; i++) fillForm(forms[i], data);
  }

  var fromUrl = readFromUrl();
  var stored = readStored();
  // A fresh ad click always wins over whatever was stored from an earlier
  // pageview in the same session; otherwise keep using what was already
  // captured (e.g. the visitor moved from the ad's landing page to a second
  // page on the same site before submitting the form).
  var attribution = fromUrl || stored || {};
  if (fromUrl) persist(fromUrl);

  function init() {
    fillAllForms(attribution);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exposed for page builders that render forms dynamically after this
  // script runs (a popup form, a multi-step funnel step) - call
  // window.EcomAttribution.fillForm(formElement) right before it submits.
  window.EcomAttribution = {
    get: function () {
      return attribution;
    },
    fillForm: function (form) {
      fillForm(form, attribution);
    },
  };
})();
