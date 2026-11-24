// FORTYFOUR site helpers: Google Forms sending and page fade transitions.
(function () {
  // Sends a contact form to its Google Form (answers land in the form's responses sheet).
  window.__ffSend = function (form, vals) {
    try {
      var body = new URLSearchParams();
      var merged = {};
      form.fields.forEach(function (f, i) {
        var v = vals[i];
        if (v == null || (Array.isArray(v) && !v.length) || String(v).trim() === '') return;
        if (f.merge) { (merged[f.merge] = merged[f.merge] || []).push(f.label + ': ' + (Array.isArray(v) ? v.join(', ') : v)); return; }
        if (!f.entry) return;
        if (Array.isArray(v)) v.forEach(function (x) { body.append(f.entry, x); });
        else body.append(f.entry, String(v));
      });
      Object.keys(merged).forEach(function (k) {
        var cur = body.get(k) || '';
        body.set(k, (cur ? cur + '\n\n' : '') + merged[k].join('\n'));
      });
      fetch(form.action, { method: 'POST', mode: 'no-cors', body: body }).catch(function () {});
      if (window.gtag) window.gtag('event', 'generate_lead', { form_name: form.name });
    } catch (e) {}
  };

  // Analytics: count clicks on the ways to get in touch.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !window.gtag) return;
    var h = a.getAttribute('href') || '', m = '';
    if (/^mailto:/i.test(h)) m = 'email';
    else if (/wa\.me|whatsapp/i.test(h)) m = 'whatsapp';
    else if (/instagram\.com/i.test(h)) m = 'instagram';
    else if (/linkedin\.com/i.test(h)) m = 'linkedin';
    if (m) window.gtag('event', 'contact_click', { method: m, page: location.pathname });
  }, true);

  // Page transitions: fade in on load, fade out before following an internal link.
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    if (reduced || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank') return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    e.preventDefault();
    document.documentElement.classList.add('ff-leave');
    setTimeout(function () { location.href = url.href; }, 320);
  });
  window.addEventListener('pageshow', function () { document.documentElement.classList.remove('ff-leave'); });
})();
