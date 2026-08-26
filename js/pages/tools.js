window.ResumeAI = window.ResumeAI || {};

(function () {
  var Router = window.ResumeAI.Router;
  var Auth   = window.ResumeAI.Auth;
  var AI     = window.ResumeAI.AI;
  var DB     = window.ResumeAI.DB;
  var Notify = window.ResumeAI.Notify;
  var Utils  = window.ResumeAI.Utils;
  var Subscription = window.ResumeAI.Subscription;
  var navFns = window.ResumeAI.DashboardPage;

  function renderAIAssistant(container) {
    if (!Auth.currentUser) { Router.navigate('/login'); return; }

    container.innerHTML = navFns.renderNav('ai') +
      '<div class="ai-chat">' +
        '<div class="ai-chat-header">' +
          '<h3>AI Career Assistant</h3>' +
          '<p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px">Ask anything about your resume, career, or job search</p>' +
        '</div>' +
        '<div class="ai-chat-messages" id="chat-messages">' +
          '<div class="ai-msg assistant">Hello! I\'m your AI career assistant. I can help you improve your resume, suggest skills, prepare for interviews, and more. What would you like help with?</div>' +
        '</div>' +
        '<div class="ai-suggestions" id="ai-suggestions">' +
          '<button class="ai-suggestion">How can I improve my resume?</button>' +
          '<button class="ai-suggestion">What skills should I add?</button>' +
          '<button class="ai-suggestion">Help me write a summary</button>' +
          '<button class="ai-suggestion">Why is my resume score low?</button>' +
        '</div>' +
        '<div class="ai-chat-input-area">' +
          '<textarea class="ai-chat-input" id="chat-input" placeholder="Ask me anything..." rows="1"></textarea>' +
          '<button class="btn btn-primary" id="chat-send">Send</button>' +
        '</div>' +
      '</div>';

    navFns.setupNavDropdown();

    var messagesEl = document.getElementById('chat-messages');
    var inputEl = document.getElementById('chat-input');
    var sendBtn = document.getElementById('chat-send');

    function addMessage(role, text) {
      var div = document.createElement('div');
      div.className = 'ai-msg ' + role;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function showTyping() {
      var div = document.createElement('div');
      div.className = 'ai-msg assistant';
      div.id = 'typing-indicator';
      div.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function hideTyping() {
      var el = document.getElementById('typing-indicator');
      if (el) el.remove();
    }

    function sendMessage(text) {
      if (!text.trim()) return;
      addMessage('user', text);
      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;
      showTyping();

      Subscription.canUseAI().then(function (canUse) {
        if (!canUse) {
          hideTyping();
          addMessage('assistant', 'You\'ve reached your AI usage limit. Upgrade to Pro for unlimited access.');
          sendBtn.disabled = false;
          return;
        }
        return AI.chat(text).then(function (result) {
          hideTyping();
          var response = (result && result.data && result.data.result) ? result.data.result : 'Sorry, I couldn\'t generate a response. Please try again.';
          addMessage('assistant', response);
        }).catch(function () {
          hideTyping();
          addMessage('assistant', 'Something went wrong. Please try again.');
        });
      }).then(function () {
        sendBtn.disabled = false;
      });
    }

    sendBtn.onclick = function () { sendMessage(inputEl.value); };
    inputEl.onkeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); }
    };
    inputEl.oninput = function () {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    };

    document.querySelectorAll('.ai-suggestion').forEach(function (btn) {
      btn.onclick = function () { sendMessage(btn.textContent); };
    });
  }

  function renderATSChecker(container) {
    if (!Auth.currentUser) { Router.navigate('/login'); return; }

    DB.getUserResumes(Auth.currentUser.uid).then(function (resumes) {
      container.innerHTML = navFns.renderNav('ats') +
        '<div class="ats-page container">' +
          '<div class="section-header">' +
            '<h2>ATS Resume Checker</h2>' +
            '<p>Compare your resume against a job description to find matching and missing keywords</p>' +
          '</div>' +
          '<div class="ats-inputs">' +
            '<div>' +
              '<div class="form-group"><label class="form-label">Select Resume</label>' +
                '<select class="form-select" id="ats-resume-select">' +
                  '<option value="">Choose a resume...</option>' +
                  resumes.map(function (r) { return '<option value="' + r.id + '">' + Utils.escapeHtml(r.title) + '</option>'; }).join('') +
                '</select></div>' +
              '<div class="form-group"><label class="form-label">Or paste resume text</label>' +
                '<textarea class="form-textarea" id="ats-resume-text" rows="8" placeholder="Paste your resume content here..."></textarea></div>' +
            '</div>' +
            '<div>' +
              '<div class="form-group"><label class="form-label">Job Description</label>' +
                '<textarea class="form-textarea" id="ats-job-text" rows="14" placeholder="Paste the job description here..."></textarea></div>' +
            '</div>' +
          '</div>' +
          '<div style="text-align:center;margin-bottom:32px">' +
            '<button class="btn btn-primary btn-lg" id="ats-analyze-btn">Analyze Resume</button>' +
          '</div>' +
          '<div id="ats-result" style="display:none"></div>' +
        '</div>';

      navFns.setupNavDropdown();

      var resumeSelect = document.getElementById('ats-resume-select');
      var resumeText = document.getElementById('ats-resume-text');
      var jobText = document.getElementById('ats-job-text');
      var analyzeBtn = document.getElementById('ats-analyze-btn');

      resumeSelect.onchange = function () {
        if (!resumeSelect.value) return;
        DB.getResume(resumeSelect.value).then(function (r) {
          var parts = [];
          if (r.personalInformation && r.personalInformation.fullName) parts.push(r.personalInformation.fullName);
          if (r.summary) parts.push(r.summary);
          (r.experience || []).forEach(function (e) { parts.push([e.position, e.company, e.description].filter(Boolean).join(' ')); });
          (r.education || []).forEach(function (e) { parts.push([e.degree, e.field, e.institution].filter(Boolean).join(' ')); });
          (r.skills || []).forEach(function (s) { parts.push(typeof s === 'string' ? s : s.name); });
          resumeText.value = parts.filter(Boolean).join('\n');
        }).catch(function () {});
      };

      analyzeBtn.onclick = function () {
        var resumeContent = resumeText.value.trim();
        var jobContent = jobText.value.trim();
        if (!resumeContent) { Notify.warning('Please select or paste a resume'); return; }
        if (!jobContent) { Notify.warning('Please paste a job description'); return; }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="spinner"></span> Analyzing...';

        Subscription.canUseAI().then(function (canUse) {
          if (!canUse) {
            Notify.warning('AI limit reached. Upgrade to Pro.');
            return;
          }

          return AI.atsAnalysis({ summary: resumeContent }, jobContent).then(function (result) {
            var raw = (result && result.data && result.data.result) ? result.data.result : '{}';
            var data;
            try { data = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { data = {}; }

            var matchPercent = data.matchPercent || 0;
            var matching = data.matchingKeywords || [];
            var missing = data.missingKeywords || [];
            var suggestions = data.suggestions || [];

            var resultEl = document.getElementById('ats-result');
            resultEl.style.display = 'block';
            resultEl.innerHTML =
              '<div class="ats-result">' +
                '<div class="ats-score-circle" style="--score:' + matchPercent + '">' +
                  '<span>' + matchPercent + '%</span>' +
                  '<span style="font-size:0.7rem;font-weight:400;color:var(--text-muted)">Match</span>' +
                '</div>' +
                '<div class="grid-2" style="margin-bottom:24px">' +
                  '<div><h4 style="color:var(--success);margin-bottom:12px">✓ Matching Keywords</h4>' +
                    '<div class="ats-keywords">' +
                      (matching.length ? matching.map(function (k) { return '<span class="ats-keyword-match found">' + Utils.escapeHtml(k) + '</span>'; }).join('') : '<span style="color:var(--text-muted)">None found</span>') +
                    '</div></div>' +
                  '<div><h4 style="color:var(--error);margin-bottom:12px">✕ Missing Keywords</h4>' +
                    '<div class="ats-keywords">' +
                      (missing.length ? missing.map(function (k) { return '<span class="ats-keyword-match missing">' + Utils.escapeHtml(k) + '</span>'; }).join('') : '<span style="color:var(--text-muted)">None found</span>') +
                    '</div></div>' +
                '</div>' +
                (suggestions.length ?
                  '<div><h4 style="margin-bottom:12px">💡 Suggestions</h4>' +
                  '<ul style="list-style:none;padding:0">' +
                    suggestions.map(function (s) { return '<li style="padding:8px 0;color:var(--text-secondary);font-size:0.9rem;border-bottom:1px solid var(--border)">• ' + Utils.escapeHtml(s) + '</li>'; }).join('') +
                  '</ul></div>' : '') +
                '<p style="margin-top:20px;font-size:0.8rem;color:var(--text-muted);text-align:center">This analysis is for informational purposes only and does not guarantee employment outcomes.</p>' +
              '</div>';
          }).catch(function (err) {
            console.error('ATS error:', err);
            Notify.error('Analysis failed. Please try again.');
          });
        }).then(function () {
          analyzeBtn.disabled = false;
          analyzeBtn.textContent = 'Analyze Resume';
        });
      };
    }).catch(function () {
      container.innerHTML = navFns.renderNav('ats') +
        '<div class="ats-page container"><div class="section-header"><h2>ATS Checker</h2><p>Failed to load resumes. Please try again.</p></div></div>';
      navFns.setupNavDropdown();
    });
  }

  Router.register('/ai-assistant', renderAIAssistant);
  Router.register('/ats-checker', renderATSChecker);
})();
