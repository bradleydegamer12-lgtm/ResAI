window.ResumeAI = window.ResumeAI || {};

(function () {
  var Router = window.ResumeAI.Router;
  var Auth   = window.ResumeAI.Auth;
  var DB     = window.ResumeAI.DB;
  var Notify = window.ResumeAI.Notify;
  var Utils  = window.ResumeAI.Utils;

  function renderLanding(container) {
    var user = Auth.currentUser;
    container.innerHTML =
      '<nav class="nav"><div class="nav-inner">' +
        '<a href="#/" class="nav-logo"><div class="nav-logo-icon">R</div>ResumeAI</a>' +
        '<div class="nav-links">' +
          '<a href="#features" class="nav-link">Features</a>' +
          '<a href="#pricing" class="nav-link">Pricing</a>' +
          (user
            ? '<a href="#/dashboard" class="btn btn-primary btn-sm">Dashboard</a>'
            : '<a href="#/login" class="nav-link">Log In</a><a href="#/signup" class="btn btn-primary btn-sm">Get Started</a>'
          ) +
        '</div>' +
        '<button class="nav-mobile-toggle btn btn-icon" onclick="this.parentElement.querySelector(\'.nav-links\').classList.toggle(\'open\')">☰</button>' +
      '</div></nav>' +

      '<section class="landing-hero"><div class="landing-hero-content">' +
        '<div class="landing-badge animate-in"><span class="landing-badge-dot"></span> AI-Powered Resume Builder</div>' +
        '<h1 class="animate-in animate-in-delay-1">Build Resumes That <span class="text-gradient">Get You Hired</span></h1>' +
        '<p class="animate-in animate-in-delay-2">Create professional, ATS-optimized resumes with intelligent AI assistance. Score, analyze, and perfect every detail.</p>' +
        '<div class="landing-cta animate-in animate-in-delay-3">' +
          '<a href="#/signup" class="btn btn-primary btn-lg">Start Building Free</a>' +
          '<a href="#features" class="btn btn-secondary btn-lg">See Features</a>' +
        '</div>' +
        '<div class="landing-stats animate-in animate-in-delay-4">' +
          '<div><div class="landing-stat-num">50K+</div><div class="landing-stat-label">Resumes Created</div></div>' +
          '<div><div class="landing-stat-num">94%</div><div class="landing-stat-label">ATS Pass Rate</div></div>' +
          '<div><div class="landing-stat-num">8</div><div class="landing-stat-label">Pro Templates</div></div>' +
        '</div>' +
      '</div></section>' +

      '<section id="features" class="section"><div class="container">' +
        '<div class="section-header"><h2>Everything You Need</h2><p>Powerful tools to build, optimize, and perfect your resume</p></div>' +
        '<div class="grid-3">' +
          [
            { icon: '🤖', title: 'AI Writing Assistant', desc: 'Generate summaries, improve descriptions, and fix grammar with intelligent AI suggestions.' },
            { icon: '📊', title: 'Resume Scoring', desc: 'Get detailed scores for content, ATS compatibility, skills, and formatting with actionable feedback.' },
            { icon: '🎯', title: 'ATS Checker', desc: 'Compare your resume against job descriptions to find matching and missing keywords.' },
            { icon: '📄', title: '8 Pro Templates', desc: 'Choose from Modern, Minimal, Professional, Executive, Creative, Student, Developer, and Corporate.' },
            { icon: '💾', title: 'Auto-Save', desc: 'Never lose your work. Changes save automatically with offline backup support.' },
            { icon: '📤', title: 'PDF Export', desc: 'Download pixel-perfect PDFs ready for submission. Print-optimized layouts.' }
          ].map(function (f, i) {
            return '<div class="feature-card animate-in" style="animation-delay:' + (i * 0.1) + 's">' +
              '<div class="feature-icon">' + f.icon + '</div><h3>' + f.title + '</h3><p>' + f.desc + '</p></div>';
          }).join('') +
        '</div></div></section>' +

      '<section id="pricing" class="section" style="background:var(--bg-secondary)"><div class="container">' +
        '<div class="section-header"><h2>Simple Pricing</h2><p>Start free, upgrade when you need more</p></div>' +
        '<div class="grid-2" style="max-width:800px;margin:0 auto">' +
          '<div class="pricing-card"><h3>Free</h3><div class="pricing-price">$0 <span>/month</span></div>' +
            '<ul class="pricing-features">' +
              '<li><span class="check">✓</span> 1 Resume</li>' +
              '<li><span class="check">✓</span> 15 AI generations/month</li>' +
              '<li><span class="check">✓</span> Basic templates</li>' +
              '<li><span class="check">✓</span> PDF download</li>' +
              '<li><span class="cross">✕</span> Premium templates</li>' +
              '<li><span class="cross">✕</span> ATS checker</li>' +
            '</ul>' +
            '<a href="#/signup" class="btn btn-secondary" style="width:100%">Get Started</a></div>' +
          '<div class="pricing-card popular"><div class="pricing-badge">Most Popular</div>' +
            '<h3>Pro</h3><div class="pricing-price">$12 <span>/month</span></div>' +
            '<ul class="pricing-features">' +
              '<li><span class="check">✓</span> Unlimited Resumes</li>' +
              '<li><span class="check">✓</span> Unlimited AI generations</li>' +
              '<li><span class="check">✓</span> All 8 templates</li>' +
              '<li><span class="check">✓</span> PDF download</li>' +
              '<li><span class="check">✓</span> ATS checker</li>' +
              '<li><span class="check">✓</span> AI career assistant</li>' +
            '</ul>' +
            '<a href="#/signup" class="btn btn-primary" style="width:100%">Start Pro Trial</a></div>' +
        '</div></div></section>' +

      '<footer class="footer"><div class="container"><p>&copy; ' + new Date().getFullYear() + ' ResumeAI. All rights reserved.</p></div></footer>';
  }

  function renderLogin(container) {
    container.innerHTML =
      '<div class="auth-page"><div class="auth-card">' +
        '<div class="auth-logo"><a href="#/">R<span>AI</span></a></div>' +
        '<h2 style="text-align:center;margin-bottom:24px">Welcome Back</h2>' +
        '<div id="auth-error" class="form-error" style="text-align:center;margin-bottom:16px;display:none"></div>' +
        '<button id="google-btn" class="btn btn-secondary" style="width:100%;margin-bottom:4px">Continue with Google</button>' +
        '<div class="auth-divider">or</div>' +
        '<form id="login-form">' +
          '<div class="form-group"><label class="form-label" for="login-email">Email</label>' +
            '<input type="email" id="login-email" class="form-input" placeholder="you@example.com" required></div>' +
          '<div class="form-group"><label class="form-label" for="login-password">Password</label>' +
            '<input type="password" id="login-password" class="form-input" placeholder="Your password" required></div>' +
          '<div style="text-align:right;margin-bottom:20px"><a href="#/forgot-password" style="font-size:0.85rem;color:var(--accent-light)">Forgot password?</a></div>' +
          '<button type="submit" class="btn btn-primary" style="width:100%" id="login-submit">Log In</button>' +
        '</form>' +
        '<div class="auth-footer">Don\'t have an account? <a href="#/signup">Sign up</a></div>' +
      '</div></div>';

    document.getElementById('google-btn').onclick = function () {
      Auth.signInWithGoogle().then(function () {
        Notify.success('Welcome back!');
        Router.navigate('/dashboard');
      }).catch(function (err) {
        var el = document.getElementById('auth-error');
        el.textContent = err.message; el.style.display = 'block';
      });
    };

    document.getElementById('login-form').onsubmit = function (e) {
      e.preventDefault();
      var btn = document.getElementById('login-submit');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Logging in...';
      Auth.signIn(document.getElementById('login-email').value, document.getElementById('login-password').value)
        .then(function () {
          Notify.success('Welcome back!');
          Router.navigate('/dashboard');
        }).catch(function (err) {
          var el = document.getElementById('auth-error');
          el.textContent = err.code === 'auth/invalid-credential' ? 'Invalid email or password' : err.message;
          el.style.display = 'block';
          btn.disabled = false; btn.textContent = 'Log In';
        });
    };
  }

  function renderSignup(container) {
    container.innerHTML =
      '<div class="auth-page"><div class="auth-card">' +
        '<div class="auth-logo"><a href="#/">R<span>AI</span></a></div>' +
        '<h2 style="text-align:center;margin-bottom:24px">Create Account</h2>' +
        '<div id="auth-error" class="form-error" style="text-align:center;margin-bottom:16px;display:none"></div>' +
        '<button id="google-btn" class="btn btn-secondary" style="width:100%;margin-bottom:4px">Continue with Google</button>' +
        '<div class="auth-divider">or</div>' +
        '<form id="signup-form">' +
          '<div class="form-group"><label class="form-label" for="signup-name">Full Name</label>' +
            '<input type="text" id="signup-name" class="form-input" placeholder="John Doe" required></div>' +
          '<div class="form-group"><label class="form-label" for="signup-email">Email</label>' +
            '<input type="email" id="signup-email" class="form-input" placeholder="you@example.com" required></div>' +
          '<div class="form-group"><label class="form-label" for="signup-password">Password</label>' +
            '<input type="password" id="signup-password" class="form-input" placeholder="Min 6 characters" required minlength="6"></div>' +
          '<button type="submit" class="btn btn-primary" style="width:100%" id="signup-submit">Create Account</button>' +
        '</form>' +
        '<div class="auth-footer">Already have an account? <a href="#/login">Log in</a></div>' +
      '</div></div>';

    document.getElementById('google-btn').onclick = function () {
      Auth.signInWithGoogle().then(function () {
        Notify.success('Account created!');
        Router.navigate('/dashboard');
      }).catch(function (err) {
        var el = document.getElementById('auth-error');
        el.textContent = err.message; el.style.display = 'block';
      });
    };

    document.getElementById('signup-form').onsubmit = function (e) {
      e.preventDefault();
      var btn = document.getElementById('signup-submit');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Creating account...';
      Auth.signUp(
        document.getElementById('signup-email').value,
        document.getElementById('signup-password').value,
        document.getElementById('signup-name').value
      ).then(function () {
        Notify.success('Account created! Check your email for verification.');
        Router.navigate('/dashboard');
      }).catch(function (err) {
        var el = document.getElementById('auth-error');
        el.textContent = err.code === 'auth/email-already-in-use' ? 'Email already registered' : err.message;
        el.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Create Account';
      });
    };
  }

  function renderForgotPassword(container) {
    container.innerHTML =
      '<div class="auth-page"><div class="auth-card">' +
        '<div class="auth-logo"><a href="#/">R<span>AI</span></a></div>' +
        '<h2 style="text-align:center;margin-bottom:8px">Reset Password</h2>' +
        '<p style="text-align:center;color:var(--text-muted);margin-bottom:24px;font-size:0.9rem">Enter your email and we\'ll send a reset link</p>' +
        '<div id="auth-error" class="form-error" style="text-align:center;margin-bottom:16px;display:none"></div>' +
        '<div id="auth-success" style="text-align:center;margin-bottom:16px;display:none;color:var(--success);font-size:0.9rem"></div>' +
        '<form id="reset-form">' +
          '<div class="form-group"><label class="form-label" for="reset-email">Email</label>' +
            '<input type="email" id="reset-email" class="form-input" placeholder="you@example.com" required></div>' +
          '<button type="submit" class="btn btn-primary" style="width:100%" id="reset-submit">Send Reset Link</button>' +
        '</form>' +
        '<div class="auth-footer"><a href="#/login">Back to login</a></div>' +
      '</div></div>';

    document.getElementById('reset-form').onsubmit = function (e) {
      e.preventDefault();
      var btn = document.getElementById('reset-submit');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Sending...';
      Auth.resetPassword(document.getElementById('reset-email').value).then(function () {
        document.getElementById('auth-success').textContent = 'Reset link sent! Check your inbox.';
        document.getElementById('auth-success').style.display = 'block';
        btn.textContent = 'Sent!';
      }).catch(function (err) {
        var el = document.getElementById('auth-error');
        el.textContent = err.message; el.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Send Reset Link';
      });
    };
  }

  function renderShare(container, params) {
    DB.getPublicResume(params.id).then(function (resume) {
      var tpl = resume.template || 'modern';
      container.innerHTML =
        '<nav class="nav"><div class="nav-inner">' +
          '<a href="#/" class="nav-logo"><div class="nav-logo-icon">R</div>ResumeAI</a>' +
          '<div class="nav-links"><a href="#/signup" class="btn btn-primary btn-sm">Create Your Own</a></div>' +
        '</div></nav>' +
        '<div style="padding:calc(var(--nav-height) + 32px) 24px 48px;display:flex;justify-content:center">' +
          '<div class="resume-preview-container" id="shared-preview"></div>' +
        '</div>';
      var previewEl = document.getElementById('shared-preview');
      if (window.ResumeAI.BuilderPage) {
        previewEl.innerHTML = window.ResumeAI.BuilderPage.renderTemplate(resume, tpl);
      } else {
        previewEl.innerHTML = '<p style="padding:40px;text-align:center">Loading resume...</p>';
      }
    }).catch(function () {
      container.innerHTML =
        '<div style="padding:120px 24px;text-align:center">' +
          '<h2>Resume Not Found</h2>' +
          '<p style="color:var(--text-muted);margin-top:12px">This resume may have been made private or deleted.</p>' +
          '<br><a href="#/" class="btn btn-primary">Go Home</a>' +
        '</div>';
    });
  }

  Router.register('/', renderLanding);
  Router.register('/login', renderLogin);
  Router.register('/signup', renderSignup);
  Router.register('/forgot-password', renderForgotPassword);
  Router.register('/share/:id', renderShare);

  window.ResumeAI.LandingPages = { renderLanding: renderLanding };
})();
