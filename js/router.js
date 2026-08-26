window.ResumeAI = window.ResumeAI || {};

(function () {
  var routes = {};
  var currentCleanup = null;

  function register(path, handler) {
    routes[path] = handler;
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function getRoute() {
    var hash = window.location.hash.slice(1) || '/';
    var qIdx = hash.indexOf('?');
    var path = qIdx >= 0 ? hash.slice(0, qIdx) : hash;
    var params = {};
    if (qIdx >= 0) {
      var qs = new URLSearchParams(hash.slice(qIdx + 1));
      qs.forEach(function (v, k) { params[k] = v; });
    }

    var keys = Object.keys(routes);
    for (var i = 0; i < keys.length; i++) {
      var pattern = keys[i];
      var regexStr = '^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$';
      var regex = new RegExp(regexStr);
      var match = path.match(regex);
      if (match) {
        var namedParams = {};
        var paramNames = [];
        var re = /:(\w+)/g;
        var m;
        while ((m = re.exec(pattern)) !== null) {
          paramNames.push(m[1]);
        }
        for (var j = 0; j < paramNames.length; j++) {
          namedParams[paramNames[j]] = match[j + 1];
        }
        return { path: pattern, params: Object.assign({}, namedParams, params), raw: path };
      }
    }
    return { path: '/', params: params, raw: path };
  }

  function handleRoute() {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    var route = getRoute();
    var handler = routes[route.path];
    var app = document.getElementById('app');

    if (handler) {
      var result = handler(app, route.params);
      if (result && typeof result.then === 'function') {
        result.then(function (cleanup) {
          if (typeof cleanup === 'function') currentCleanup = cleanup;
        });
      } else if (typeof result === 'function') {
        currentCleanup = result;
      }
    } else {
      app.innerHTML =
        '<div style="padding:120px 24px;text-align:center">' +
          '<h2>Page Not Found</h2>' +
          '<p style="color:var(--text-muted);margin-top:12px">The page you\'re looking for doesn\'t exist.</p>' +
          '<br><a href="#/" class="btn btn-primary">Go Home</a>' +
        '</div>';
    }
  }

  function init() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  window.ResumeAI.Router = { register: register, navigate: navigate, init: init, getRoute: getRoute };
})();
