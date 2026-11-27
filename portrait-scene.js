(() => {
  const stage = document.querySelector('.hero-portrait-wrap');
  const canvas = stage?.querySelector('.portrait-motion');
  const context = canvas?.getContext('2d');
  if (!context) return;

  const hero = stage.closest('.hero');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const tau = Math.PI * 2;
  const duration = 3.6;
  const sampleCount = 120;
  const contours = [
    { radius: 1, tilt: -.22, phase: 3.75, travel: 3.25, reach: 2.45, weight: 2.8, color: '180,159,255' },
    { radius: .92, tilt: .17, phase: .48, travel: -2.25, reach: 2.02, weight: 2.2, color: '205,255,101' },
    { radius: 1.12, tilt: -.38, phase: 4.25, travel: 2.74, reach: 1.92, weight: 1.5, color: '137,159,255' }
  ];
  const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const theta = index * tau / sampleCount;
    return { theta, cosine: Math.cos(theta), sine: Math.sin(theta) };
  });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let width = 0;
  let height = 0;
  let clock = preference.matches ? duration : 0;
  let lastFrame = 0;
  let frame = 0;
  let visible = true;
  let scroll = 0;
  let scrollTarget = 0;
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;

  function draw() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round';

    const progress = clock / duration;
    const sweep = progress * progress * (3 - 2 * progress);
    const bloom = Math.sin(Math.PI * progress);
    const camera = .15 + scroll * .62 + y * .13;
    const sin = Math.sin(camera);
    const cos = Math.cos(camera);
    const cx = width * .5 + x * 15;
    const cy = height * .49 + scroll * 19 + y * 11;
    const baseX = width * .368;
    const baseY = height * .33;
    const focalLength = Math.max(width, height) * 1.5;

    contours.forEach((contour, index) => {
      const spin = contour.tilt + x * .15 + scroll * (index - 1) * .16;
      const sinSpin = Math.sin(spin);
      const cosSpin = Math.cos(spin);
      const points = samples.map(({ theta, cosine, sine }) => {
        const wave = Math.cos(theta * 2 - sweep * 1.9 + index * .6);
        const px = cosine * baseX * contour.radius;
        const py = sine * baseY * contour.radius * (1 + wave * (.1 + bloom * .14));
        const depth = py * sin + wave * baseX * .19;
        const scale = 1 / (1 - depth / focalLength);
        const projectedY = py * cos;
        return {
          x: cx + (px * cosSpin - projectedY * sinSpin) * scale,
          y: cy + (px * sinSpin + projectedY * cosSpin) * scale,
          scale
        };
      });
      const head = contour.phase + sweep * contour.travel + scroll * 2.3 + x * .36;
      const direction = Math.sign(contour.travel);
      for (let i = 0; i < sampleCount; i++) {
        const angle = (samples[i].theta + samples[i + 1].theta) / 2;
        const distance = ((head - angle) * direction + 2 * tau) % tau;
        if (distance > contour.reach) continue;

        const strength = Math.sin(distance * Math.PI / contour.reach) ** 1.4;
        const point = points[i];
        const next = points[i + 1];
        const depthStrength = clamp((point.scale - .9) * 3.8, .32, 1);
        const brightness = strength * depthStrength * (.8 + bloom * .2);
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(next.x, next.y);
        context.strokeStyle = `rgba(${contour.color},${.09 * brightness})`;
        context.lineWidth = 5 + 15 * strength;
        context.stroke();
        context.strokeStyle = `rgba(${contour.color},${.24 * brightness})`;
        context.lineWidth = 2 + 5 * strength;
        context.stroke();
        context.strokeStyle = `rgba(${contour.color},${.96 * brightness})`;
        context.lineWidth = .45 + contour.weight * strength;
        context.stroke();
      }
    });
  }

  function measure() {
    const rect = hero.getBoundingClientRect();
    scrollTarget = clamp(-rect.top / Math.max(rect.height * .85, 1), 0, 1);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    measure();
    draw();
    schedule();
  }

  function applyCamera() {
    stage.style.setProperty('--scene-x', (x * 8).toFixed(2) + 'px');
    stage.style.setProperty('--scene-y', (y * 6 - scroll * 29).toFixed(2) + 'px');
    stage.style.setProperty('--scene-tilt-x', (y * -4).toFixed(2) + 'deg');
    stage.style.setProperty('--scene-tilt-y', (x * 6).toFixed(2) + 'deg');
    hero.style.setProperty('--grid-y', (scroll * 34).toFixed(2) + 'px');
  }

  function drawFrame(now) {
    frame = 0;
    const elapsed = lastFrame ? clamp((now - lastFrame) / 1000, 0, .044) : 1 / 60;
    lastFrame = now;
    const ease = 1 - Math.exp(-elapsed * 7);
    const settle = (position, target) => Math.abs(target - position) < .002
      ? target
      : position + (target - position) * ease;
    x = settle(x, targetX);
    y = settle(y, targetY);
    scroll = settle(scroll, scrollTarget);
    clock = Math.min(duration, clock + elapsed);
    applyCamera();
    draw();
    if (clock < duration || x !== targetX || y !== targetY || scroll !== scrollTarget) {
      schedule();
    } else {
      lastFrame = 0;
    }
  }

  function schedule() {
    if (preference.matches || !visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = lastFrame = 0;
      return;
    }
    if (!frame) frame = requestAnimationFrame(drawFrame);
  }

  stage.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || preference.matches) return;
    const rect = stage.getBoundingClientRect();
    targetX = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    targetY = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    schedule();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => {
    targetX = targetY = 0;
    schedule();
  });
  window.addEventListener('scroll', () => {
    measure();
    schedule();
  }, { passive: true });
  document.addEventListener('visibilitychange', schedule);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    }).observe(stage);
  }

  preference.addEventListener('change', () => {
    if (preference.matches) {
      x = y = targetX = targetY = scroll = 0;
      clock = duration;
      applyCamera();
      draw();
    }
    schedule();
  });

  resize();
  stage.dataset.sceneReady = 'true';
})();
