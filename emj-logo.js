// emj-logo.js - shows the EMJ logo in the header and as the browser tab icon
const path = require('path');
const CLIENT = String.raw`(function () {
  var IMG = '<img src="/emj-logo.png" alt="EMJ Motors" style="height:64px;width:auto;display:block">';
  var BLOCK = /^(HEADER|NAV|MAIN|SECTION|BODY)$/;
  function run() {
    var all = document.querySelectorAll('body *'), hit = null;
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.children.length === 0 && /^\s*EMJ\s*MOTORS\s*LTD\s*$/i.test(e.textContent) && e.closest('footer') === null) { hit = e; break; }
    }
    if (hit === null) return;
    var a = hit.closest('a');
    if (a === null) {
      a = hit;
      while (a.parentElement && BLOCK.test(a.parentElement.tagName) === false && a.parentElement.textContent.trim().length < 50) a = a.parentElement;
    }
    if (BLOCK.test(a.tagName)) return;
    a.innerHTML = IMG;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();`;
module.exports = function (app) {
  app.get('/emj-logo.png', function (q, s) { s.sendFile(path.join(__dirname, 'logo.png')); });
  app.get('/emj-logo.js', function (q, s) { s.type('application/javascript').send(CLIENT); });
  app.use(function (q, r, n) {
    var send = r.send.bind(r);
    r.send = function (b) {
      try {
        if (q.method === 'GET' && typeof b === 'string' && /^\/(admin|api)/i.test(q.path) === false && /<\/body>/i.test(b) && b.indexOf('/emj-logo.js') === -1) {
          b = b.replace(/<\/head>/i, function () { return '<link rel="icon" href="/emj-logo.png"></head>'; });
          b = b.replace(/<\/body>/i, function () { return '<script src="/emj-logo.js" defer></script></body>'; });
        }
      } catch (e) {}
      return send(b);
    };
    n();
  });
};
