window.ResumeAI = window.ResumeAI || {};

(function () {
  var Router = window.ResumeAI.Router;
  var Auth   = window.ResumeAI.Auth;
  var DB     = window.ResumeAI.DB;
  var Notify = window.ResumeAI.Notify;
  var Utils  = window.ResumeAI.Utils;
  var Modal  = window.ResumeAI.Modal;
  var Subscription = window.ResumeAI.Subscription;
  var navFns = window.ResumeAI.DashboardPage;

  function renderSettings(container) {
    if (!Auth.currentUser) { Router.navigate('/login'); return; }

    var userData = null;
    var usage = null;

    Promise.all([
      DB.getUser(Auth.currentUser.uid).catch(function () { return null; }),
      Subscription.getUsage().catch(function () { return { plan: 'free', used: 0, limit: 15, remaining: 15 }; })
    ]).then(function (results) {
      userData = results[0];
      usage = results[1];
      showPage();
    });

    function showPage() {
      container.innerHTML = navFns.renderNav('') +
        '<div class="settings-page"><div class="settings-layout">' +
          '<div class="settings-sidebar">' +
            '<button class="settings-nav-item active" data-tab="profile">👤 Profile</button>' +
            '<button class="settings-nav-item" data-tab="plan">💎 Plan & Usage</button>' +
            '<button class="settings-nav-item" data-tab="account">⚙️ Account</button>' +
            '<button class="settings-nav-item" data-tab="danger" style="color:var(--error)">⚠️ Danger Zone</button>' +
          '</div>' +
          '<div class="settings-content" id="settings-content"></div>' +
        '</div></div>';

      navFns.setupNavDropdown();

      var tabs = {
        profile:
          '<div class="settings-section">' +
            '<h3>Profile</h3>' +
            '<div class="form-group"><label class="form-label">Display Name</label>' +
              '<input class="form-input" id="settings-name" value="' + Utils.escapeHtml(Auth.currentUser.displayName || '') + '"></div>' +
            '<div class="form-group"><label class="form-label">Email</label>' +
              '<input class="form-input" value="' + Utils.escapeHtml(Auth.currentUser.email || '') + '" disabled>' +
              '<div class="form-hint">' + (Auth.currentUser.emailVerified ? '✓ Verified' : '⚠ Not verified — check your inbox') + '</div></div>' +
            '<button class="btn btn-primary" id="save-profile-btn">Save Changes</button>' +
          '</div>',

        plan:
          '<div class="settings-section">' +
            '<h3>Current Plan</h3>' +
            '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">' +
              '<div style="font-size:2rem">' + (usage.plan === 'pro' ? '💎' : '🆓') + '</div>' +
              '<div>' +
                '<div style="font-size:1.2rem;font-weight:700;text-transform:capitalize">' + usage.plan + '</div>' +
                '<div style="color:var(--text-muted);font-size:0.85rem">' + (usage.plan === 'pro' ? 'Unlimited access' : 'Limited features') + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:16px;margin-bottom:20px">' +
              '<div style="display:flex;justify-content:space-between;margin-bottom:8px">' +
                '<span style="color:var(--text-secondary)">AI Generations Used</span>' +
                '<span style="font-weight:600">' + (usage.used || 0) + ' / ' + (usage.limit || 15) + '</span>' +
              '</div>' +
              '<div style="height:6px;background:var(--surface);border-radius:3px;overflow:hidden">' +
                '<div style="height:100%;width:' + Math.min(100, ((usage.used || 0) / (usage.limit || 15)) * 100) + '%;background:var(--accent);border-radius:3px;transition:width 0.3s"></div>' +
              '</div>' +
            '</div>' +
            (usage.plan !== 'pro'
              ? '<div class="card" style="border-color:var(--accent);text-align:center;padding:32px">' +
                  '<h3 style="margin-bottom:8px">Upgrade to Pro</h3>' +
                  '<p style="color:var(--text-secondary);margin-bottom:20px">Unlimited resumes, AI generations, premium templates, and more</p>' +
                  '<button class="btn btn-primary btn-lg" id="upgrade-btn">Upgrade — $12/month</button>' +
                  '<p style="font-size:0.8rem;color:var(--text-muted);margin-top:12px">Payment integration required for actual billing</p>' +
                '</div>'
              : '') +
          '</div>',

        account:
          '<div class="settings-section">' +
            '<h3>Account Settings</h3>' +
            '<div class="form-group"><label class="form-label">Default Template</label>' +
              '<select class="form-select" id="default-template">' +
                ['modern','minimal','professional','executive','creative','student','developer','corporate'].map(function (t) {
                  return '<option value="' + t + '">' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>';
                }).join('') +
              '</select></div>' +
            '<button class="btn btn-primary" id="save-prefs-btn">Save Preferences</button>' +
          '</div>',

        danger:
          '<div class="settings-section danger-zone">' +
            '<h3>Danger Zone</h3>' +
            '<p style="color:var(--text-secondary);margin-bottom:20px">These actions are permanent and cannot be undone.</p>' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px;background:var(--bg-tertiary);border-radius:var(--radius-md)">' +
              '<div>' +
                '<div style="font-weight:600">Delete Account</div>' +
                '<div style="font-size:0.85rem;color:var(--text-muted)">Permanently delete your account and all data</div>' +
              '</div>' +
              '<button class="btn btn-danger" id="delete-account-btn">Delete Account</button>' +
            '</div>' +
          '</div>'
      };

      var contentEl = document.getElementById('settings-content');

      function showTab(tab) {
        contentEl.innerHTML = tabs[tab] || tabs.profile;
        container.querySelectorAll('.settings-nav-item').forEach(function (b) { b.classList.remove('active'); });
        var activeBtn = container.querySelector('[data-tab="' + tab + '"]');
        if (activeBtn) activeBtn.classList.add('active');
        attachHandlers(tab);
      }

      function attachHandlers(tab) {
        if (tab === 'profile') {
          var saveBtn = document.getElementById('save-profile-btn');
          if (saveBtn) saveBtn.onclick = function () {
            Auth.updateProfile({ displayName: document.getElementById('settings-name').value })
              .then(function () { Notify.success('Profile updated'); })
              .catch(function () { Notify.error('Failed to update profile'); });
          };
        }

        if (tab === 'plan') {
          var upgradeBtn = document.getElementById('upgrade-btn');
          if (upgradeBtn) upgradeBtn.onclick = function () {
            Notify.info('Payment integration coming soon. Configure Stripe or LemonSqueezy to enable subscriptions.');
          };
        }

        if (tab === 'account') {
          var prefsBtn = document.getElementById('save-prefs-btn');
          if (prefsBtn) prefsBtn.onclick = function () {
            DB.updateUser(Auth.currentUser.uid, {
              preferences: { defaultTemplate: document.getElementById('default-template').value }
            }).then(function () { Notify.success('Preferences saved'); })
              .catch(function () { Notify.error('Failed to save preferences'); });
          };
        }

        if (tab === 'danger') {
          var deleteBtn = document.getElementById('delete-account-btn');
          if (deleteBtn) deleteBtn.onclick = function () {
            Modal.confirm('Delete Account', 'This will permanently delete your account, all resumes, and all associated data. This action cannot be undone.').then(function (yes) {
              if (yes) {
                Auth.deleteAccount()
                  .then(function () { Notify.info('Account deleted'); Router.navigate('/'); })
                  .catch(function () { Notify.error('Failed to delete account. You may need to re-authenticate.'); });
              }
            });
          };
        }
      }

      container.querySelectorAll('.settings-nav-item').forEach(function (btn) {
        btn.onclick = function () { showTab(btn.dataset.tab); };
      });

      showTab('profile');
    }
  }

  Router.register('/settings', renderSettings);
})();
