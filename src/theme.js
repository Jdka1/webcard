// Site-wide light/dark toggle. The default follows the device setting
// (handled by a no-flash inline script in each page's <head>); a manual
// choice is remembered in localStorage and wins until cleared.
(function () {
  var KEY = 'theme';
  var mq = window.matchMedia('(prefers-color-scheme: light)');

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function current() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';

  function updateLabel() {
    var next = current() === 'dark' ? 'light' : 'dark';
    btn.textContent = '[ ' + next + ' ]';
    btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
  }

  function apply(theme, remember) {
    document.documentElement.dataset.theme = theme;
    if (remember) { try { localStorage.setItem(KEY, theme); } catch (e) {} }
    updateLabel();
  }

  btn.addEventListener('click', function () {
    apply(current() === 'dark' ? 'light' : 'dark', true);
  });

  document.body.appendChild(btn);
  updateLabel();

  // Follow the device only while no manual choice is stored.
  mq.addEventListener('change', function (e) {
    if (!stored()) apply(e.matches ? 'light' : 'dark', false);
  });
})();
