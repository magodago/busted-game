// BUSTED - Main Application Controller

(function() {
  // ─── Init audio on first tap ────────────────────────────────────────
  let audioInitialized = false;

  function initAudioOnInteraction() {
    if (audioInitialized) return;
    BustedAudio.init();
    audioInitialized = true;
    document.removeEventListener('touchstart', initAudioOnInteraction);
    document.removeEventListener('click', initAudioOnInteraction);
  }
  document.addEventListener('touchstart', initAudioOnInteraction);
  document.addEventListener('click', initAudioOnInteraction);

  // ─── Socket Event Wiring ────────────────────────────────────────────
  BustedSocket.connect().then(() => {
    console.log('🚀 BUSTED connected to server');

    // Initialize home screen
    BustedScreens.initHome();

    // ─── Room Created ──────────────────────────────────────────────
    BustedSocket.on('room_created', (data) => {
      console.log('[EVENT] room_created', data);
    });

    // ─── Room Joined ───────────────────────────────────────────────
    BustedSocket.on('room_joined', (data) => {
      console.log('[EVENT] room_joined', data);
      BustedScreens.setState({
        playerId: data.yourId,
        hostId: data.hostId,
        roomCode: data.roomCode,
        players: data.players || [],
      });
      BustedScreens.showLobby(data);
      BustedAudio.sfx.lobby_join();
    });

    // ─── Player Joined ─────────────────────────────────────────────
    BustedSocket.on('player_joined', (data) => {
      console.log('[EVENT] player_joined', data.player?.name);
      BustedAudio.sfx.lobby_join();
    });

    // ─── Lobby Update ──────────────────────────────────────────────
    BustedSocket.on('lobby_update', (data) => {
      console.log('[EVENT] lobby_update', data.players?.length, 'players');
      BustedScreens.setState({ players: data.players || [] });
      BustedScreens.updateLobbyPlayers(data.players);
    });

    // ─── Player Left ───────────────────────────────────────────────
    BustedSocket.on('player_left', (data) => {
      console.log('[EVENT] player_left', data.playerId);
    });

    // ─── Game Start ────────────────────────────────────────────────
    BustedSocket.on('game_start', (data) => {
      console.log('[EVENT] game_start', data);
    });

    // ─── Game Broadcast ────────────────────────────────────────────
    BustedSocket.on('game_broadcast', (data) => {
      console.log('[EVENT] game_broadcast', data);
      BustedScreens.setState({
        round: data.round,
        totalRounds: data.totalRounds,
        accusation: data.accusation,
        timerSeconds: data.timeLimit,
        timeLimit: data.timeLimit,
      });
    });

    // ─── Round Start ───────────────────────────────────────────────
    BustedSocket.on('round_start', (data) => {
      console.log('[EVENT] round_start', data.role, data.round);

      // Reset voting state
      BustedScreens.setState({ hasVoted: false });

      // Set power cards based on role
      if (data.isVoter) {
        BustedScreens.setPowerCards([
          { id: 'detective', name: 'Detective', desc: 'Elimina una opción falsa', icon: '🔍', used: false },
        ]);
      } else if (data.isSuspect) {
        BustedScreens.setPowerCards([
          { id: 'mentira_doble', name: 'Mentira Doble', desc: 'Da dos respuestas sin penalización', icon: '🃏', used: false },
          { id: 'coartada_falsa', name: 'Coartada Falsa', desc: 'Añade una opción falsa convincente', icon: '🎭', used: false },
        ]);
      } else {
        BustedScreens.setPowerCards([]);
      }

      BustedScreens.showRound(data);
    });

    // ─── Timer Tick ────────────────────────────────────────────────
    BustedSocket.on('timer_tick', (data) => {
      BustedScreens.updateTimer(data.secondsLeft);
    });

    // ─── Voting Timer ────────────────────────────────────────────
    BustedSocket.on('voting_timer', (data) => {
      BustedScreens.updateVotingTimer(data.secondsLeft);
    });

    // ─── Voting Start ─────────────────────────────────────────────
    BustedSocket.on('voting_start', (data) => {
      console.log('[EVENT] voting_start');
      const state = BustedScreens.getState();
      if (state.isVoter) {
        BustedScreens.showVotingScreen(data);
        BustedAudio.sfx.reveal();
      } else if (state.isSuspect) {
        BustedScreens.showWaitingVote();
      } else {
        BustedScreens.addChatMessage({
          text: '🔍 Los interrogadores están votando...',
          isSystem: true,
        });
      }
    });

    // ─── Vote Cast ────────────────────────────────────────────────
    BustedSocket.on('vote_cast', (data) => {
      BustedScreens.updateVoteCount(data.totalVotes);
    });

    // ─── Voting Ended ─────────────────────────────────────────────
    BustedSocket.on('voting_ended', (data) => {
      console.log('[EVENT] voting_ended');
    });

    // ─── Interrogation End ─────────────────────────────────────────
    BustedSocket.on('interrogation_end', (data) => {
      console.log('[EVENT] interrogation_end (awaiting voting...)');
    });

    // ─── Chat Message ──────────────────────────────────────────────
    BustedSocket.on('chat_message', (data) => {
      BustedScreens.addChatMessage(data);
    });

    // ─── Card Played ───────────────────────────────────────────────
    BustedSocket.on('card_played', (data) => {
      console.log('[EVENT] card_played', data.cardType);
      BustedScreens.addChatMessage({
        text: `⚡ ${data.playerName} jugó ${data.effect?.message || 'una carta de poder'}!`,
        isSystem: true,
      });
      BustedAudio.sfx.powerup();
    });

    // ─── Round Result ──────────────────────────────────────────────
    BustedSocket.on('round_result', (data) => {
      console.log('[EVENT] round_result', data);
      BustedScreens.setState({
        scores: data.scores || {},
        waitingForDecision: false,
      });

      // Update scores list
      BustedScreens.setState({ scoresList: data.scoresList || {} });

      // Show revelation
      BustedScreens.showRevelation(data);
    });

    // ─── Game Over ─────────────────────────────────────────────────
    BustedSocket.on('game_over', (data) => {
      console.log('[EVENT] game_over', data);
      BustedScreens.setState({ gameOver: true });
      BustedScreens.showRanking(data);
    });

    // ─── Rematch Requested ─────────────────────────────────────────
    BustedSocket.on('rematch_requested', (data) => {
      BustedScreens.addChatMessage({
        text: '🔄 Un jugador quiere revancha. Esperando al resto...',
        isSystem: true,
      });
    });

    // ─── Error ──────────────────────────────────────────────────────
    BustedSocket.on('error', (data) => {
      console.warn('[EVENT] error', data.message);
      BustedScreens.handleError(data.message || 'Error de conexión');
    });

  }).catch((err) => {
    console.error('Failed to connect:', err);
    BustedScreens.initHome();
    BustedScreens.handleError('No se pudo conectar al servidor');
  });

  // ─── Chat send handler ──────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = document.getElementById('chat-input');
      if (input && document.activeElement === input) {
        sendChatMessage();
      }
    }
  });

  document.getElementById('btn-send')?.addEventListener('click', sendChatMessage);

  function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    BustedSocket.emit('send_message', { text });
    input.value = '';
    input.focus();
    BustedAudio.sfx.click();
  }

  // ─── Mute toggle ────────────────────────────────────────────────────
  document.getElementById('btn-mute')?.addEventListener('click', () => {
    const muted = BustedAudio.toggleMute();
    const btn = document.getElementById('btn-mute');
    if (btn) {
      if (muted) {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
        showToast('🔇 Sonido desactivado');
      } else {
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>`;
        showToast('🔊 Sonido activado');
      }
    }
  });

  // Simple toast for this module
  let toastTimeout2 = null;
  function showToast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimeout2);
    toastTimeout2 = setTimeout(() => el.classList.remove('show'), 2000);
  }

  console.log('🕵️ BUSTED app initialized');
})();
