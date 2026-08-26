(function () {
  var Auth   = window.ResumeAI.Auth;
  var Router = window.ResumeAI.Router;
  var Notify = window.ResumeAI.Notify;

  function boot() {
    return Auth.init().then(function () {
      var loader = document.getElementById('loading-screen');
      if (loader) {
        loader.classList.add('fade-out');
        setTimeout(function () { loader.remove(); }, 500);
      }

      Router.init();

      document.addEventListener('auth-changed', function (e) {
        var user = e.detail.user;
        if (!user) {
          var hash = window.location.hash.slice(1) || '/';
          var protectedRoutes = ['/dashboard', '/builder', '/templates', '/ai-assistant', '/ats-checker', '/settings'];
          var isProtected = protectedRoutes.some(function (r) { return hash.indexOf(r) === 0; });
          if (isProtected) {
            Router.navigate('/login');
          }
        }
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(function () {});
      }

      window.addEventListener('online', function () {
        Notify.success('Back online — syncing changes');
      });
      window.addEventListener('offline', function () {
        Notify.warning('You\'re offline — changes saved locally');
      });
    });
  }

  boot().catch(function (err) {
    console.error('Boot error:', err);
    var loader = document.getElementById('loading-screen');
    if (loader) loader.remove();
    document.getElementById('app').innerHTML =
      '<div style="padding:120px 24px;text-align:center">' +
        '<h2 style="color:var(--error)">Failed to Load</h2>' +
        '<p style="color:var(--text-muted);margin-top:12px">Please check your Firebase configuration and try again.</p>' +
        '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px">' + (err.message || 'Unknown error') + '</p>' +
        '<br><button class="btn btn-primary" onclick="location.reload()">Retry</button>' +
      '</div>';
  });
})();
