// BUSTED - Premium Home Screen Canvas Art
// Renders an animated interrogation room / crime scene in real-time
(function() {
  const canvas = document.createElement('canvas');
  canvas.id = 'home-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
  const homeScreen = document.getElementById('screen-home');
  if (!homeScreen) return;
  homeScreen.insertBefore(canvas, homeScreen.firstChild);
  
  let W, H, ctx;
  const PHOTOS = 5;
  const STRINGS = 7;
  let time = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resize);
  resize();

  // Evidence photo positions
  function getPhotos() {
    const pw = Math.min(80, W * 0.12);
    const ph = Math.min(100, H * 0.1);
    const positions = [
      { x: W * 0.08, y: H * 0.1, rot: -8 },
      { x: W * 0.18, y: H * 0.28, rot: 5 },
      { x: W * 0.06, y: H * 0.55, rot: -3 },
      { x: W * 0.82, y: H * 0.15, rot: 6 },
      { x: W * 0.88, y: H * 0.45, rot: -4 },
    ];
    return positions.map((p, i) => ({
      ...p, w: pw, h: ph,
      color: ['#FF2E88','#2EFFEA','#FFD93D','#FF2E88','#2EFFEA'][i],
      label: ['EVIDENCIA A','EVIDENCIA B','EVIDENCIA C','TESTIMONIO','HUELLA'][i]
    }));
  }

  // String connections between evidence
  function getStrings(photos) {
    const strings = [];
    for (let i = 0; i < photos.length - 1; i++) {
      for (let j = i + 1; j < photos.length; j++) {
        if (Math.random() < 0.5) {
          strings.push({ from: i, to: j, age: Math.random() * 100 });
        }
      }
    }
    return strings;
  }

  function draw() {
    if (!ctx) return;
    time += 0.016;
    ctx.clearRect(0, 0, W, H);

    // ── Background gradient ──
    const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.7);
    bgGrad.addColorStop(0, '#12121A');
    bgGrad.addColorStop(0.4, '#0E0E16');
    bgGrad.addColorStop(1, '#08080C');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Grid ──
    ctx.save();
    ctx.translate(W/2, H * 0.7);
    ctx.transform(1, 0, -0.3, 1, 0, 0);  // skew for perspective
    ctx.strokeStyle = `rgba(46, 255, 234, ${0.02 + Math.sin(time * 0.3) * 0.01})`;
    ctx.lineWidth = 0.5;
    const gridSize = 35;
    for (let x = -W; x < W * 2; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, -H/2); ctx.lineTo(x, H/2); ctx.stroke();
    }
    for (let y = -H/2; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(-W, y); ctx.lineTo(W*2, y); ctx.stroke();
    }
    ctx.restore();

    // ── Interrogation lamp cone ──
    const lampX = W/2, lampY = -20;
    const coneGrad = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY + H*0.3, H*0.5);
    coneGrad.addColorStop(0, 'rgba(255, 217, 61, 0.04)');
    coneGrad.addColorStop(0.5, 'rgba(255, 217, 61, 0.02)');
    coneGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(lampX - 15, lampY);
    ctx.lineTo(lampX + 15, lampY);
    ctx.lineTo(lampX + W*0.3, H*0.5);
    ctx.lineTo(lampX - W*0.3, H*0.5);
    ctx.closePath();
    ctx.fill();

    // ── Evidence photos and strings ──
    const photos = getPhotos();
    const strings = getStrings(photos);

    // Draw strings first (behind photos)
    strings.forEach((s, si) => {
      const from = photos[s.from];
      const to = photos[s.to];
      const pulse = Math.sin(time * 1.5 + s.age + si) * 0.5 + 0.5;
      
      ctx.beginPath();
      ctx.moveTo(from.x + from.w/2, from.y + from.h/2);
      
      // Curved line
      const cpx = (from.x + to.x) / 2 + (Math.random() - 0.5) * 30;
      const cpy = (from.y + to.y) / 2 + (Math.random() - 0.5) * 20;
      ctx.quadraticCurveTo(cpx, cpy, to.x + to.w/2, to.y + to.h/2);
      
      ctx.strokeStyle = `rgba(255, 46, 136, ${0.08 + pulse * 0.12})`;
      ctx.lineWidth = 1 + pulse;
      ctx.stroke();
    });

    // Draw photos
    photos.forEach((p, i) => {
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.rot * Math.PI / 180);

      // Photo shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;

      // Photo border (Polaroid style)
      ctx.fillStyle = '#1A1A28';
      ctx.fillRect(-p.w/2 - 4, -p.h/2 - 4, p.w + 8, p.h + 8);

      // Photo image area
      ctx.shadowBlur = 0;
      const imgGrad = ctx.createLinearGradient(-p.w/2, -p.h/2, p.w/2, p.h/2);
      imgGrad.addColorStop(0, '#0F0F1A');
      imgGrad.addColorStop(0.3, '#1A1A28');
      imgGrad.addColorStop(0.6, '#151524');
      imgGrad.addColorStop(1, '#0F0F1A');
      ctx.fillStyle = imgGrad;
      ctx.fillRect(-p.w/2 + 2, -p.h/2 + 2, p.w - 4, p.h - 4);

      // Evidence marker number
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.h * 0.12}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`#${i + 1}`, -p.w/2 + 6, -p.h/2 + 6);

      // Label
      ctx.fillStyle = `rgba(255,255,255,0.3)`;
      ctx.font = `${p.h * 0.08}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.label, 0, p.h/2 - 2);

      // Pin
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, -p.h/2 - 8, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FF2E88';
      ctx.shadowColor = '#FF2E88';
      ctx.shadowBlur = 10;
      ctx.fill();

      // Pin glow pulse
      const glow = Math.sin(time * 2 + i) * 0.3 + 0.7;
      ctx.shadowBlur = 8 + glow * 8;
      ctx.fill();

      ctx.restore();
    });

    // ── Evidence label at bottom ──
    ctx.fillStyle = `rgba(255, 217, 61, ${0.08 + Math.sin(time * 0.5) * 0.04})`;
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('🚫 POLICE EVIDENCE — CONFIDENTIAL', W/2, H - 20);

    // ── Light sweep overlay ──
    const sweepX = ((time * 30) % (W * 2)) - W * 0.5;
    const sweepGrad = ctx.createLinearGradient(sweepX - W*0.15, 0, sweepX + W*0.15, 0);
    sweepGrad.addColorStop(0, 'transparent');
    sweepGrad.addColorStop(0.5, 'rgba(255,255,255,0.02)');
    sweepGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(draw);
  }

  draw();
})();
