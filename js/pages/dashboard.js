window.ResumeAI = window.ResumeAI || {};

(function () {
  var Router      = window.ResumeAI.Router;
  var Auth        = window.ResumeAI.Auth;
  var DB          = window.ResumeAI.DB;
  var Notify      = window.ResumeAI.Notify;
  var Utils       = window.ResumeAI.Utils;
  var Subscription = window.ResumeAI.Subscription;
  var Modal       = window.ResumeAI.Modal;

  function renderNav(active) {
    var u = Auth.currentUser;
    return '<nav class="nav"><div class="nav-inner">' +
      '<a href="#/" class="nav-logo"><div class="nav-logo-icon">R</div>ResumeAI</a>' +
      '<div class="nav-links">' +
        '<a href="#/dashboard" class="nav-link ' + (active === 'dashboard' ? 'active' : '') + '">Dashboard</a>' +
        '<a href="#/templates" class="nav-link ' + (active === 'templates' ? 'active' : '') + '">Templates</a>' +
        '<a href="#/ai-assistant" class="nav-link ' + (active === 'ai' ? 'active' : '') + '">AI Assistant</a>' +
        '<a href="#/ats-checker" class="nav-link ' + (active === 'ats' ? 'active' : '') + '">ATS Checker</a>' +
      '</div>' +
      '<div class="nav-user" style="position:relative">' +
        '<button class="nav-avatar" id="nav-avatar-btn" title="Account">' + ((u && u.displayName ? u.displayName[0] : 'U').toUpperCase()) + '</button>' +
        '<div class="nav-dropdown hidden" id="nav-dropdown">' +
          '<div style="padding:10px 14px;border-bottom:1px solid var(--border)">' +
            '<div style="font-weight:600;font-size:0.9rem">' + Utils.escapeHtml((u && u.displayName) || 'User') + '</div>' +
            '<div style="font-size:0.8rem;color:var(--text-muted)">' + Utils.escapeHtml((u && u.email) || '') + '</div>' +
          '</div>' +
          '<button class="nav-dropdown-item" onclick="location.hash=\'#/settings\'">⚙️ Settings</button>' +
          '<div class="nav-dropdown-divider"></div>' +
          '<button class="nav-dropdown-item" id="logout-btn" style="color:var(--error)">🚪 Sign Out</button>' +
        '</div>' +
      '</div>' +
      '<button class="nav-mobile-toggle btn btn-icon" onclick="this.parentElement.querySelector(\'.nav-links\').classList.toggle(\'open\')">☰</button>' +
    '</div></nav>';
  }

  function setupNavDropdown() {
    var btn = document.getElementById('nav-avatar-btn');
    var dd  = document.getElementById('nav-dropdown');
    if (!btn || !dd) return;
    btn.onclick = function (e) { e.stopPropagation(); dd.classList.toggle('hidden'); };
    document.addEventListener('click', function () { dd.classList.add('hidden'); });
    var logout = document.getElementById('logout-btn');
    if (logout) logout.onclick = function () {
      Auth.signOut().then(function () {
        Notify.info('Signed out');
        Router.navigate('/');
      });
    };
  }

  function renderDashboard(container) {
    if (!Auth.currentUser) { Router.navigate('/login'); return; }

    container.innerHTML = renderNav('dashboard') +
      '<div class="dashboard">' +
        '<div class="dashboard-header">' +
          '<h1 class="dashboard-greeting">Welcome back, ' + Utils.escapeHtml(Auth.currentUser.displayName || 'there') + ' 👋</h1>' +
          '<p class="dashboard-subtitle">Manage your resumes and track your progress</p>' +
        '</div>' +
        '<div class="stats-grid" id="stats-grid">' +
          '<div class="stat-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:40%"></div></div>' +
          '<div class="stat-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:40%"></div></div>' +
          '<div class="stat-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:40%"></div></div>' +
          '<div class="stat-card"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:40%"></div></div>' +
        '</div>' +
        '<div class="resumes-header">' +
          '<h2>Your Resumes</h2>' +
          '<div class="resumes-search"><span>🔍</span><input type="text" id="search-input" placeholder="Search resumes..."></div>' +
        '</div>' +
        '<div class="resumes-grid" id="resumes-grid">' +
          '<div class="skeleton skeleton-card"></div>' +
          '<div class="skeleton skeleton-card"></div>' +
          '<div class="skeleton skeleton-card"></div>' +
        '</div>' +
      '</div>';

    setupNavDropdown();

    Promise.all([DB.getUserResumes(Auth.currentUser.uid), Subscription.getUsage()])
      .then(function (results) {
        var resumes = results[0];
        var usage   = results[1];

        var avgScore = resumes.length
          ? Math.round(resumes.reduce(function (s, r) { return s + (r.resumeScore || 0); }, 0) / resumes.length)
          : 0;

        document.getElementById('stats-grid').innerHTML =
          '<div class="stat-card"><div class="stat-card-icon">📄</div><div class="stat-card-label">Resumes</div><div class="stat-card-value">' + resumes.length + '</div></div>' +
          '<div class="stat-card"><div class="stat-card-icon">📊</div><div class="stat-card-label">Avg Score</div><div class="stat-card-value">' + avgScore + '</div></div>' +
          '<div class="stat-card"><div class="stat-card-icon">🤖</div><div class="stat-card-label">AI Remaining</div><div class="stat-card-value">' + usage.remaining + '</div></div>' +
          '<div class="stat-card"><div class="stat-card-icon">💎</div><div class="stat-card-label">Plan</div><div class="stat-card-value" style="text-transform:capitalize">' + usage.plan + '</div></div>';

        renderResumes(resumes);

        document.getElementById('search-input').oninput = Utils.debounce(function (e) {
          var q = e.target.value.toLowerCase();
          var filtered = resumes.filter(function (r) {
            return (r.title || '').toLowerCase().indexOf(q) >= 0 ||
                   (r.template || '').toLowerCase().indexOf(q) >= 0 ||
                   ((r.personalInformation && r.personalInformation.fullName) || '').toLowerCase().indexOf(q) >= 0;
          });
          renderResumes(filtered);
        }, 300);
      })
      .catch(function (err) {
        console.error('Dashboard error:', err);
        Notify.error('Failed to load dashboard data');
      });

    function renderResumes(list) {
      var grid = document.getElementById('resumes-grid');
      grid.innerHTML =
        '<div class="new-resume-card" id="new-resume-btn">' +
          '<div class="new-resume-icon">+</div>' +
          '<span style="font-weight:600">Create New Resume</span>' +
          '<span style="font-size:0.8rem;color:var(--text-muted)">Start from scratch</span>' +
        '</div>' +
        list.map(function (r) {
          return '<div class="resume-card" data-id="' + r.id + '">' +
            '<div class="resume-card-header">' +
              '<div>' +
                '<div class="resume-card-title">' + Utils.escapeHtml(r.title) + '</div>' +
                '<span class="resume-card-template">' + Utils.escapeHtml(r.template || 'modern') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="resume-card-meta">' +
              '<span>Updated ' + Utils.timeAgo(r.updatedAt) + '</span>' +
              '<span class="resume-card-score">📊 ' + (r.resumeScore || 0) + '</span>' +
            '</div>' +
            '<div class="resume-card-actions">' +
              '<button class="btn btn-sm btn-primary edit-btn" data-id="' + r.id + '">Edit</button>' +
              '<button class="btn btn-sm btn-secondary dup-btn" data-id="' + r.id + '">Duplicate</button>' +
              '<button class="btn btn-sm btn-ghost del-btn" data-id="' + r.id + '" style="color:var(--error)">Delete</button>' +
            '</div>' +
          '</div>';
        }).join('');

      document.getElementById('new-resume-btn').onclick = function () {
        DB.createResume(Auth.currentUser.uid).then(function (resume) {
          Notify.success('Resume created!');
          Router.navigate('/builder/' + resume.id);
        }).catch(function () { Notify.error('Failed to create resume'); });
      };

      grid.querySelectorAll('.edit-btn').forEach(function (btn) {
        btn.onclick = function (e) { e.stopPropagation(); Router.navigate('/builder/' + btn.dataset.id); };
      });

      grid.querySelectorAll('.dup-btn').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          DB.duplicateResume(btn.dataset.id, Auth.currentUser.uid).then(function () {
            Notify.success('Resume duplicated!');
            renderDashboard(container);
          }).catch(function () { Notify.error('Failed to duplicate'); });
        };
      });

      grid.querySelectorAll('.del-btn').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          Modal.confirm('Delete Resume', 'Are you sure you want to delete this resume? This cannot be undone.').then(function (yes) {
            if (yes) {
              DB.deleteResume(btn.dataset.id, Auth.currentUser.uid).then(function () {
                Notify.success('Resume deleted');
                renderDashboard(container);
              }).catch(function () { Notify.error('Failed to delete'); });
            }
          });
        };
      });

      grid.querySelectorAll('.resume-card').forEach(function (card) {
        card.onclick = function (e) {
          if (e.target.closest('button')) return;
          Router.navigate('/builder/' + card.dataset.id);
        };
      });
    }
  }

  function renderTemplates(container) {
    if (!Auth.currentUser) { Router.navigate('/login'); return; }

    var templates = [
      { id: 'modern', name: 'Modern', desc: 'Clean sidebar layout with accent colors' },
      { id: 'minimal', name: 'Minimal', desc: 'Simple, elegant with lots of whitespace' },
      { id: 'professional', name: 'Professional', desc: 'Traditional structured layout' },
      { id: 'executive', name: 'Executive', desc: 'Dark, sophisticated for senior roles' },
      { id: 'creative', name: 'Creative', desc: 'Bold gradient header, unique style' },
      { id: 'student', name: 'Student', desc: 'Clean layout for entry-level positions' },
      { id: 'developer', name: 'Developer', desc: 'Code-inspired monospace design' },
      { id: 'corporate', name: 'Corporate', desc: 'Structured, formal business style' }
    ];

    container.innerHTML = renderNav('templates') +
      '<div class="dashboard">' +
        '<div class="section-header" style="margin-bottom:40px">' +
          '<h2>Resume Templates</h2>' +
          '<p>Choose a template for your next resume. All templates use the same data.</p>' +
        '</div>' +
        '<div class="templates-grid">' +
          templates.map(function (t) {
            return '<div class="template-card" data-template="' + t.id + '">' +
              '<div class="template-card-preview" id="preview-' + t.id + '"></div>' +
              '<div class="template-card-info">' +
                '<div class="template-card-name">' + t.name + '</div>' +
                '<div class="template-card-desc">' + t.desc + '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>';

    setupNavDropdown();

    var sampleData = {
      personalInformation: { fullName: 'Alex Johnson', email: 'alex@email.com', phone: '555-0123', location: 'San Francisco, CA' },
      summary: 'Experienced software engineer with 5+ years building scalable web applications.',
      experience: [{ company: 'Tech Corp', position: 'Senior Developer', startDate: '2020', endDate: 'Present', description: 'Led development of microservices architecture.' }],
      education: [{ institution: 'MIT', degree: 'BS', field: 'Computer Science', startDate: '2014', endDate: '2018' }],
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker']
    };

    templates.forEach(function (t) {
      var el = document.getElementById('preview-' + t.id);
      if (el && window.ResumeAI.BuilderPage) {
        el.innerHTML = window.ResumeAI.BuilderPage.renderTemplate(sampleData, t.id);
      }
    });

    container.querySelectorAll('.template-card').forEach(function (card) {
      card.onclick = function () {
        DB.createResume(Auth.currentUser.uid, { template: card.dataset.template }).then(function (resume) {
          Notify.success('Created resume with ' + card.dataset.template + ' template');
          Router.navigate('/builder/' + resume.id);
        }).catch(function () { Notify.error('Failed to create resume'); });
      };
    });
  }

  Router.register('/dashboard', renderDashboard);
  Router.register('/templates', renderTemplates);

  window.ResumeAI.DashboardPage = { renderNav: renderNav, setupNavDropdown: setupNavDropdown };
})();
