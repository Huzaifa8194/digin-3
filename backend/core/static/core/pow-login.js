// Solves the login's proof-of-work puzzle in the background, then lets the form submit.
(function () {
  var holder = document.getElementById('pow-challenge');
  var form = document.getElementById('login-form');
  if (!holder || !form) return;
  var solution = null, failed = false, waiting = false;
  var input = document.createElement('input');
  input.type = 'hidden'; input.name = 'altcha';
  form.appendChild(input);
  try {
    var worker = new Worker(holder.dataset.worker);
    worker.onmessage = function (e) {
      worker.terminate();
      if (!e.data) { failed = true; return; }
      solution = JSON.stringify(e.data);
      input.value = solution;
      if (waiting) form.submit();
    };
    worker.onerror = function () { failed = true; };
    worker.postMessage(JSON.parse(holder.dataset.challenge));
  } catch (err) { failed = true; }
  form.addEventListener('submit', function (e) {
    if (solution || failed) return;
    e.preventDefault();
    waiting = true;
    var button = form.querySelector('button[type="submit"]');
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
  });
})();
