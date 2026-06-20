// BUSTED - Canvas-based Share Card Generator

const BustedShare = (() => {
  function generateCard(data) {
    const {
      suspectName = '???',
      detectiveName = '???',
      verdict = 'CULPABLE',
      accusation = 'Acusación',
      suspectScore = 0,
      detectiveScore = 0,
      quote = 'La verdad siempre sale a la luz',
      round = 1,
    } = data;

    const canvas = document.createElement('canvas');
    canvas.width = 540;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0B0B0F');
    grad.addColorStop(0.3, '#12121A');
    grad.addColorStop(0.7, '#1A1A28');
    grad.addColorStop(1, '#0B0B0F');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative grid
    ctx.strokeStyle = 'rgba(255,46,136,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Header bar
    ctx.fillStyle = verdict === 'CULPABLE' ? '#FF3355' : '#2EFF5A';
    ctx.fillRect(0, 0, canvas.width, 4);

    // Badge
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#6B6B80';
    ctx.textAlign = 'center';
    ctx.fillText('✦ BUSTED ✦', canvas.width / 2, 38);

    // Case number
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#FFD93D';
    ctx.fillText(`CASO #${String(round).padStart(3, '0')}`, canvas.width / 2, 58);

    // Verdict stamp
    ctx.save();
    ctx.translate(canvas.width / 2, 140);
    ctx.rotate(-0.1);

    const verdictColor = verdict === 'CULPABLE' ? '#FF3355' : '#2EFF5A';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = verdictColor;
    ctx.lineWidth = 4;

    // Glow effect
    ctx.shadowColor = verdictColor;
    ctx.shadowBlur = 40;
    ctx.fillStyle = verdictColor;
    ctx.fillText(verdict, 0, 0);
    ctx.strokeText(verdict, 0, 0);
    ctx.shadowBlur = 0;

    // Stamp border
    ctx.strokeStyle = `${verdictColor}40`;
    ctx.lineWidth = 2;
    ctx.strokeRect(-130, -50, 260, 100);

    ctx.restore();

    // Horizontal rule
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 200);
    ctx.lineTo(canvas.width - 60, 200);
    ctx.stroke();

    // Details section
    const detailsY = 230;
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#6B6B80';
    ctx.textAlign = 'left';
    ctx.fillText('SOSPECHOSO', 60, detailsY);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#F0EFF5';
    ctx.fillText(suspectName, 60, detailsY + 24);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#6B6B80';
    ctx.textAlign = 'right';
    ctx.fillText('DETECTIVE', canvas.width - 60, detailsY);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#F0EFF5';
    ctx.textAlign = 'right';
    ctx.fillText(detectiveName, canvas.width - 60, detailsY + 24);

    // Accusation
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#6B6B80';
    ctx.textAlign = 'center';
    ctx.fillText('ACUSACIÓN', canvas.width / 2, 310);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#9A9AB0';
    wrapText(ctx, accusation, canvas.width / 2, 338, canvas.width - 120, 22);

    // Scores
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 400);
    ctx.lineTo(canvas.width - 60, 400);
    ctx.stroke();

    // Suspect score
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#6B6B80';
    ctx.textAlign = 'center';
    ctx.fillText(suspectName, canvas.width * 0.25, 430);
    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = verdict === 'CULPABLE' ? '#6B6B80' : '#2EFF5A';
    ctx.fillText(String(detectiveScore), canvas.width * 0.25, 470);

    // VS
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = '#FFD93D';
    ctx.fillText('VS', canvas.width / 2, 460);

    // Detective score
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#6B6B80';
    ctx.textAlign = 'center';
    ctx.fillText(detectiveName, canvas.width * 0.75, 430);
    ctx.font = 'bold 40px monospace';
    ctx.fillStyle = verdict === 'CULPABLE' ? '#2EFFEA' : '#6B6B80';
    ctx.fillText(String(detectiveScore), canvas.width * 0.75, 470);

    // Quote
    ctx.font = 'italic 13px sans-serif';
    ctx.fillStyle = 'rgba(154,154,176,0.6)';
    ctx.textAlign = 'center';
    wrapText(ctx, `"${quote}"`, canvas.width / 2, 530, canvas.width - 120, 20);

    // Footer
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(107,107,128,0.4)';
    ctx.fillText('busted.game', canvas.width / 2, 580);

    return canvas;
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, ly);
        line = words[i] + ' ';
        ly += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, ly);
  }

  async function shareCanvas(canvas) {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], 'busted-report.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'BUSTED - Informe',
            text: '¡Mira este informe de BUSTED!',
            files: [file],
          });
          return;
        } catch (e) {
          // User cancelled or fallback
        }
      }

      // Fallback: download
      const link = document.createElement('a');
      link.download = 'busted-report.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }, 'image/png');
  }

  async function downloadCanvas(canvas) {
    const link = document.createElement('a');
    link.download = 'busted-report.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  return { generateCard, shareCanvas, downloadCanvas };
})();
