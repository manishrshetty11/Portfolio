(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const menuButton = document.querySelector('.menu-button');
  const mobileNav = document.querySelector('.mobile-nav');
  const glow = document.querySelector('.cursor-glow');
  const progress = document.querySelector('.scroll-line');

  function closeMenu() {
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    mobileNav.classList.remove('open');
    mobileNav.inert = true;
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mobileNav.classList.toggle('open', open);
    mobileNav.inert = !open;
  });
  mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu(); menuButton.focus();
    }
  });
  document.addEventListener('click', event => {
    if (menuButton.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) closeMenu();
  });

  let scrollPending = false;
  function drawProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    scrollPending = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollPending) { scrollPending = true; requestAnimationFrame(drawProgress); }
  }, { passive: true });
  window.addEventListener('resize', drawProgress, { passive: true });
  drawProgress();

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  document.querySelectorAll('.reveal, .project-card').forEach(el => observer.observe(el));

  const countTarget = document.querySelector('[data-count]');
  if (countTarget && !reduceMotion.matches) {
    const countObserver = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      countObserver.disconnect();
      const target = Number(countTarget.dataset.count);
      const start = performance.now();
      const duration = 1500;
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        countTarget.textContent = Math.round(target * eased).toLocaleString('en-IN');
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }, { threshold: 0.4 });
    countObserver.observe(countTarget);
  }

  if (!reduceMotion.matches && finePointer.matches) {
    let pointerX = window.innerWidth / 2, pointerY = window.innerHeight / 2;
    let currentX = pointerX, currentY = pointerY, active = false;
    document.addEventListener('pointermove', event => {
      pointerX = event.clientX; pointerY = event.clientY;
      if (!active) { active = true; glow.style.opacity = '1'; requestAnimationFrame(animateGlow); }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { glow.style.opacity = '0'; active = false; });
    function animateGlow() {
      if (!active || document.hidden) { active = false; return; }
      currentX += (pointerX - currentX) * .14;
      currentY += (pointerY - currentY) * .14;
      glow.style.transform = `translate3d(${currentX - 260}px,${currentY - 260}px,0)`;
      requestAnimationFrame(animateGlow);
    }

  }

  const motionChanged = () => {
    if (reduceMotion.matches) {
      glow.style.opacity = '0';
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    }
  };
  reduceMotion.addEventListener('change', motionChanged);
})();
