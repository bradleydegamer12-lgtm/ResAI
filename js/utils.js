window.ResumeAI = window.ResumeAI || {};

(function () {
  var Utils = {};

  Utils.debounce = function (fn, ms) {
    var timer;
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  };

  Utils.timeAgo = function (date) {
    if (!date) return '';
    var d = date.toDate ? date.toDate() : new Date(date);
    var secs = Math.floor((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
    if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
    if (secs < 2592000) return Math.floor(secs / 86400) + 'd ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  Utils.formatDate = function (date) {
    if (!date) return '';
    var d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  Utils.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  };

  Utils.escapeHtml = function (str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  Utils.clone = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  Utils.truncate = function (str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  };

  Utils.defaultResume = function (userId) {
    return {
      ownerId: userId,
      title: 'Untitled Resume',
      template: 'modern',
      personalInformation: { fullName: '', email: '', phone: '', location: '', linkedin: '', website: '' },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: [],
      achievements: [],
      volunteer: [],
      interests: [],
      references: [],
      additional: '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastOpenedAt: firebase.firestore.FieldValue.serverTimestamp(),
      resumeScore: 0
    };
  };

  Utils.defaultExperience = function () {
    return { id: Utils.uid(), company: '', position: '', startDate: '', endDate: '', current: false, description: '' };
  };

  Utils.defaultEducation = function () {
    return { id: Utils.uid(), institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '' };
  };

  Utils.defaultProject = function () {
    return { id: Utils.uid(), name: '', description: '', url: '', technologies: '' };
  };

  Utils.defaultCertification = function () {
    return { id: Utils.uid(), name: '', issuer: '', date: '', url: '' };
  };

  window.ResumeAI.Utils = Utils;
})();
