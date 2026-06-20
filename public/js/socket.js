// BUSTED - Socket.IO Client Wrapper

const BustedSocket = (() => {
  let socket = null;
  let connected = false;
  const handlers = {};

  function connect() {
    return new Promise((resolve) => {
      socket = io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      socket.on('connect', () => {
        connected = true;
        console.log('[WS] Connected');
        resolve(true);
      });

      socket.on('disconnect', () => {
        connected = false;
        console.log('[WS] Disconnected');
      });

      socket.on('connect_error', (err) => {
        console.warn('[WS] Connection error:', err.message);
      });

      // Register all handlers
      socket.on('room_created', (data) => emit('room_created', data));
      socket.on('room_joined', (data) => emit('room_joined', data));
      socket.on('player_joined', (data) => emit('player_joined', data));
      socket.on('player_left', (data) => emit('player_left', data));
      socket.on('lobby_update', (data) => emit('lobby_update', data));
      socket.on('game_start', (data) => emit('game_start', data));
      socket.on('round_start', (data) => emit('round_start', data));
      socket.on('game_broadcast', (data) => emit('game_broadcast', data));
      socket.on('timer_tick', (data) => emit('timer_tick', data));
      socket.on('decision_timer', (data) => emit('decision_timer', data));
      socket.on('interrogation_end', (data) => emit('interrogation_end', data));
      socket.on('chat_message', (data) => emit('chat_message', data));
      socket.on('card_played', (data) => emit('card_played', data));
      socket.on('answer_submitted', (data) => emit('answer_submitted', data));
      socket.on('round_result', (data) => emit('round_result', data));
      socket.on('game_over', (data) => emit('game_over', data));
      socket.on('rematch_requested', (data) => emit('rematch_requested', data));
      socket.on('error', (data) => emit('error', data));
    });
  }

  function emit(event, data) {
    if (handlers[event]) {
      handlers[event].forEach(fn => fn(data));
    }
  }

  function on(event, fn) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(fn);
    return () => {
      handlers[event] = handlers[event].filter(f => f !== fn);
    };
  }

  function off(event) {
    delete handlers[event];
  }

  function emitEvent(event, data) {
    if (socket && connected) {
      socket.emit(event, data);
    }
  }

  function disconnect() {
    if (socket) socket.disconnect();
    connected = false;
  }

  return { connect, on, off, emit: emitEvent, disconnect, get connected() { return connected; } };
})();
