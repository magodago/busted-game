// BUSTED Server v2 - Express + Socket.IO (Group Mode)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager, Game } from './game.js';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

const roomManager = new RoomManager();
const socketMap = new Map();
const playerSockets = new Map();

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ─── CREATE ROOM ────────────────────────────────────────────────
  socket.on('create_room', ({ playerName, avatar } = {}) => {
    try {
      if (!playerName || playerName.trim().length === 0) {
        return socket.emit('error', { message: 'Necesitas un nombre' });
      }
      const playerId = uuidv4().slice(0, 8);
      const player = {
        id: playerId,
        name: playerName.trim().slice(0, 20),
        avatar: avatar || '😎',
      };

      const room = roomManager.createRoom(player);
      socket.join(room.code);
      socketMap.set(socket.id, { playerId, roomCode: room.code });
      playerSockets.set(playerId, socket.id);

      console.log(`[ROOM] ${room.code} created by ${player.name}`);
      socket.emit('room_created', { roomCode: room.code });
      socket.emit('room_joined', {
        players: room.getPlayerList(),
        roomCode: room.code,
        hostId: room.hostId,
        yourId: playerId,
      });
    } catch (err) {
      console.error('[ERR] create_room:', err.message);
      socket.emit('error', { message: 'Error al crear la sala' });
    }
  });

  // ─── JOIN ROOM ──────────────────────────────────────────────────
  socket.on('join_room', ({ roomCode, playerName, avatar } = {}) => {
    try {
      const code = (roomCode || '').toUpperCase().trim();
      if (!code) return socket.emit('error', { message: 'Código de sala requerido' });
      if (!playerName || playerName.trim().length === 0) {
        return socket.emit('error', { message: 'Necesitas un nombre' });
      }

      const room = roomManager.getRoom(code);
      if (!room) return socket.emit('error', { message: 'Sala no encontrada' });
      if (room.game && room.game.currentRound > 0) {
        return socket.emit('error', { message: 'La partida ya empezó' });
      }

      const playerId = uuidv4().slice(0, 8);
      const player = {
        id: playerId,
        name: playerName.trim().slice(0, 20),
        avatar: avatar || '😎',
      };

      room.addPlayer(player);
      socket.join(room.code);
      socketMap.set(socket.id, { playerId, roomCode: room.code });
      playerSockets.set(playerId, socket.id);

      console.log(`[ROOM] ${player.name} joined ${code}`);
      socket.emit('room_joined', {
        players: room.getPlayerList(),
        roomCode: room.code,
        hostId: room.hostId,
        yourId: playerId,
      });
      socket.to(room.code).emit('player_joined', { player });
      io.to(room.code).emit('lobby_update', { players: room.getPlayerList() });
    } catch (err) {
      console.error('[ERR] join_room:', err.message);
      socket.emit('error', { message: 'Error al unirse a la sala' });
    }
  });

  // ─── START GAME ─────────────────────────────────────────────────
  socket.on('start_game', () => {
    try {
      const session = socketMap.get(socket.id);
      if (!session) return;
      const room = roomManager.getRoom(session.roomCode);
      if (!room) return;
      if (room.hostId !== session.playerId) {
        return socket.emit('error', { message: 'Solo el anfitrión puede empezar' });
      }

      const game = room.startGame();
      if (!game) return socket.emit('error', { message: 'Se necesitan al menos 2 jugadores' });

      startRound(io, room, game, socketMap);
    } catch (err) {
      console.error('[ERR] start_game:', err.message);
    }
  });

  // ─── SEND MESSAGE ───────────────────────────────────────────────
  socket.on('send_message', ({ text } = {}) => {
    try {
      if (!text || text.trim().length === 0) return;
      const session = socketMap.get(socket.id);
      if (!session) return;
      const room = roomManager.getRoom(session.roomCode);
      if (!room) return;
      const player = room.getPlayer(session.playerId);
      if (!player) return;

      io.to(room.code).emit('chat_message', {
        playerId: player.id,
        playerName: player.name,
        text: text.trim().slice(0, 200),
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('[ERR] send_message:', err.message);
    }
  });

  // ─── PLAY POWER CARD ────────────────────────────────────────────
  socket.on('play_card', ({ cardType } = {}) => {
    try {
      const session = socketMap.get(socket.id);
      if (!session) return;
      const room = roomManager.getRoom(session.roomCode);
      if (!room || !room.game) return;

      const result = room.game.applyPowerCard(session.playerId, cardType);
      if (!result.success) {
        return socket.emit('error', { message: result.error });
      }

      io.to(room.code).emit('card_played', {
        playerId: session.playerId,
        playerName: room.getPlayer(session.playerId)?.name || '',
        cardType,
        effect: result.effect,
      });
    } catch (err) {
      console.error('[ERR] play_card:', err.message);
    }
  });

  // ─── SUBMIT VOTE (group mode) ───────────────────────────────────
  socket.on('submit_vote', ({ optionIndex } = {}) => {
    try {
      const session = socketMap.get(socket.id);
      if (!session) return;
      const room = roomManager.getRoom(session.roomCode);
      if (!room || !room.game) return;

      const result = room.game.submitVote(session.playerId, optionIndex);
      if (!result.success) {
        return socket.emit('error', { message: result.error });
      }

      // Notify everyone that this player voted (but not what they chose)
      io.to(room.code).emit('vote_cast', { playerId: session.playerId, totalVotes: Object.keys(room.game.roundData.votes).length });

      if (result.allVoted) {
        // All interrogators voted! Resolve immediately
        room.stopTimer();
        const resolved = room.game.resolveRound();
        if (resolved) {
          io.to(room.code).emit('voting_ended', {});
          io.to(room.code).emit('round_result', {
            ...resolved,
            suspectId: room.game.roundData.suspectId,
            scoresList: room.game.getScores(),
          });
        }
      }
    } catch (err) {
      console.error('[ERR] submit_vote:', err.message);
    }
  });

  // ─── NEXT ROUND ─────────────────────────────────────────────────
  socket.on('next_round', () => {
    try {
      const session = socketMap.get(socket.id);
      if (!session) return;
      const room = roomManager.getRoom(session.roomCode);
      if (!room || !room.game) return;

      const game = room.game;
      if (game.isComplete()) {
        io.to(room.code).emit('game_over', { rankings: game.getRankings() });
        return;
      }

      startRound(io, room, game, socketMap);
    } catch (err) {
      console.error('[ERR] next_round:', err.message);
    }
  });

  // ─── REMATCH ────────────────────────────────────────────────────
  socket.on('rematch', () => {
    try {
      const session = socketMap.get(socket.id);
      if (!session) return;
      const room = roomManager.getRoom(session.roomCode);
      if (!room || !room.game) return;

      const allReady = room.game.requestRematch(session.playerId);
      if (allReady) {
        room.game.reset();
        startRound(io, room, room.game, socketMap);
      } else {
        socket.to(room.code).emit('rematch_requested', { playerId: session.playerId });
      }
    } catch (err) {
      console.error('[ERR] rematch:', err.message);
    }
  });

  // ─── DISCONNECT ─────────────────────────────────────────────────
  socket.on('disconnect', () => {
    try {
      const session = socketMap.get(socket.id);
      if (!session) return;

      const room = roomManager.getRoom(session.roomCode);
      if (room) {
        room.removePlayer(session.playerId);
        if (room.players.size === 0) {
          room.cleanup();
          roomManager.removeRoom(session.roomCode);
          console.log(`[ROOM] ${session.roomCode} removed (empty)`);
        } else {
          io.to(room.code).emit('player_left', { playerId: session.playerId });
          io.to(room.code).emit('lobby_update', { players: room.getPlayerList() });
          if (room.game && room.players.size < 2) {
            io.to(room.code).emit('game_over', { rankings: room.game.getRankings(), reason: 'Un jugador abandonó' });
            room.cleanup();
          }
        }
      }

      socketMap.delete(socket.id);
      playerSockets.delete(session.playerId);
      console.log(`[-] Socket disconnected: ${socket.id}`);
    } catch (err) {
      console.error('[ERR] disconnect:', err.message);
    }
  });
});

// ─── ROUND FLOW ──────────────────────────────────────────────────────

function startRound(io, room, game, socketMap) {
  const roundData = game.getNextRound();
  if (!roundData) {
    io.to(room.code).emit('game_over', { rankings: game.getRankings() });
    return;
  }

  // Send role-specific info to each player
  for (const [socketId, session] of socketMap.entries()) {
    if (session.roomCode !== room.code) continue;
    const playerInfo = game.getRoundInfoForPlayer(session.playerId);
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      sock.emit('round_start', playerInfo);
    }
  }

  io.to(room.code).emit('game_broadcast', {
    round: roundData.round,
    totalRounds: roundData.totalRounds,
    accusation: roundData.accusation,
    suspectId: roundData.suspectId,
    interrogatorIds: roundData.interrogatorIds,
    timeLimit: 180,
  });

  // Phase 1: Interrogation (180s = 3 min)
  game.setTimerSeconds(180);
  room.startTimer(180, (secondsLeft) => {
    game.setTimerSeconds(secondsLeft);
    io.to(room.code).emit('timer_tick', { secondsLeft });

    if (secondsLeft === 0) {
      // Phase 2: Voting (30s)
      game.roundState = 'voting';
      game.setVotingTimer(30);
      io.to(room.code).emit('interrogation_end', {});
      io.to(room.code).emit('voting_start', { timeLimit: 30 });

      room.startTimer(30, (voteSeconds) => {
        game.setVotingTimer(voteSeconds);
        io.to(room.code).emit('voting_timer', { secondsLeft: voteSeconds });

        if (voteSeconds === 0) {
          // Auto-resolve with whatever votes we have
          io.to(room.code).emit('voting_ended', {});
          const resolved = game.resolveRound();
          if (resolved) {
            io.to(room.code).emit('round_result', {
              ...resolved,
              suspectId: game.roundData.suspectId,
              scoresList: game.getScores(),
            });
          }
        }
      });
    }
  });
}

// ─── START ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🕵️ BUSTED server running on http://localhost:${PORT}`);
});
