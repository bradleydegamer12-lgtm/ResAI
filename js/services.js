window.ResumeAI = window.ResumeAI || {};

(function () {
  var auth = window.ResumeAI.auth;
  var db   = window.ResumeAI.db;
  var fns  = window.ResumeAI.functions;
  var Utils = window.ResumeAI.Utils;

  var Notify = {
    show: function (message, type, duration) {
      type = type || 'info';
      duration = duration || 4000;
      var container = document.getElementById('toast-container');
      var toast = document.createElement('div');
      toast.className = 'toast ' + type;
      var icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
      toast.innerHTML = '<span>' + (icons[type] || 'ℹ') + '</span><span>' + Utils.escapeHtml(message) + '</span>';
      container.appendChild(toast);
      setTimeout(function () {
        toast.classList.add('fade-out');
        setTimeout(function () { toast.remove(); }, 300);
      }, duration);
    },
    success: function (msg) { this.show(msg, 'success'); },
    error:   function (msg) { this.show(msg, 'error', 6000); },
    warning: function (msg) { this.show(msg, 'warning'); },
    info:    function (msg) { this.show(msg, 'info'); }
  };

  var Auth = {
    currentUser: null,
    init: function () {
      var self = this;
      return new Promise(function (resolve) {
        auth.onAuthStateChanged(function (user) {
          self.currentUser = user;
          document.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: user } }));
          resolve(user);
        });
      });
    },
    signUp: function (email, password, displayName) {
      return auth.createUserWithEmailAndPassword(email, password).then(function (cred) {
        return cred.user.updateProfile({ displayName: displayName }).then(function () {
          return db.collection('users').doc(cred.user.uid).set({
            displayName: displayName, email: email, photoURL: null,
            plan: 'free', resumeCount: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(function () {
            return cred.user.sendEmailVerification().then(function () { return cred.user; });
          });
        });
      });
    },
    signIn: function (email, password) {
      return auth.signInWithEmailAndPassword(email, password).then(function (c) { return c.user; });
    },
    signInWithGoogle: function () {
      var provider = new firebase.auth.GoogleAuthProvider();
      return auth.signInWithPopup(provider).then(function (cred) {
        return db.collection('users').doc(cred.user.uid).get().then(function (snap) {
          if (!snap.exists) {
            return db.collection('users').doc(cred.user.uid).set({
              displayName: cred.user.displayName, email: cred.user.email,
              photoURL: cred.user.photoURL, plan: 'free', resumeCount: 0,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }).then(function () { return cred.user; });
          }
          return cred.user;
        });
      });
    },
    signOut: function () {
      var self = this;
      return auth.signOut().then(function () { self.currentUser = null; });
    },
    resetPassword: function (email) { return auth.sendPasswordResetEmail(email); },
    updateProfile: function (data) {
      var self = this;
      if (!self.currentUser) return Promise.reject(new Error('Not authenticated'));
      var p = Promise.resolve();
      if (data.displayName) p = self.currentUser.updateProfile({ displayName: data.displayName });
      return p.then(function () {
        return db.collection('users').doc(self.currentUser.uid).update(
          Object.assign({}, data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
        );
      });
    },
    deleteAccount: function () {
      if (!this.currentUser) return Promise.reject(new Error('Not authenticated'));
      return fns.httpsCallable('deleteAccount')();
    }
  };

  var DB = {
    getUser: function (uid) {
      return db.collection('users').doc(uid).get().then(function (s) {
        return s.exists ? Object.assign({ id: s.id }, s.data()) : null;
      });
    },
    updateUser: function (uid, data) {
      return db.collection('users').doc(uid).update(
        Object.assign({}, data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
      );
    },
    createResume: function (userId, data) {
      var rd = Object.assign({}, Utils.defaultResume(userId), data || {});
      return db.collection('resumes').add(rd).then(function (ref) {
        return db.collection('users').doc(userId).update({
          resumeCount: firebase.firestore.FieldValue.increment(1)
        }).then(function () { return Object.assign({ id: ref.id }, rd); });
      });
    },
    getResume: function (id) {
      return db.collection('resumes').doc(id).get().then(function (s) {
        if (!s.exists) throw new Error('Resume not found');
        return Object.assign({ id: s.id }, s.data());
      });
    },
    getUserResumes: function (userId) {
      return db.collection('resumes').where('ownerId', '==', userId).orderBy('updatedAt', 'desc').get()
        .then(function (s) { return s.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); });
    },
    updateResume: function (id, data) {
      return db.collection('resumes').doc(id).update(
        Object.assign({}, data, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() })
      );
    },
    deleteResume: function (id, userId) {
      return db.collection('resumes').doc(id).delete().then(function () {
        return db.collection('users').doc(userId).update({ resumeCount: firebase.firestore.FieldValue.increment(-1) });
      });
    },
    duplicateResume: function (id, userId) {
      return DB.getResume(id).then(function (orig) {
        var d = Utils.clone(orig);
        delete d.id; delete d.createdAt; delete d.updatedAt; delete d.lastOpenedAt;
        d.title = d.title + ' (Copy)';
        return DB.createResume(userId, d);
      });
    },
    publishResume: function (id, data) {
      var pub = Object.assign({}, data, { publicId: id, publishedAt: firebase.firestore.FieldValue.serverTimestamp() });
      delete pub.id;
      return db.collection('publicResumes').doc(id).set(pub).then(function () {
        return DB.updateResume(id, { isPublic: true, publicId: id }).then(function () { return id; });
      });
    },
    unpublishResume: function (id) {
      return DB.getResume(id).then(function (r) {
        var p = r.publicId ? db.collection('publicResumes').doc(r.publicId).delete() : Promise.resolve();
        return p.then(function () { return DB.updateResume(id, { isPublic: false, publicId: null }); });
      });
    },
    getPublicResume: function (id) {
      return db.collection('publicResumes').doc(id).get().then(function (s) {
        if (!s.exists) throw new Error('Resume not found');
        return s.data();
      });
    }
  };

  var AI = {
    call: function (type, context, prompt) {
      return fns.httpsCallable('aiGenerate')({ type: type, context: context, prompt: prompt });
    },
    generateSummary:   function (c) { return this.call('generate-summary', c); },
    improveSummary:    function (t, m) { return this.call('improve-summary', { text: t, meta: m }); },
    rewriteExperience: function (e) { return this.call('rewrite-experience', { experience: e }); },
    generateSkills:    function (c) { return this.call('generate-skills', c); },
    improveText:       function (t, tone) { return this.call('improve-text', { text: t, tone: tone }); },
    analyzeResume:     function (r) { return this.call('analyze-resume', r); },
    atsAnalysis:       function (r, jd) { return this.call('ats-analysis', { resume: r, jobDescription: jd }); },
    careerAdvice:      function (c, p) { return this.call('career-advice', c, p); },
    chat:              function (p) { return this.call('ai-chat', {}, p); },
    scoreResume:       function (r) { return fns.httpsCallable('scoreResume')({ resume: r }); }
  };

  var Autosave = {
    _saveFn: null, _debouncedSave: null, _statusEl: null, _resumeId: null, _localKey: null,
    init: function (resumeId, saveFn, statusEl) {
      this._resumeId = resumeId; this._saveFn = saveFn; this._statusEl = statusEl;
      this._localKey = 'resumeai_draft_' + resumeId;
      this._debouncedSave = Utils.debounce(this._doSave.bind(this), 2000);
    },
    queue: function (data) {
      try { localStorage.setItem(this._localKey, JSON.stringify({ data: data, timestamp: Date.now() })); } catch (e) {}
      this._setStatus('saving');
      this._debouncedSave(data);
    },
    _doSave: function () {
      var self = this;
      try {
        var raw = localStorage.getItem(self._localKey);
        if (!raw) return;
        self._saveFn(JSON.parse(raw).data).then(function () {
          self._setStatus('saved');
          localStorage.removeItem(self._localKey);
        }).catch(function () { self._setStatus('error'); });
      } catch (e) { self._setStatus('error'); }
    },
    _setStatus: function (s) {
      if (!this._statusEl) return;
      var labels = { saving: 'Saving...', saved: 'Saved ✓', error: 'Unable to save', offline: 'Offline', syncing: 'Syncing...' };
      this._statusEl.textContent = labels[s] || '';
      this._statusEl.className = 'autosave-status ' + s;
    },
    getLocalDraft: function () {
      try { var r = localStorage.getItem(this._localKey); return r ? JSON.parse(r) : null; } catch (e) { return null; }
    },
    clearLocal: function () { localStorage.removeItem(this._localKey); }
  };

  var Subscription = {
    _cache: null,
    getUsage: function () {
      var self = this;
      return fns.httpsCallable('getUsage')().then(function (r) { self._cache = r.data; return r.data; })
        .catch(function () { return { plan: 'free', used: 0, limit: 15, remaining: 15 }; });
    },
    canUseAI: function () {
      return this.getUsage().then(function (u) { return u.remaining === 'unlimited' || u.remaining > 0; });
    }
  };

  var Modal = {
    show: function (title, bodyHtml, actions) {
      actions = actions || [];
      var overlay = document.getElementById('modal-overlay');
      overlay.classList.remove('hidden');
      overlay.innerHTML = '<div class="modal"><div class="modal-header"><h3>' + Utils.escapeHtml(title) +
        '</h3><button class="modal-close" onclick="ResumeAI.Modal.hide()">✕</button></div><div class="modal-body">' +
        bodyHtml + '</div><div class="modal-footer" id="modal-actions"></div></div>';
      var el = document.getElementById('modal-actions');
      var self = this;
      actions.forEach(function (a) {
        var btn = document.createElement('button');
        btn.className = 'btn ' + (a.cls || 'btn-secondary');
        btn.textContent = a.label;
        btn.onclick = function () { a.onClick(); self.hide(); };
        el.appendChild(btn);
      });
    },
    hide: function () {
      var o = document.getElementById('modal-overlay');
      o.classList.add('hidden'); o.innerHTML = '';
    },
    confirm: function (title, msg) {
      return new Promise(function (resolve) {
        Modal.show(title, '<p style="color:var(--text-secondary)">' + Utils.escapeHtml(msg) + '</p>', [
          { label: 'Cancel', cls: 'btn-secondary', onClick: function () { resolve(false); } },
          { label: 'Confirm', cls: 'btn-danger', onClick: function () { resolve(true); } }
        ]);
      });
    }
  };

  window.ResumeAI.Notify = Notify;
  window.ResumeAI.Auth = Auth;
  window.ResumeAI.DB = DB;
  window.ResumeAI.AI = AI;
  window.ResumeAI.Autosave = Autosave;
  window.ResumeAI.Subscription = Subscription;
  window.ResumeAI.Modal = Modal;
})();
