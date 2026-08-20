const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- mobile back/forward (bfcache) can restore an old scroll position
   even with history.scrollRestoration = 'manual' set in <head>; force
   back to top on restore when the URL has no hash to honor ---- */
window.addEventListener('pageshow', (e) => {
  if(e.persisted && !location.hash){ window.scrollTo(0, 0); }
});

/* ---- count-up ---- */
function animateCount(el){
  if(el.dataset.counted) return;
  el.dataset.counted = '1';
  const target = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const final = prefix + target.toFixed(decimals) + suffix;
  if(reducedMotion || isNaN(target)){ el.textContent = final; return; }
  const duration = 1500;
  const start = performance.now();
  function tick(now){
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
    if(p < 1) requestAnimationFrame(tick);
    else el.textContent = final;
  }
  requestAnimationFrame(tick);
}

/* ---- scroll reveal (+ count-up for any [data-count] inside a revealed block) ---- */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if(entry.isIntersecting){
      entry.target.classList.add('visible');
      entry.target.querySelectorAll('[data-count]').forEach(animateCount);
      observer.unobserve(entry.target);
    }
  });
}, {threshold: 0.15});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ---- card grids: staggered scroll-reveal cascade, same treatment on
   every page (results, services, about, testimonials, faq) ---- */
function staggerReveal(selector){
  const cards = document.querySelectorAll(selector);
  if(!cards.length) return;
  cards.forEach((card, i) => {
    card.style.transitionDelay = reducedMotion ? '0ms' : (i * 100) + 'ms';
  });
  if(reducedMotion){
    cards.forEach(card => card.classList.add('is-visible'));
    return;
  }
  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        cardObserver.unobserve(entry.target);
      }
    });
  }, {threshold: 0.15});
  cards.forEach(card => cardObserver.observe(card));
}
['.result-card', '.service-card', '.about-item', '.testimonial-card', '.faq-item', '.about-photo', '.field', '.form-submit'].forEach(staggerReveal);

/* ---- hero: cinematic growth reveal ---- */
const heroPhoto = document.getElementById('heroPhoto');
const heroIntro = document.querySelector('.hero-intro');
const heroName = document.getElementById('heroName');
const heroChip = document.querySelector('.hero-stat-chip .num');

if(heroName){
  const text = heroName.dataset.text || '';
  heroName.textContent = '';
  [...text].forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'char' + (ch === ' ' ? ' is-space' : '');
    span.textContent = ch === ' ' ? ' ' : ch;
    span.style.transitionDelay = (i * 28) + 'ms';
    heroName.appendChild(span);
  });
}

function revealHero(){
  if(heroIntro) heroIntro.classList.add('is-revealed');
  if(heroPhoto) heroPhoto.classList.add('is-revealed');
  if(heroChip) animateCount(heroChip);
}

if(heroPhoto || heroIntro){
  if(reducedMotion){
    revealHero();
  } else {
    // double rAF so the browser commits the initial (blurred/offset) state
    // before the transition to the revealed state is triggered
    requestAnimationFrame(() => requestAnimationFrame(revealHero));
  }
}

/* ---- hero background particles: subtle twinkle over the static bg image ---- */
(function(){
  const canvas = document.getElementById('heroBgParticles');
  if(!canvas || reducedMotion) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function resize(){
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width * dpr;
    canvas.height = r.height * dpr;
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
  }
  resize();
  window.addEventListener('resize', resize);
  const particles = Array.from({ length: 34 }, () => ({
    x: Math.random(), y: Math.random(),
    r: Math.random() * 1.4 + 0.4,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.6 + 0.3,
  }));
  function tick(t){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      const twinkle = (Math.sin(t * 0.0006 * p.speed + p.phase) + 1) / 2;
      ctx.beginPath();
      ctx.arc(p.x * canvas.width, p.y * canvas.height, p.r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150,190,255,${(0.12 + twinkle * 0.5).toFixed(2)})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* ---- post-entrance parallax: desktop pointer only, extremely subtle ---- */
const heroOrbit = document.getElementById('heroOrbit');
if(!reducedMotion && window.matchMedia('(pointer: fine)').matches && heroOrbit){
  const MAX = 10;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  heroOrbit.addEventListener('mousemove', (e) => {
    const r = heroOrbit.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width - 0.5) * MAX * 2;
    targetY = ((e.clientY - r.top) / r.height - 0.5) * MAX * 2;
  });
  heroOrbit.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });
  function loop(){
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    heroOrbit.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0)`;
    requestAnimationFrame(loop);
  }
  setTimeout(() => requestAnimationFrame(loop), 1900);
}

/* ---- theme toggle ---- */
(function(){
  const btn = document.getElementById('themeToggle');
  if(!btn) return;
  function current(){ return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }
  function apply(theme){
    document.documentElement.setAttribute('data-theme', theme);
    try{ localStorage.setItem('moses-theme', theme); }catch(e){}
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
  apply(current());
  btn.addEventListener('click', () => apply(current() === 'dark' ? 'light' : 'dark'));
})();

/* ---- services dropdown ---- */
(function(){
  const wrap = document.getElementById('servicesDropdown');
  const trigger = document.getElementById('servicesDropdownBtn');
  const panel = document.getElementById('servicesDropdownPanel');
  if(!wrap || !trigger || !panel) return;
  function open(){ wrap.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); }
  function close(){ wrap.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); }
  trigger.addEventListener('click', () => wrap.classList.contains('is-open') ? close() : open());
  document.addEventListener('click', (e) => { if(!wrap.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') close(); });
  panel.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      close();
      const href = a.getAttribute('href');
      const hashIdx = href.indexOf('#');
      if(hashIdx === -1) return;
      const id = href.slice(hashIdx + 1);
      const target = document.getElementById(id);
      if(target){
        target.classList.remove('flash');
        void target.offsetWidth; // restart the animation if it's already run once
        target.classList.add('flash');
      }
    });
  });
})();

/* ---- growth-plan wizard: step navigation ---- */
(function(){
  const form = document.getElementById('contactForm');
  const panels = form ? Array.from(form.querySelectorAll('.wizard-panel')) : [];
  if(!form || !panels.length) return;
  const stepBtns = Array.from(form.querySelectorAll('.wizard-step'));
  const fill = document.getElementById('wizardProgressFill');
  const total = panels.length;
  let current = 1;
  let maxReached = 1;

  function render(){
    panels.forEach(p => p.classList.toggle('is-active', Number(p.dataset.step) === current));
    stepBtns.forEach(btn => {
      const n = Number(btn.dataset.step);
      btn.classList.toggle('is-current', n === current);
      btn.classList.toggle('is-done', n < current);
      btn.disabled = n > maxReached;
    });
    if(fill) fill.style.width = ((current - 1) / (total - 1) * 100) + '%';
  }

  function goTo(n){
    current = Math.min(Math.max(n, 1), total);
    if(current > maxReached) maxReached = current;
    render();
    form.closest('.wizard-card').scrollIntoView({block:'nearest', behavior: reducedMotion ? 'auto' : 'smooth'});
  }

  // every question on a step must be answered before Next is allowed
  function validateStep(panel){
    let ok = true;
    let firstInvalid = null;
    const errorMsg = panel.querySelector('.wizard-error');
    panel.querySelectorAll('.wfield').forEach(field => {
      let fieldOk = true;

      field.querySelectorAll('input[required], select[required], textarea[required]').forEach(el => {
        if(el.offsetParent === null) return; // conditionally hidden, not this step's concern
        if(!el.value.trim()) fieldOk = false;
      });

      if(field.hasAttribute('data-required')){
        const checked = field.querySelectorAll('.pill-group input:checked');
        if(checked.length === 0){
          fieldOk = false;
        } else if(field.hasAttribute('data-other-group')){
          const isOther = Array.from(checked).some(c => c.value === 'Other');
          const otherInput = field.querySelector('.other-input');
          if(isOther && otherInput && !otherInput.value.trim()) fieldOk = false;
        }
      }

      field.classList.toggle('has-error', !fieldOk);
      if(!fieldOk){
        ok = false;
        if(!firstInvalid) firstInvalid = field.querySelector('input, select, textarea');
      }
    });
    if(errorMsg) errorMsg.hidden = ok;
    if(!ok && firstInvalid) firstInvalid.focus({preventScroll:true});
    return ok;
  }

  form.addEventListener('input', (e) => e.target.closest('.wfield.has-error')?.classList.remove('has-error'));
  form.addEventListener('change', (e) => e.target.closest('.wfield.has-error')?.classList.remove('has-error'));

  form.querySelectorAll('[data-wizard-next]').forEach(btn => btn.addEventListener('click', () => {
    const panel = btn.closest('.wizard-panel');
    if(!validateStep(panel)) return;
    goTo(current + 1);
  }));
  form.querySelectorAll('[data-wizard-back]').forEach(btn => btn.addEventListener('click', () => goTo(current - 1)));
  stepBtns.forEach(btn => btn.addEventListener('click', () => {
    const n = Number(btn.dataset.step);
    if(n <= maxReached) goTo(n);
  }));

  render();
})();

/* ---- growth-plan wizard: "Other" pill reveals a custom text input ---- */
(function(){
  document.querySelectorAll('.wfield[data-other-group]').forEach(wrap => {
    const otherInput = wrap.querySelector('.other-input');
    const inputs = wrap.querySelectorAll('.pill-group input');
    if(!otherInput || !inputs.length) return;
    function sync(){
      const isOther = Array.from(inputs).some(i => i.checked && i.value === 'Other');
      otherInput.hidden = !isOther;
      if(!isOther) otherInput.value = '';
    }
    inputs.forEach(i => i.addEventListener('change', sync));
    sync();
  });
})();

/* ---- growth-plan wizard: WhatsApp/Call reveals a phone number field ---- */
(function(){
  const group = document.getElementById('preferredContactGroup');
  const phoneField = document.getElementById('phoneField');
  const phoneInput = document.getElementById('w-phone');
  if(!group || !phoneField || !phoneInput) return;
  function sync(){
    const checked = group.querySelector('input:checked');
    const needsPhone = !!checked && (checked.value === 'WhatsApp' || checked.value === 'Call');
    phoneField.hidden = !needsPhone;
    phoneInput.required = needsPhone;
    if(!needsPhone) phoneInput.value = '';
  }
  group.querySelectorAll('input').forEach(i => i.addEventListener('change', sync));
  sync();
})();

/* ---- contact form: Formspree ---- */
(function(){
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if(!form || !status) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if(form.action.includes('YOUR_FORM_ID')){
      status.textContent = "This form needs a Formspree form ID before it can send. Create one free at formspree.io and drop the endpoint into the form's action attribute.";
      status.className = 'form-status error';
      return;
    }
    const btn = form.querySelector('.form-submit');
    const label = btn.querySelector('.btn-label');
    const originalLabel = label.textContent;
    btn.disabled = true;
    label.textContent = 'Sending…';
    status.textContent = '';
    status.className = 'form-status';
    try{
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: new FormData(form),
      });
      const data = await res.json();
      if(res.ok){
        status.textContent = "Sent. I'll get back to you within 1 hour.";
        status.className = 'form-status success';
        form.reset();
      } else {
        const message = (data.errors || []).map((e) => e.message).join(', ') || 'Something went wrong';
        throw new Error(message);
      }
    }catch(err){
      status.textContent = "Couldn't send that. Try again, or email me directly below.";
      status.className = 'form-status error';
    }finally{
      btn.disabled = false;
      label.textContent = originalLabel;
    }
  });
})();

/* ---- custom round cursor trail (desktop pointer only) ---- */
(function(){
  const ring = document.getElementById('cursorRing');
  const dot = document.getElementById('cursorDot');
  if(!ring || !dot || reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

  let ringX = 0, ringY = 0, targetX = 0, targetY = 0, started = false;

  document.addEventListener('mousemove', (e) => {
    targetX = e.clientX; targetY = e.clientY;
    dot.style.transform = `translate3d(${targetX - 3}px, ${targetY - 3}px, 0)`;
    if(!started){
      started = true;
      ringX = targetX; ringY = targetY;
      ring.classList.add('is-active');
      dot.classList.add('is-active');
    }
    const el = document.elementFromPoint(targetX, targetY);
    const interactive = el && el.closest('a, button, input, textarea, .service-card, .theme-toggle');
    ring.classList.toggle('is-hover', !!interactive);
  });
  document.addEventListener('mouseleave', () => {
    ring.classList.remove('is-active'); dot.classList.remove('is-active');
  });

  function loop(){
    ringX += (targetX - ringX) * 0.18;
    ringY += (targetY - ringY) * 0.18;
    ring.style.transform = `translate3d(${ringX - 16}px, ${ringY - 16}px, 0)`;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ---- hero headline: rotate YouTube / Twitch ---- */
(function(){
  const word = document.getElementById('rotatingWord');
  if(!word) return;
  const WORDS = ['YouTube', 'Twitch', 'YouTube'];
  let i = 0;
  if(reducedMotion) return;
  setInterval(() => {
    word.classList.add('is-swapping');
    setTimeout(() => {
      i = (i + 1) % WORDS.length;
      word.textContent = WORDS[i];
      word.classList.remove('is-swapping');
    }, 350);
  }, 2600);
})();

/* ---- mobile header: hamburger + sidebar drawer ---- */
(function(){
  const hamburgers = document.querySelectorAll('.nav-hamburger');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  const closeBtn = document.getElementById('mobileDrawerClose');
  if(!hamburgers.length || !drawer || !overlay) return;

  function open(){
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.classList.add('drawer-open');
    hamburgers.forEach(b => b.setAttribute('aria-expanded', 'true'));
  }
  function close(){
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    hamburgers.forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  hamburgers.forEach(b => b.addEventListener('click', open));
  overlay.addEventListener('click', close);
  if(closeBtn) closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') close(); });
  drawer.querySelectorAll('.mobile-drawer-links > a, .mobile-drawer-sublinks a').forEach((a) => {
    a.addEventListener('click', close);
  });

  const groupTrigger = document.getElementById('drawerServicesTrigger');
  const group = document.getElementById('drawerServicesGroup');
  if(groupTrigger && group){
    groupTrigger.addEventListener('click', () => {
      const isOpen = group.classList.toggle('is-open');
      groupTrigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }
})();

/* ---- mobile-friendly ambient video: force playback everywhere autoplay
   policies or an offscreen start can otherwise leave a frozen first frame,
   which is the usual reason a background/profile-glow video "changes" on
   desktop but sits static on a phone ---- */
(function(){
  const videos = Array.from(document.querySelectorAll(
    '.hero-bg-video, .hero-photo-glow, .about-bg-video, .about-photo-glow, .service-bg-video'
  ));
  if(!videos.length) return;
  function tryPlay(v){
    if(v.paused) v.play().catch(() => {});
  }
  videos.forEach(tryPlay);
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible') videos.forEach(tryPlay);
  });
  window.addEventListener('pageshow', () => videos.forEach(tryPlay));
  ['touchstart', 'click'].forEach((evt) => {
    document.addEventListener(evt, () => videos.forEach(tryPlay), { once: true, passive: true });
  });
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if(entry.isIntersecting) tryPlay(entry.target); });
    }, { threshold: 0.05 });
    videos.forEach((v) => io.observe(v));
  }
})();
