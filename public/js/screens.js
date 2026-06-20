// BUSTED - Screen Manager / UI Controller

const BustedScreens = (() => {
  // ─── State ──────────────────────────────────────────────────────────
  let currentScreen = 'home';
  let gameState = {
    roomCode: null,
    players: [],
    playerId: null,
    playerName: '',
    playerAvatar: '😎',
    hostId: null,
    role: null,
    isDetective: false,
    isSuspect: false,
    accusation: '',
    options: [],
    secretDetail: -1,
    round: 0,
    totalRounds: 5,
    scores: {},
    myScore: 0,
    timerSeconds: 0,
    powerCards: [],
    waitingForDecision: false,
    gameOver: false,
  };

  let optionCallbacks = {};

  // ─── DOM Cache ──────────────────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  // ─── Screen Navigation ──────────────────────────────────────────────
  function showScreen(name) {
    const prev = currentScreen;
    const prevEl = $('screen-' + prev);
    const nextEl = $('screen-' + name);

    if (prevEl) {
      prevEl.classList.remove('active');
      prevEl.classList.add('exit');
    }

    if (nextEl) {
      nextEl.classList.remove('exit');
      // Force reflow for animation
      void nextEl.offsetWidth;
      nextEl.classList.add('active');
    }

    currentScreen = name;
  }

  // ─── Toast ──────────────────────────────────────────────────────────
  let toastTimeout = null;

  function showToast(msg, isError = false) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    if (isError) el.classList.add('error');
    else el.classList.remove('error');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.classList.remove('show', 'error');
    }, 3000);
  }

  // ─── Home Screen ────────────────────────────────────────────────────
  function initHome() {
    // Player name
    const savedName = localStorage.getItem('busted_player_name');
    if (savedName) $('player-name-input').value = savedName;

    // Avatar selection
    document.querySelectorAll('.avatar-opt').forEach(el => {
      el.addEventListener('click', () => {
        document.querySelectorAll('.avatar-opt').forEach(a => a.classList.remove('selected'));
        el.classList.add('selected');
        $('player-name-input').focus();
      });
    });

    // Create room
    $('btn-create').addEventListener('click', () => {
      const name = $('player-name-input').value.trim() || 'Jugador';
      const avatar = document.querySelector('.avatar-opt.selected')?.dataset.avatar || '😎';
      localStorage.setItem('busted_player_name', name);
      gameState.playerName = name;
      gameState.playerAvatar = avatar;
      BustedSocket.emit('create_room', { playerName: name, avatar });
      BustedAudio.sfx.click();
    });

    // Join room
    $('btn-join').addEventListener('click', () => {
      const code = $('room-code-input').value.trim().toUpperCase();
      if (!code || code.length < 4) {
        showToast('Introduce un código de sala', true);
        return;
      }
      const name = $('player-name-input').value.trim() || 'Jugador';
      const avatar = document.querySelector('.avatar-opt.selected')?.dataset.avatar || '😎';
      localStorage.setItem('busted_player_name', name);
      gameState.playerName = name;
      gameState.playerAvatar = avatar;
      BustedSocket.emit('join_room', { roomCode: code, playerName: name, avatar });
      BustedAudio.sfx.click();
    });

    // Enter key on code input
    $('room-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('btn-join').click();
    });
  }

  // ─── Lobby Screen ──────────────────────────────────────────────────
  function showLobby(data) {
    gameState.roomCode = data.roomCode;
    gameState.playerId = data.yourId;
    gameState.hostId = data.hostId;
    gameState.players = data.players || [];

    $('room-code-value').textContent = data.roomCode;
    updateLobbyPlayers(data.players);

    // Copy code
    $('btn-copy-code').onclick = () => {
      navigator.clipboard.writeText(data.roomCode).then(() => {
        showToast('✅ Código copiado');
        BustedAudio.sfx.click();
      });
    };

    // Share WhatsApp
    $('btn-share-whatsapp').onclick = () => {
      const url = window.location.href;
      const msg = encodeURIComponent(`¡Juguemos al BUSTED! 🕵️ Código: ${data.roomCode}\n${url}`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
      BustedAudio.sfx.click();
    };

    // Start game
    $('btn-start-game').onclick = () => {
      BustedSocket.emit('start_game');
      BustedAudio.sfx.click();
    };

    showScreen('lobby');
  }

  function updateLobbyPlayers(players) {
    const container = $('lobby-players');
    if (!container) return;

    if (!players || players.length === 0) {
      container.innerHTML = '<div class="player-slot empty">Esperando jugadores...</div>';
      $('player-count').textContent = '0';
      $('btn-start-game').disabled = true;
      return;
    }

    container.innerHTML = players.map(p => `
      <div class="player-slot">
        <span class="player-avatar">${p.avatar || '😎'}</span>
        <span class="player-name">${escapeHtml(p.name)}</span>
        ${p.isHost ? '<span class="player-host">👑 Anfitrión</span>' : ''}
      </div>
    `).join('');

    $('player-count').textContent = players.length;
    $('btn-start-game').disabled = players.length < 2 || gameState.playerId !== gameState.hostId;
  }

  // ─── Round Screen ──────────────────────────────────────────────────
  function showRound(data) {
    gameState.role = data.role;
    gameState.isVoter = data.isVoter || false;
    gameState.isSuspect = data.isSuspect || false;
    gameState.accusation = data.accusation;
    gameState.options = data.options || [];
    gameState.round = data.round;
    gameState.totalRounds = data.totalRounds;
    gameState.timerSeconds = data.timeLimit || 60;
    gameState.secretDetail = data.secretDetail !== undefined ? data.secretDetail : -1;
    gameState.waitingForDecision = false;
    gameState.suspectId = data.suspectId;
    gameState.interrogatorIds = data.interrogatorIds || [];

    // Round badge
    $('round-badge').textContent = `RONDA ${data.round}/${data.totalRounds}`;

    // Accusation
    $('accusation-text').textContent = data.accusation;
    BustedAudio.sfx.accuse();

    // Role reveal
    const roleIcon = $('role-icon');
    const roleTitle = $('role-title');
    const roleDesc = $('role-desc');

    if (data.isVoter) {
      roleIcon.textContent = '🕵️';
      roleTitle.textContent = 'INTERROGADOR/A';
      roleTitle.className = 'role-title detective';
      roleDesc.textContent = 'Interroga al sospechoso. ¡Descubre la verdad!';
    } else if (data.isSuspect) {
      roleIcon.textContent = '🤥';
      roleTitle.textContent = 'SOSPECHOSO/A';
      roleTitle.className = 'role-title suspect';
      roleDesc.textContent = 'Miente como puedas. ¡No te descubran!';
    } else {
      roleIcon.textContent = '👀';
      roleTitle.textContent = 'ESPECTADOR';
      roleTitle.className = 'role-title';
      roleTitle.style.color = 'var(--yellow)';
      roleDesc.textContent = 'Observa el interrogatorio...';
    }

    // Secret detail badge (only for suspect)
    const secretBadge = document.getElementById('secret-detail-badge');
    const existing = document.querySelector('.secret-detail-badge');
    if (existing) existing.remove();

    if (data.isSuspect && data.secretDetail !== undefined && gameState.options[data.secretDetail]) {
      const badge = document.createElement('div');
      badge.className = 'secret-detail-badge';
      badge.id = 'secret-detail-badge';
      badge.innerHTML = `
        <div class="secret-detail-label">🤫 Tu detalle secreto (el REAL)</div>
        <div class="secret-detail-text">${escapeHtml(gameState.options[data.secretDetail])}</div>
      `;
      $('power-cards').insertAdjacentElement('beforebegin', badge);
    }

    // Reset power cards display
    $('power-cards').innerHTML = '';

    // Reset chat
    $('chat-messages').innerHTML = '';
    $('chat-input').disabled = false;
    $('btn-send').disabled = false;

    // Timer reset
    setTimerBar(100);

    // Chat input focus
    $('chat-input').focus();

    showScreen('round');
    BustedAudio.sfx.tension();
  }

  // ─── Timer ──────────────────────────────────────────────────────────
  function setTimerBar(percentage) {
    const bar = $('timer-bar');
    const text = $('timer-text');
    if (!bar) return;

    const pct = Math.max(0, Math.min(100, percentage));
    bar.style.width = pct + '%';
    bar.classList.remove('warning', 'danger');

    if (pct < 25) {
      bar.classList.add('danger');
    } else if (pct < 50) {
      bar.classList.add('warning');
    }

    const seconds = Math.round((pct / 100) * gameState.timerSeconds);
    if (text) text.textContent = seconds;

    // Play tick sound at low time
    if (pct < 30 && pct > 0) {
      BustedAudio.sfx.tick();
    }
  }

  function updateTimer(secondsLeft) {
    gameState.timerSeconds = secondsLeft;
    const total = gameState.timeLimit || 60;
    const pct = total > 0 ? (secondsLeft / total) * 100 : 0;
    setTimerBar(pct);
  }

  // ─── Chat ────────────────────────────────────────────────────────────
  function addChatMessage(data) {
    const container = $('chat-messages');
    if (!container) return;

    const isMe = data.playerId === gameState.playerId;
    const div = document.createElement('div');
    div.className = `chat-msg ${data.isSystem ? 'system' : (isMe ? (gameState.isVoter ? 'detective' : 'suspect') : (gameState.isVoter ? 'suspect' : 'detective'))}`;

    if (data.isSystem) {
      div.innerHTML = `<span class="chat-msg-text">${escapeHtml(data.text)}</span>`;
    } else {
      div.innerHTML = `
        <div class="chat-msg-sender">${escapeHtml(data.playerName)}</div>
        <div class="chat-msg-text">${escapeHtml(data.text)}</div>
      `;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  // ─── Power Cards ────────────────────────────────────────────────────
  function setPowerCards(cards) {
    const container = $('power-cards');
    if (!container) return;
    container.innerHTML = '';

    if (!cards || cards.length === 0) return;

    cards.forEach((card, i) => {
      const el = document.createElement('div');
      el.className = 'power-card';
      el.style.animationDelay = `${i * 0.1}s`;
      el.innerHTML = `
        <span class="power-card-icon">${card.icon || '🃏'}</span>
        <div>
          <div class="power-card-label">${escapeHtml(card.name)}</div>
          <div class="power-card-desc">${escapeHtml(card.desc)}</div>
        </div>
      `;

      el.addEventListener('click', () => {
        if (card.used) {
          showToast('Ya usaste esta carta');
          return;
        }
        BustedSocket.emit('play_card', { cardType: card.id });
        BustedAudio.sfx.powerup();
        card.used = true;
        el.classList.add('used');
      });

      if (card.used) el.classList.add('used');
      container.appendChild(el);
    });
  }

  // ─── Voting Screen (group mode) ──────────────────────────────────
  function showVotingScreen(data) {
    gameState.waitingForDecision = true;
    gameState.votingTimeLimit = data?.timeLimit || 30;
    $('decision-timer-text').textContent = String(gameState.votingTimeLimit);
    $('accusation-reminder').textContent = `"${gameState.accusation}"`;
    $('decision-label').textContent = '🔍 VOTA EL DETALLE REAL';
    $('decision-sub').textContent = gameState.isSuspect ? 'Espera a que los demás voten...' : 'Elige cuál crees que es verdad';

    const container = $('options-list');
    container.innerHTML = '';
    container.classList.remove('revealed');

    const opts = gameState.options || [];

    opts.forEach((opt, i) => {
      const card = document.createElement('div');
      card.className = 'option-card';
      card.style.animationDelay = `${i * 0.1}s`;
      card.innerHTML = `
        <span class="opt-index">OPCIÓN ${String.fromCharCode(65 + i)}</span>
        ${escapeHtml(opt)}
      `;
      card.addEventListener('click', () => {
        if (!gameState.waitingForDecision) return;
        if (gameState.isSuspect) {
          showToast('¡Tú eres el sospechoso! No puedes votar', true);
          return;
        }
        if (gameState.hasVoted) {
          showToast('Ya has votado');
          return;
        }
        gameState.waitingForDecision = false;
        gameState.hasVoted = true;
        BustedSocket.emit('submit_vote', { optionIndex: i });
        BustedAudio.sfx.click();
        card.classList.add('selected');
        // Show waiting message
        showToast('✅ Voto registrado. Esperando a los demás...');
        container.querySelectorAll('.option-card').forEach(c => {
          c.style.pointerEvents = 'none';
        });
      });
      container.appendChild(card);
    });

    showScreen('decision');
  }

  function showWaitingVote() {
    // For suspect: show a waiting screen
    $('decision-label').textContent = '⏳ ESPERANDO';
    $('decision-sub').textContent = 'Los interrogadores están votando...';
    $('decision-timer-text').textContent = '--';
    $('accusation-reminder').textContent = `"${gameState.accusation}"`;
    const container = $('options-list');
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--gray-light);font-size:16px;animation:pulse 1.5s infinite">Esperando votos...</div>';
    showScreen('decision');
  }

  function updateVotingTimer(seconds) {
    $('decision-timer-text').textContent = Math.max(0, seconds);
  }

  function updateVoteCount(count) {
    // Update the voting status
    const total = gameState.interrogatorIds?.length || 0;
    const el = document.querySelector('.options-list') || document.getElementById('options-list');
    if (el) {
      const statusEl = document.getElementById('vote-status') || (() => {
        const s = document.createElement('div');
        s.id = 'vote-status';
        s.style.cssText = 'text-align:center;font-size:13px;color:var(--gray-light);margin-top:8px;';
        el.parentNode.insertBefore(s, el.nextSibling);
        return s;
      })();
      statusEl.textContent = `🗳 ${count}/${total} han votado`;
    }
  }

  // ─── Reveal Results ───────────────────────────────────────────────
  function showRevelation(data) {
    // Reset
    const bustedEl = $('stamp-busted');
    const libreEl = $('stamp-libre');
    bustedEl.classList.remove('show');
    libreEl.classList.remove('show');

    if (data.suspectWon) {
      libreEl.classList.add('show');
      BustedAudio.sfx.liberado();
    } else {
      bustedEl.classList.add('show');
      BustedAudio.sfx.busted();
    }

    // Camera flash
    const flash = $('flash-overlay');
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');

    // Truth
    $('revelation-truth').textContent = data.correctText || '';
    $('revelation-quote').textContent = data.reportQuote || '';

    // Update scores
    gameState.scores = data.scores || {};

    // Haptic
    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);

    showScreen('revelation');

    // Auto-advance to report after 2.5s
    setTimeout(() => {
      showReportCard(data);
    }, 2500);
  }

  // ─── Report Card ──────────────────────────────────────────────────
  function showReportCard(data) {
    const suspectName = gameState.players.find(p => p.id === data.suspectId)?.name || 'Desconocido';
    const verdict = data.suspectWon ? 'LIBRE' : 'CULPABLE';

    $('report-case-num').textContent = String(gameState.round).padStart(3, '0');
    $('report-suspect').textContent = suspectName;
    $('report-detective').textContent = 'Veredicto grupal';

    const verdictEl = $('report-verdict');
    verdictEl.textContent = verdict;
    verdictEl.className = 'report-value verdict-' + (verdict === 'CULPABLE' ? 'busted' : 'libre');

    $('report-quote-text').textContent = `"${data.reportQuote || ''}"`;

    // Scores - show all players
    const scores = data.scoresList || {};
    const scoreArr = Object.values(scores);
    const scoreContainer = $('report-score-section');
    if (scoreContainer) {
      scoreContainer.innerHTML = scoreArr.map(s => `
        <div class="report-score">
          <div class="report-score-name">${escapeHtml(s.name)}</div>
          <div class="report-score-val">${s.score}</div>
        </div>
      `).join('');
    }

    // Share button
    $('btn-share-report').onclick = () => {
      const canvas = BustedShare.generateCard({
        suspectName,
        verdict,
        accusation: gameState.accusation,
        suspectScore: data.suspectId ? (gameState.scores[data.suspectId] || 0) : 0,
        detectiveScore: 0,
        quote: data.reportQuote || '',
        round: gameState.round,
      });
      BustedShare.shareCanvas(canvas);
      BustedAudio.sfx.click();
    };

    // Next round
    $('btn-next-round').onclick = () => {
      BustedSocket.emit('next_round');
      BustedAudio.sfx.click();
    };

    showScreen('report');
  }

  // ─── Game Over / Ranking ──────────────────────────────────────────
  function showRanking(data) {
    const rankings = data.rankings || [];
    const container = $('ranking-list');
    container.innerHTML = '';

    const medals = ['🥇', '🥈', '🥉'];

    rankings.forEach((p, i) => {
      const posClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const item = document.createElement('div');
      item.className = 'ranking-item';
      item.style.animationDelay = `${i * 0.1}s`;
      item.innerHTML = `
        <span class="ranking-pos ${posClass}">${i < 3 ? medals[i] : `#${i + 1}`}</span>
        <span class="ranking-avatar">${p.avatar || '😎'}</span>
        <div style="flex:1;min-width:0">
          <div class="ranking-name">${escapeHtml(p.name)}</div>
          <div class="ranking-title-line">${escapeHtml(p.title || '')}</div>
        </div>
        <span class="ranking-score">${p.score}</span>
      `;
      container.appendChild(item);
    });

    // Rematch
    $('btn-rematch').onclick = () => {
      BustedSocket.emit('rematch');
      BustedAudio.sfx.click();
    };

    // Home
    $('btn-home').onclick = () => {
      BustedSocket.disconnect();
      gameState = { ...gameState,
        roomCode: null, players: [], role: null,
        isVoter: false, isSuspect: false, gameOver: false, hasVoted: false
      };
      showScreen('home');
      BustedAudio.sfx.click();
    };

    BustedAudio.sfx.victory();
    showScreen('ranking');
  }

  // ─── Generic error handler ────────────────────────────────────────
  function handleError(msg) {
    showToast(msg, true);
    BustedAudio.sfx.error();
  }

  // ─── Utility ──────────────────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ─── Public API ──────────────────────────────────────────────────────
  return {
    initHome,
    showLobby,
    updateLobbyPlayers,
    showRound,
    updateTimer,
    addChatMessage,
    setPowerCards,
    showVotingScreen,
    showWaitingVote,
    updateVotingTimer,
    updateVoteCount,
    showRevelation,
    showReportCard,
    showRanking,
    handleError,
    getState: () => gameState,
    setState: (partial) => { Object.assign(gameState, partial); },
    escapeHtml,
  };
})();
