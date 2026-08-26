window.ResumeAI = window.ResumeAI || {};

(function () {
  var Router = window.ResumeAI.Router;
  var Auth   = window.ResumeAI.Auth;
  var DB     = window.ResumeAI.DB;
  var AI     = window.ResumeAI.AI;
  var Notify = window.ResumeAI.Notify;
  var Utils  = window.ResumeAI.Utils;
  var Autosave = window.ResumeAI.Autosave;
  var Modal    = window.ResumeAI.Modal;
  var Subscription = window.ResumeAI.Subscription;
  var navFns  = window.ResumeAI.DashboardPage;

  var currentResume = null;
  var resumeData = null;
  var sortables = [];

  function renderTemplate(data, template) {
    var d = data || {};
    var pi = d.personalInformation || {};
    var exp = d.experience || [];
    var edu = d.education || [];
    var skills = d.skills || [];
    var projects = d.projects || [];
    var certs = d.certifications || [];
    var langs = d.languages || [];

    var contactItems = '';
    if (pi.email) contactItems += '<div class="r-contact-item">📧 ' + Utils.escapeHtml(pi.email) + '</div>';
    if (pi.phone) contactItems += '<div class="r-contact-item">📱 ' + Utils.escapeHtml(pi.phone) + '</div>';
    if (pi.location) contactItems += '<div class="r-contact-item">📍 ' + Utils.escapeHtml(pi.location) + '</div>';
    if (pi.linkedin) contactItems += '<div class="r-contact-item">🔗 ' + Utils.escapeHtml(pi.linkedin) + '</div>';
    if (pi.website) contactItems += '<div class="r-contact-item">🌐 ' + Utils.escapeHtml(pi.website) + '</div>';

    var contactParts = [pi.email, pi.phone, pi.location, pi.linkedin, pi.website].filter(Boolean);
    var contactRow = '<div class="r-contact-row">' + contactParts.map(function(c){ return '<span>' + Utils.escapeHtml(c) + '</span>'; }).join(' · ') + '</div>';

    var expHtml = exp.map(function(e) {
      var sub = Utils.escapeHtml(e.company || '');
      if (e.startDate) sub += (sub ? ' · ' : '') + Utils.escapeHtml(e.startDate) + ' — ' + (e.current ? 'Present' : Utils.escapeHtml(e.endDate || ''));
      return '<div class="r-item"><div class="r-item-title">' + Utils.escapeHtml(e.position || '') + '</div>' +
        (sub ? '<div class="r-item-sub">' + sub + '</div>' : '') +
        (e.description ? '<div class="r-item-desc">' + Utils.escapeHtml(e.description) + '</div>' : '') + '</div>';
    }).join('');

    var eduHtml = edu.map(function(e) {
      var title = Utils.escapeHtml(e.degree || '');
      if (e.field) title += ' in ' + Utils.escapeHtml(e.field);
      var sub = Utils.escapeHtml(e.institution || '');
      if (e.startDate) sub += (sub ? ' · ' : '') + Utils.escapeHtml(e.startDate) + ' — ' + Utils.escapeHtml(e.endDate || '');
      return '<div class="r-item"><div class="r-item-title">' + title + '</div>' +
        (sub ? '<div class="r-item-sub">' + sub + '</div>' : '') +
        (e.gpa ? '<div class="r-item-desc">GPA: ' + Utils.escapeHtml(e.gpa) + '</div>' : '') + '</div>';
    }).join('');

    var skillsHtml = skills.map(function(s) {
      return '<span class="r-skill-tag">' + Utils.escapeHtml(typeof s === 'string' ? s : (s.name || String(s))) + '</span>';
    }).join('');

    var projHtml = projects.map(function(p) {
      return '<div class="r-item"><div class="r-item-title">' + Utils.escapeHtml(p.name || '') + '</div>' +
        (p.technologies ? '<div class="r-item-sub">' + Utils.escapeHtml(p.technologies) + '</div>' : '') +
        (p.description ? '<div class="r-item-desc">' + Utils.escapeHtml(p.description) + '</div>' : '') + '</div>';
    }).join('');

    var certHtml = certs.map(function(c) {
      var sub = Utils.escapeHtml(c.issuer || '');
      if (c.date) sub += (sub ? ' · ' : '') + Utils.escapeHtml(c.date);
      return '<div class="r-item"><div class="r-item-title">' + Utils.escapeHtml(c.name || '') + '</div>' +
        (sub ? '<div class="r-item-sub">' + sub + '</div>' : '') + '</div>';
    }).join('');

    var langHtml = langs.map(function(l) {
      return '<span class="r-skill-tag">' + Utils.escapeHtml(typeof l === 'string' ? l : (l.name || String(l))) + '</span>';
    }).join('');

    var name = Utils.escapeHtml(pi.fullName || 'Your Name');
    var email = Utils.escapeHtml(pi.email || '');

    if (template === 'modern') {
      return '<div class="tpl-modern"><div class="r-sidebar">' +
        '<div style="font-family:\'Plus Jakarta Sans\',sans-serif;font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-bottom:4px">' + name + '</div>' +
        (email ? '<div style="font-size:0.75rem;color:#94a3b8;margin-bottom:16px">' + email + '</div>' : '') +
        (contactItems ? '<div class="r-section-head">Contact</div>' + contactItems : '') +
        (skills.length ? '<div class="r-section-head">Skills</div><div>' + skillsHtml + '</div>' : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (certs.length ? '<div class="r-section-head">Certifications</div>' + certHtml : '') +
        (langs.length ? '<div class="r-section-head">Languages</div><div>' + langHtml + '</div>' : '') +
        '</div><div class="r-main">' +
        '<div class="r-name">' + name + '</div>' +
        (pi.linkedin ? '<div class="r-title">' + Utils.escapeHtml(pi.linkedin) + '</div>' : '') +
        (d.summary ? '<div class="r-section-head">Summary</div><div class="r-item-desc" style="margin-bottom:0">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (exp.length ? '<div class="r-section-head">Experience</div>' + expHtml : '') +
        (projects.length ? '<div class="r-section-head">Projects</div>' + projHtml : '') +
        '</div></div>';
    }

    if (template === 'minimal') {
      return '<div class="tpl-minimal"><div class="r-name">' + name + '</div><div class="r-title">' + email + '</div>' +
        contactRow +
        (d.summary ? '<div class="r-section-head">About</div><div class="r-item-desc">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (exp.length ? '<div class="r-section-head">Experience</div>' + expHtml : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (skills.length ? '<div class="r-section-head">Skills</div><div>' + skillsHtml + '</div>' : '') +
        (projects.length ? '<div class="r-section-head">Projects</div>' + projHtml : '') +
        (certs.length ? '<div class="r-section-head">Certifications</div>' + certHtml : '') + '</div>';
    }

    if (template === 'professional') {
      return '<div class="tpl-professional"><div class="r-name">' + name + '</div><div class="r-title">' + email + '</div>' +
        contactRow +
        (d.summary ? '<div class="r-section-head">Professional Summary</div><div class="r-item-desc">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (exp.length ? '<div class="r-section-head">Experience</div>' + expHtml : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (skills.length ? '<div class="r-section-head">Skills</div><div>' + skillsHtml + '</div>' : '') +
        (projects.length ? '<div class="r-section-head">Projects</div>' + projHtml : '') +
        (certs.length ? '<div class="r-section-head">Certifications</div>' + certHtml : '') + '</div>';
    }

    if (template === 'executive') {
      return '<div class="tpl-executive"><div class="r-name">' + name + '</div><div class="r-title">' + email + '</div>' +
        contactRow +
        (d.summary ? '<div class="r-section-head">Executive Summary</div><div class="r-item-desc">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (exp.length ? '<div class="r-section-head">Leadership Experience</div>' + expHtml : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (skills.length ? '<div class="r-section-head">Core Competencies</div><div>' + skillsHtml + '</div>' : '') +
        (certs.length ? '<div class="r-section-head">Certifications</div>' + certHtml : '') + '</div>';
    }

    if (template === 'creative') {
      return '<div class="tpl-creative"><div class="r-header"><div class="r-name">' + name + '</div><div class="r-title">' + email + '</div>' +
        '<div class="r-contact-row">' + [pi.email, pi.phone, pi.location].filter(Boolean).map(function(c){ return '<span>' + Utils.escapeHtml(c) + '</span>'; }).join(' · ') + '</div></div>' +
        '<div class="r-body">' +
        (d.summary ? '<div class="r-section-head">About Me</div><div class="r-item-desc">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (exp.length ? '<div class="r-section-head">Experience</div>' + expHtml : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (skills.length ? '<div class="r-section-head">Skills</div><div>' + skillsHtml + '</div>' : '') +
        (projects.length ? '<div class="r-section-head">Projects</div>' + projHtml : '') + '</div></div>';
    }

    if (template === 'student') {
      return '<div class="tpl-student"><div class="r-name">' + name + '</div><div class="r-title">' + email + '</div>' +
        contactRow +
        (d.summary ? '<div class="r-section-head">Objective</div><div class="r-item-desc">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (exp.length ? '<div class="r-section-head">Experience</div>' + expHtml : '') +
        (skills.length ? '<div class="r-section-head">Skills</div><div>' + skillsHtml + '</div>' : '') +
        (projects.length ? '<div class="r-section-head">Projects</div>' + projHtml : '') +
        (certs.length ? '<div class="r-section-head">Certifications</div>' + certHtml : '') + '</div>';
    }

    if (template === 'developer') {
      return '<div class="tpl-developer"><div class="r-name">' + name + '</div><div class="r-title">' + email + '</div>' +
        contactRow +
        (d.summary ? '<div class="r-section-head">About</div><div class="r-item-desc">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (skills.length ? '<div class="r-section-head">Tech Stack</div><div>' + skillsHtml + '</div>' : '') +
        (exp.length ? '<div class="r-section-head">Experience</div>' + expHtml : '') +
        (projects.length ? '<div class="r-section-head">Projects</div>' + projHtml : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (certs.length ? '<div class="r-section-head">Certifications</div>' + certHtml : '') + '</div>';
    }

    if (template === 'corporate') {
      return '<div class="tpl-corporate"><div class="r-header"><div><div class="r-name">' + name + '</div><div class="r-title">' + email + '</div></div>' +
        '<div class="r-contact-row">' + [pi.phone, pi.location, pi.linkedin].filter(Boolean).map(function(c){ return '<span>' + Utils.escapeHtml(c) + '</span>'; }).join(' · ') + '</div></div>' +
        '<div class="r-body">' +
        (d.summary ? '<div class="r-section-head">Summary</div><div class="r-item-desc">' + Utils.escapeHtml(d.summary) + '</div>' : '') +
        (exp.length ? '<div class="r-section-head">Professional Experience</div>' + expHtml : '') +
        (edu.length ? '<div class="r-section-head">Education</div>' + eduHtml : '') +
        (skills.length ? '<div class="r-section-head">Skills</div><div>' + skillsHtml + '</div>' : '') +
        (certs.length ? '<div class="r-section-head">Certifications</div>' + certHtml : '') + '</div></div>';
    }

    return renderTemplate(data, 'modern');
  }

  function updatePreview() {
    var el = document.getElementById('resume-preview');
    if (!el || !resumeData) return;
    el.innerHTML = renderTemplate(resumeData, resumeData.template || 'modern');
  }

  function triggerSave() {
    if (!currentResume) return;
    updatePreview();
    Autosave.queue(resumeData);
  }

  function setField(obj, path, value) {
    var keys = path.split('.');
    var cur = obj;
    for (var i = 0; i < keys.length - 1; i++) {
      var k = isNaN(keys[i]) ? keys[i] : parseInt(keys[i]);
      if (cur[k] === undefined) cur[k] = isNaN(keys[i]) ? {} : [];
      cur = cur[k];
    }
    var last = isNaN(keys[keys.length - 1]) ? keys[keys.length - 1] : parseInt(keys[keys.length - 1]);
    cur[last] = value;
  }

  function buildSections() {
    var d = resumeData;
    var pi = d.personalInformation || {};
    var sections = [];

    sections.push({ id: 'personal', icon: '👤', title: 'Personal Information',
      content: '<div class="grid-2">' +
        '<div class="form-group"><label class="form-label">Full Name</label><input class="form-input" data-field="personalInformation.fullName" value="' + Utils.escapeHtml(pi.fullName || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" data-field="personalInformation.email" value="' + Utils.escapeHtml(pi.email || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Phone</label><input class="form-input" data-field="personalInformation.phone" value="' + Utils.escapeHtml(pi.phone || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Location</label><input class="form-input" data-field="personalInformation.location" value="' + Utils.escapeHtml(pi.location || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">LinkedIn</label><input class="form-input" data-field="personalInformation.linkedin" value="' + Utils.escapeHtml(pi.linkedin || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Website</label><input class="form-input" data-field="personalInformation.website" value="' + Utils.escapeHtml(pi.website || '') + '"></div>' +
      '</div>'
    });

    sections.push({ id: 'summary', icon: '📝', title: 'Professional Summary',
      content: '<div class="form-group">' +
        '<textarea class="form-textarea" data-field="summary" rows="4" placeholder="Write a compelling professional summary...">' + Utils.escapeHtml(d.summary || '') + '</textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
          '<button class="ai-btn" data-ai="generate-summary">✨ Generate with AI</button>' +
          '<button class="ai-btn" data-ai="improve-summary">🔧 Improve</button>' +
          '<button class="ai-btn" data-ai="fix-grammar-summary">✏️ Fix Grammar</button>' +
        '</div><div class="ai-result-container" id="ai-result-summary"></div></div>'
    });

    var expEntries = (d.experience || []).map(function (exp, i) {
      return '<div class="entry-card" data-index="' + i + '" data-section="experience">' +
        '<div class="entry-card-header"><span class="entry-card-drag" title="Drag to reorder">⠿</span>' +
          '<span style="font-weight:600;font-size:0.9rem">' + Utils.escapeHtml(exp.position || 'New Position') + '</span>' +
          '<div class="entry-card-actions">' +
            '<button class="btn btn-icon btn-ghost btn-sm" data-action="duplicate-entry" data-section="experience" data-index="' + i + '" title="Duplicate">📋</button>' +
            '<button class="btn btn-icon btn-ghost btn-sm" data-action="delete-entry" data-section="experience" data-index="' + i + '" title="Delete" style="color:var(--error)">✕</button>' +
          '</div></div>' +
        '<div class="grid-2">' +
          '<div class="form-group"><label class="form-label">Company</label><input class="form-input" data-field="experience.' + i + '.company" value="' + Utils.escapeHtml(exp.company || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Position</label><input class="form-input" data-field="experience.' + i + '.position" value="' + Utils.escapeHtml(exp.position || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Start Date</label><input class="form-input" data-field="experience.' + i + '.startDate" value="' + Utils.escapeHtml(exp.startDate || '') + '" placeholder="Jan 2020"></div>' +
          '<div class="form-group"><label class="form-label">End Date</label><input class="form-input" data-field="experience.' + i + '.endDate" value="' + Utils.escapeHtml(exp.endDate || '') + '" placeholder="Present"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">Description</label>' +
          '<textarea class="form-textarea" data-field="experience.' + i + '.description" rows="3" placeholder="Describe your responsibilities and achievements...">' + Utils.escapeHtml(exp.description || '') + '</textarea>' +
          '<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
            '<button class="ai-btn" data-ai="rewrite-experience" data-index="' + i + '">✨ Rewrite with AI</button>' +
            '<button class="ai-btn" data-ai="improve-experience" data-index="' + i + '">🔧 Improve</button>' +
          '</div><div class="ai-result-container" id="ai-result-exp-' + i + '"></div></div></div>';
    }).join('');

    sections.push({ id: 'experience', icon: '💼', title: 'Work Experience',
      content: '<div id="experience-entries" class="sortable-list">' + expEntries + '</div>' +
        '<button class="btn btn-secondary" data-action="add-entry" data-section="experience" style="width:100%;margin-top:8px">+ Add Experience</button>'
    });

    var eduEntries = (d.education || []).map(function (edu, i) {
      return '<div class="entry-card" data-index="' + i + '" data-section="education">' +
        '<div class="entry-card-header"><span class="entry-card-drag">⠿</span>' +
          '<span style="font-weight:600;font-size:0.9rem">' + Utils.escapeHtml(edu.institution || 'New Education') + '</span>' +
          '<div class="entry-card-actions">' +
            '<button class="btn btn-icon btn-ghost btn-sm" data-action="delete-entry" data-section="education" data-index="' + i + '" style="color:var(--error)">✕</button>' +
          '</div></div>' +
        '<div class="grid-2">' +
          '<div class="form-group"><label class="form-label">Institution</label><input class="form-input" data-field="education.' + i + '.institution" value="' + Utils.escapeHtml(edu.institution || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Degree</label><input class="form-input" data-field="education.' + i + '.degree" value="' + Utils.escapeHtml(edu.degree || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Field</label><input class="form-input" data-field="education.' + i + '.field" value="' + Utils.escapeHtml(edu.field || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">GPA</label><input class="form-input" data-field="education.' + i + '.gpa" value="' + Utils.escapeHtml(edu.gpa || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Start Date</label><input class="form-input" data-field="education.' + i + '.startDate" value="' + Utils.escapeHtml(edu.startDate || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">End Date</label><input class="form-input" data-field="education.' + i + '.endDate" value="' + Utils.escapeHtml(edu.endDate || '') + '"></div>' +
        '</div></div>';
    }).join('');

    sections.push({ id: 'education', icon: '🎓', title: 'Education',
      content: '<div id="education-entries" class="sortable-list">' + eduEntries + '</div>' +
        '<button class="btn btn-secondary" data-action="add-entry" data-section="education" style="width:100%;margin-top:8px">+ Add Education</button>'
    });

    sections.push({ id: 'skills', icon: '⚡', title: 'Skills',
      content: '<div class="form-group"><label class="form-label">Skills (comma-separated)</label>' +
        '<textarea class="form-textarea" data-field="skills-text" rows="3" placeholder="JavaScript, React, Node.js, Python...">' +
        (d.skills || []).map(function(s){ return typeof s === 'string' ? s : (s.name || s); }).join(', ') + '</textarea>' +
        '<div style="display:flex;gap:8px;margin-top:8px"><button class="ai-btn" data-ai="generate-skills">✨ Suggest Skills</button></div>' +
        '<div class="ai-result-container" id="ai-result-skills"></div></div>'
    });

    var projEntries = (d.projects || []).map(function (p, i) {
      return '<div class="entry-card" data-index="' + i + '" data-section="projects">' +
        '<div class="entry-card-header"><span class="entry-card-drag">⠿</span>' +
          '<span style="font-weight:600;font-size:0.9rem">' + Utils.escapeHtml(p.name || 'New Project') + '</span>' +
          '<div class="entry-card-actions">' +
            '<button class="btn btn-icon btn-ghost btn-sm" data-action="delete-entry" data-section="projects" data-index="' + i + '" style="color:var(--error)">✕</button>' +
          '</div></div>' +
        '<div class="grid-2">' +
          '<div class="form-group"><label class="form-label">Project Name</label><input class="form-input" data-field="projects.' + i + '.name" value="' + Utils.escapeHtml(p.name || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Technologies</label><input class="form-input" data-field="projects.' + i + '.technologies" value="' + Utils.escapeHtml(p.technologies || '') + '"></div>' +
        '</div>' +
        '<div class="form-group"><label class="form-label">URL</label><input class="form-input" data-field="projects.' + i + '.url" value="' + Utils.escapeHtml(p.url || '') + '"></div>' +
        '<div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" data-field="projects.' + i + '.description" rows="2">' + Utils.escapeHtml(p.description || '') + '</textarea></div></div>';
    }).join('');

    sections.push({ id: 'projects', icon: '🚀', title: 'Projects',
      content: '<div id="projects-entries" class="sortable-list">' + projEntries + '</div>' +
        '<button class="btn btn-secondary" data-action="add-entry" data-section="projects" style="width:100%;margin-top:8px">+ Add Project</button>'
    });

    var certEntries = (d.certifications || []).map(function (c, i) {
      return '<div class="entry-card" data-index="' + i + '" data-section="certifications">' +
        '<div class="entry-card-header"><span class="entry-card-drag">⠿</span>' +
          '<span style="font-weight:600;font-size:0.9rem">' + Utils.escapeHtml(c.name || 'New Certification') + '</span>' +
          '<div class="entry-card-actions">' +
            '<button class="btn btn-icon btn-ghost btn-sm" data-action="delete-entry" data-section="certifications" data-index="' + i + '" style="color:var(--error)">✕</button>' +
          '</div></div>' +
        '<div class="grid-2">' +
          '<div class="form-group"><label class="form-label">Name</label><input class="form-input" data-field="certifications.' + i + '.name" value="' + Utils.escapeHtml(c.name || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Issuer</label><input class="form-input" data-field="certifications.' + i + '.issuer" value="' + Utils.escapeHtml(c.issuer || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">Date</label><input class="form-input" data-field="certifications.' + i + '.date" value="' + Utils.escapeHtml(c.date || '') + '"></div>' +
          '<div class="form-group"><label class="form-label">URL</label><input class="form-input" data-field="certifications.' + i + '.url" value="' + Utils.escapeHtml(c.url || '') + '"></div>' +
        '</div></div>';
    }).join('');

    sections.push({ id: 'certifications', icon: '🏆', title: 'Certifications',
      content: '<div id="certifications-entries" class="sortable-list">' + certEntries + '</div>' +
        '<button class="btn btn-secondary" data-action="add-entry" data-section="certifications" style="width:100%;margin-top:8px">+ Add Certification</button>'
    });

    sections.push({ id: 'languages', icon: '🌍', title: 'Languages',
      content: '<div class="form-group"><label class="form-label">Languages (comma-separated)</label>' +
        '<input class="form-input" data-field="languages-text" value="' + (d.languages || []).map(function(l){ return typeof l === 'string' ? l : (l.name || l); }).join(', ') + '" placeholder="English (Native), Spanish (Fluent)..."></div>'
    });

    sections.push({ id: 'additional', icon: '📌', title: 'Additional Information',
      content: '<div class="form-group"><label class="form-label">Achievements</label>' +
        '<textarea class="form-textarea" data-field="achievements-text" rows="2" placeholder="Notable achievements...">' + (d.achievements || []).join('\n') + '</textarea></div>' +
        '<div class="form-group"><label class="form-label">Interests</label>' +
        '<input class="form-input" data-field="interests-text" value="' + (d.interests || []).join(', ') + '" placeholder="Reading, hiking, photography..."></div>' +
        '<div class="form-group"><label class="form-label">Additional Notes</label>' +
        '<textarea class="form-textarea" data-field="additional" rows="2">' + Utils.escapeHtml(d.additional || '') + '</textarea></div>'
    });

    return sections;
  }

  function renderBuilder(container, params) {
    if (!Auth.currentUser) { Router.navigate('/login'); return; }

    return DB.getResume(params.id).then(function (resume) {
      if (resume.ownerId !== Auth.currentUser.uid) {
        Notify.error('Access denied');
        Router.navigate('/dashboard');
        return;
      }

      currentResume = resume;
      var localDraft = Autosave.getLocalDraft();
      resumeData = (localDraft && localDraft.timestamp > ((resume.updatedAt && resume.updatedAt.toMillis) ? resume.updatedAt.toMillis() : 0))
        ? localDraft.data : Utils.clone(resume);
      delete resumeData.id;
      delete resumeData.ownerId;
      delete resumeData.createdAt;

      container.innerHTML = navFns.renderNav('') +
        '<div class="builder"><div class="builder-editor" id="builder-editor">' +
          '<div class="builder-toolbar"><div class="builder-toolbar-left">' +
            '<a href="#/dashboard" class="btn btn-ghost btn-sm">← Back</a>' +
            '<input class="form-input" id="resume-title" value="' + Utils.escapeHtml(resumeData.title || 'Untitled Resume') + '" style="max-width:250px;padding:6px 12px;font-weight:600">' +
          '</div><div class="builder-toolbar-right">' +
            '<div class="autosave-status" id="autosave-status">Ready</div>' +
            '<button class="btn btn-sm btn-secondary" id="score-btn">📊 Score</button>' +
            '<button class="btn btn-sm btn-secondary" id="download-btn">📄 PDF</button>' +
            '<button class="btn btn-sm btn-secondary" id="share-btn">🔗 Share</button>' +
            '<select class="form-select" id="template-select" style="width:auto;padding:6px 10px;font-size:0.8rem">' +
              ['modern','minimal','professional','executive','creative','student','developer','corporate'].map(function(t) {
                return '<option value="' + t + '"' + (resumeData.template === t ? ' selected' : '') + '>' + t.charAt(0).toUpperCase() + t.slice(1) + '</option>';
              }).join('') +
            '</select>' +
          '</div></div>' +
          '<div id="builder-sections" style="padding:16px 0"></div>' +
        '</div>' +
        '<div class="builder-preview" id="builder-preview">' +
          '<div class="resume-preview-controls">' +
            '<button class="btn btn-sm btn-ghost" id="zoom-out">−</button>' +
            '<span id="zoom-level" style="font-size:0.8rem;color:var(--text-muted);min-width:40px;text-align:center">100%</span>' +
            '<button class="btn btn-sm btn-ghost" id="zoom-in">+</button>' +
            '<button class="btn btn-sm btn-ghost" id="zoom-reset">Reset</button>' +
          '</div>' +
          '<div class="resume-preview-container" id="resume-preview" style="transform-origin:top center"></div>' +
        '</div></div>';

      navFns.setupNavDropdown();

      Autosave.init(params.id, function (data) {
        return DB.updateResume(params.id, data);
      }, document.getElementById('autosave-status'));

      renderSections();
      updatePreview();

      document.getElementById('resume-title').oninput = Utils.debounce(function (e) {
        resumeData.title = e.target.value;
        triggerSave();
      }, 500);

      document.getElementById('template-select').onchange = function (e) {
        resumeData.template = e.target.value;
        triggerSave();
      };

      var zoom = 100;
      var previewEl = document.getElementById('resume-preview');
      document.getElementById('zoom-in').onclick = function () { zoom = Math.min(150, zoom + 10); previewEl.style.transform = 'scale(' + (zoom/100) + ')'; document.getElementById('zoom-level').textContent = zoom + '%'; };
      document.getElementById('zoom-out').onclick = function () { zoom = Math.max(50, zoom - 10); previewEl.style.transform = 'scale(' + (zoom/100) + ')'; document.getElementById('zoom-level').textContent = zoom + '%'; };
      document.getElementById('zoom-reset').onclick = function () { zoom = 100; previewEl.style.transform = 'scale(1)'; document.getElementById('zoom-level').textContent = '100%'; };

      document.getElementById('score-btn').onclick = function () {
        var btn = document.getElementById('score-btn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
        AI.scoreResume(resumeData).then(function (result) {
          var score = result.data;
          resumeData.resumeScore = score.overall;
          DB.updateResume(params.id, { resumeScore: score.overall });
          var catsHtml = Object.keys(score.categories || {}).map(function (k) {
            return '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg-tertiary);border-radius:8px"><span style="text-transform:capitalize;color:var(--text-secondary)">' + k + '</span><span style="font-weight:600">' + score.categories[k] + '</span></div>';
          }).join('');
          var recsHtml = (score.recommendations || []).map(function (r) {
            return '<li style="padding:6px 0;color:var(--text-secondary);font-size:0.9rem">• ' + Utils.escapeHtml(r) + '</li>';
          }).join('');
          Modal.show('Resume Score',
            '<div style="text-align:center;margin-bottom:20px"><div style="font-size:3rem;font-weight:800;font-family:var(--font-display);color:var(--accent-light)">' + score.overall + '/100</div></div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">' + catsHtml + '</div>' +
            (recsHtml ? '<h4 style="margin-bottom:12px">Recommendations</h4><ul style="list-style:none;padding:0">' + recsHtml + '</ul>' : ''),
            [{ label: 'Close', cls: 'btn-primary', onClick: function () {} }]
          );
        }).catch(function () { Notify.error('Scoring failed'); });
        btn.disabled = false; btn.textContent = '📊 Score';
      };

      document.getElementById('download-btn').onclick = function () {
        var btn = document.getElementById('download-btn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Generating...';
        try {
          var jsPDF = window.jspdf.jsPDF;
          var pdf = new jsPDF('p', 'mm', 'a4');
          var pi = resumeData.personalInformation || {};
          var y = 20;
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20);
          pdf.text(pi.fullName || 'Resume', 20, y); y += 10;
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
          if (pi.email) { pdf.text(pi.email, 20, y); y += 6; }
          if (pi.phone) { pdf.text(pi.phone, 20, y); y += 6; }
          if (pi.location) { pdf.text(pi.location, 20, y); y += 10; }
          if (resumeData.summary) {
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
            pdf.text('Professional Summary', 20, y); y += 7;
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
            var lines = pdf.splitTextToSize(resumeData.summary, 170);
            pdf.text(lines, 20, y); y += lines.length * 5 + 8;
          }
          if (resumeData.experience && resumeData.experience.length) {
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
            pdf.text('Experience', 20, y); y += 7;
            resumeData.experience.forEach(function (exp) {
              if (y > 270) { pdf.addPage(); y = 20; }
              pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
              pdf.text((exp.position || '') + ' — ' + (exp.company || ''), 20, y); y += 5;
              pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
              pdf.text((exp.startDate || '') + ' — ' + (exp.current ? 'Present' : (exp.endDate || '')), 20, y); y += 5;
              if (exp.description) {
                var dLines = pdf.splitTextToSize(exp.description, 170);
                pdf.text(dLines, 20, y); y += dLines.length * 4 + 4;
              }
              y += 3;
            });
          }
          if (resumeData.education && resumeData.education.length) {
            if (y > 260) { pdf.addPage(); y = 20; }
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
            pdf.text('Education', 20, y); y += 7;
            resumeData.education.forEach(function (edu) {
              pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
              pdf.text((edu.degree || '') + (edu.field ? ' in ' + edu.field : ''), 20, y); y += 5;
              pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
              pdf.text((edu.institution || '') + ' · ' + (edu.startDate || '') + ' — ' + (edu.endDate || ''), 20, y); y += 8;
            });
          }
          if (resumeData.skills && resumeData.skills.length) {
            if (y > 270) { pdf.addPage(); y = 20; }
            y += 5;
            pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12);
            pdf.text('Skills', 20, y); y += 7;
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
            var skillStr = resumeData.skills.map(function (s) { return typeof s === 'string' ? s : s.name; }).join(', ');
            var sLines = pdf.splitTextToSize(skillStr, 170);
            pdf.text(sLines, 20, y);
          }
          pdf.save((resumeData.title || 'resume') + '.pdf');
          Notify.success('PDF downloaded!');
        } catch (err) {
          console.error('PDF error:', err);
          Notify.error('PDF generation failed');
        }
        btn.disabled = false; btn.textContent = '📄 PDF';
      };

      document.getElementById('share-btn').onclick = function () {
        DB.publishResume(params.id, resumeData).then(function (publicId) {
          var url = window.location.origin + window.location.pathname + '#/share/' + publicId;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
          }
          Notify.success('Public link copied to clipboard!');
        }).catch(function () { Notify.error('Failed to create share link'); });
      };

      return function () {
        sortables.forEach(function (s) { s.destroy(); });
        sortables = [];
        currentResume = null;
        resumeData = null;
      };
    }).catch(function () {
      Notify.error('Resume not found');
      Router.navigate('/dashboard');
    });
  }

  function renderSections() {
    var sections = buildSections();
    var el = document.getElementById('builder-sections');
    if (!el) return;

    el.innerHTML = sections.map(function (s) {
      return '<div class="builder-section" data-section-id="' + s.id + '">' +
        '<div class="builder-section-header" data-toggle="' + s.id + '">' +
          '<div class="builder-section-title"><span class="builder-section-icon">' + s.icon + '</span> ' + s.title + '</div>' +
          '<span class="builder-section-toggle" id="toggle-' + s.id + '">▼</span>' +
        '</div>' +
        '<div class="builder-section-body" id="body-' + s.id + '">' + s.content + '</div>' +
      '</div>';
    }).join('');

    el.querySelectorAll('.builder-section-header').forEach(function (header) {
      header.onclick = function () {
        var id = header.dataset.toggle;
        var body = document.getElementById('body-' + id);
        var toggle = document.getElementById('toggle-' + id);
        body.classList.toggle('collapsed');
        toggle.classList.toggle('open');
      };
    });

    el.addEventListener('input', Utils.debounce(function (e) {
      var field = e.target.dataset.field;
      if (!field) return;
      if (field === 'skills-text') {
        resumeData.skills = e.target.value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      } else if (field === 'languages-text') {
        resumeData.languages = e.target.value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      } else if (field === 'achievements-text') {
        resumeData.achievements = e.target.value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
      } else if (field === 'interests-text') {
        resumeData.interests = e.target.value.split(',').map(function(s){ return s.trim(); }).filter(Boolean);
      } else {
        setField(resumeData, field, e.target.value);
      }
      triggerSave();
    }, 300));

    el.querySelectorAll('[data-action="add-entry"]').forEach(function (btn) {
      btn.onclick = function () {
        var section = btn.dataset.section;
        if (!resumeData[section]) resumeData[section] = [];
        var defaults = {
          experience: Utils.defaultExperience,
          education: Utils.defaultEducation,
          projects: Utils.defaultProject,
          certifications: Utils.defaultCertification
        };
        resumeData[section].push(defaults[section] ? defaults[section]() : {});
        renderSections();
        triggerSave();
      };
    });

    el.querySelectorAll('[data-action="delete-entry"]').forEach(function (btn) {
      btn.onclick = function () {
        var section = btn.dataset.section;
        var index = parseInt(btn.dataset.index);
        resumeData[section].splice(index, 1);
        renderSections();
        triggerSave();
      };
    });

    el.querySelectorAll('[data-action="duplicate-entry"]').forEach(function (btn) {
      btn.onclick = function () {
        var section = btn.dataset.section;
        var index = parseInt(btn.dataset.index);
        var clone = Utils.clone(resumeData[section][index]);
        clone.id = Utils.uid();
        resumeData[section].splice(index + 1, 0, clone);
        renderSections();
        triggerSave();
      };
    });

    el.querySelectorAll('.ai-btn').forEach(function (btn) {
      btn.onclick = function () {
        var aiType = btn.dataset.ai;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Working...';

        Subscription.canUseAI().then(function (canUse) {
          if (!canUse) {
            Notify.warning('AI limit reached. Upgrade to Pro.');
            btn.disabled = false;
            btn.textContent = aiType.replace(/-/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
            return;
          }

          var promise;
          if (aiType === 'generate-summary') promise = AI.generateSummary(resumeData);
          else if (aiType === 'improve-summary') promise = AI.improveText(resumeData.summary || '', 'professional');
          else if (aiType === 'fix-grammar-summary') promise = AI.improveText(resumeData.summary || '', 'grammar');
          else if (aiType === 'rewrite-experience' || aiType === 'improve-experience') promise = AI.rewriteExperience(resumeData.experience[parseInt(btn.dataset.index)]);
          else if (aiType === 'generate-skills') promise = AI.generateSkills(resumeData);
          else promise = Promise.reject(new Error('Unknown type'));

          promise.then(function (result) {
            if (!result || !result.data || !result.data.result) return;
            var text = result.data.result;
            var containerId;
            if (aiType.indexOf('summary') >= 0) containerId = 'ai-result-summary';
            else if (aiType.indexOf('experience') >= 0) containerId = 'ai-result-exp-' + btn.dataset.index;
            else containerId = 'ai-result-skills';

            var resultEl = document.getElementById(containerId);
            if (!resultEl) return;

            resultEl.innerHTML = '<div class="ai-result"><div>' + Utils.escapeHtml(text) + '</div>' +
              '<div class="ai-result-actions">' +
                '<button class="btn btn-sm btn-primary ai-accept">Accept</button>' +
                '<button class="btn btn-sm btn-secondary ai-reject">Reject</button>' +
                '<button class="btn btn-sm btn-ghost ai-copy">Copy</button>' +
              '</div></div>';

            resultEl.querySelector('.ai-accept').onclick = function () {
              if (aiType.indexOf('summary') >= 0) {
                resumeData.summary = text;
              } else if (aiType.indexOf('experience') >= 0) {
                resumeData.experience[parseInt(btn.dataset.index)].description = text;
              } else if (aiType === 'generate-skills') {
                try { var parsed = JSON.parse(text); resumeData.skills = Array.isArray(parsed) ? parsed : text.split(','); }
                catch (e) { resumeData.skills = text.split(',').map(function(s){ return s.trim().replace(/[\[\]"]/g, ''); }); }
              }
              renderSections();
              triggerSave();
              Notify.success('AI suggestion applied');
            };
            resultEl.querySelector('.ai-reject').onclick = function () { resultEl.innerHTML = ''; };
            resultEl.querySelector('.ai-copy').onclick = function () {
              if (navigator.clipboard) navigator.clipboard.writeText(text);
              Notify.success('Copied to clipboard');
            };
          }).catch(function (err) {
            console.error('AI error:', err);
            Notify.error('AI generation failed. Please try again.');
          }).then(function () {
            btn.disabled = false;
            btn.textContent = aiType.replace(/-/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
          });
        });
      };
    });

    sortables.forEach(function (s) { s.destroy(); });
    sortables = [];
    el.querySelectorAll('.sortable-list').forEach(function (list) {
      var sec = list.querySelector('[data-section]');
      if (!sec) return;
      var section = sec.dataset.section;
      var instance = new Sortable(list, {
        handle: '.entry-card-drag',
        animation: 200,
        onEnd: function (evt) {
          var arr = resumeData[section];
          var moved = arr.splice(evt.oldIndex, 1)[0];
          arr.splice(evt.newIndex, 0, moved);
          triggerSave();
        }
      });
      sortables.push(instance);
    });
  }

  Router.register('/builder/:id', renderBuilder);
  window.ResumeAI.BuilderPage = { renderTemplate: renderTemplate };
})();
