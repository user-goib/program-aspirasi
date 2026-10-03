(() => {
    const canvas = document.getElementById("stars");
    if (!canvas) return;
  
    const ctx = canvas.getContext("2d", { alpha: true });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
  
    let W = 0, H = 0;
    let stars = [];
    let rafId = null;
    let running = false;
  
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  
    const isDark = () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches;
  
    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }
  
    function buildStars() {
      const count = Math.min(220, Math.max(60, Math.floor((W * H) / 9000)));
      stars = new Array(count).fill(0).map(() => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.1 + 0.25,
        base: Math.random() * 0.55 + 0.15,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.7 + 0.25,
        vx: (Math.random() - 0.5) * 0.015,
        vy: (Math.random() - 0.5) * 0.015,
      }));
    }
  
    function render(time) {
      const t = time * 0.001;
      const dark = isDark();
      const rgb = dark ? "255,255,255" : "20,20,24";
      const alphaMul = dark ? 1 : 0.35;
  
      ctx.clearRect(0, 0, W, H);
  
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const alpha = s.base * (0.35 + 0.65 * twinkle) * alphaMul;
  
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + rgb + "," + alpha.toFixed(3) + ")";
        ctx.fill();
  
        s.x += s.vx;
        s.y += s.vy;
  
        if (s.x < -2) s.x = W + 2;
        else if (s.x > W + 2) s.x = -2;
        if (s.y < -2) s.y = H + 2;
        else if (s.y > H + 2) s.y = -2;
      }
    }
  
    function loop(time) {
      if (!running) return;
      render(time);
      rafId = requestAnimationFrame(loop);
    }
  
    function start() {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    }
  
    function stop() {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }
  
    function drawStatic() {
      const dark = isDark();
      const rgb = dark ? "255,255,255" : "20,20,24";
      const alphaMul = dark ? 1 : 0.35;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + rgb + "," + (s.base * alphaMul).toFixed(3) + ")";
        ctx.fill();
      }
    }
  
    resize();
  
    if (prefersReduced) {
      drawStatic();
    } else {
      start();
    }
  
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (prefersReduced) drawStatic();
      }, 150);
    });
  
    document.addEventListener("visibilitychange", () => {
      if (prefersReduced) return;
      document.hidden ? stop() : start();
    });
  
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (prefersReduced) drawStatic();
      });
  })();