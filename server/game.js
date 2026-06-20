// BUSTED Game - Core Game Logic v2 (Group Mode)
// Handles room state, rounds, multi-player voting, scoring

import { v4 as uuidv4 } from 'uuid';

// ─── ACCUSATIONS & DETAILS ────────────────────────────────────────────

const ACCUSATIONS = [
  {
    text: "Te han pillado robando el móvil del profe",
    options: [
      { detail: "El motivo era para llamar a un amigo al extranjero", real: true },
      { detail: "El motivo era borrar una nota que te incriminaba", real: false },
      { detail: "El motivo era cambiar la nota de un examen", real: false },
    ]
  },
  {
    text: "Te han pillado copiando en el examen",
    options: [
      { detail: "Lo hiciste porque no estudiaste nada y era recuperación", real: true },
      { detail: "Lo hiciste porque querías sacar mejor nota que tu rival", real: false },
      { detail: "Lo hiciste porque te apostaste algo con un amigo", real: false },
    ]
  },
  {
    text: "Te han pillado escondiendo comida en tu cuarto",
    options: [
      { detail: "Era para una fiesta sorpresa que estabas organizando", real: true },
      { detail: "Era porque no te dejaban comer dulces en casa", real: false },
      { detail: "Era para venderlo en el instituto", real: false },
    ]
  },
  {
    text: "Te han pillado fingiendo estar enfermo para no ir al cole",
    options: [
      { detail: "En realidad tenías un evento importante de tu equipo", real: true },
      { detail: "En realidad había salido un videojuego que llevabas meses esperando", real: false },
      { detail: "En realidad tenías una cita con alguien especial", real: false },
    ]
  },
  {
    text: "Te han pillado usando el móvil en clase",
    options: [
      { detail: "Estabas grabando al profe para una prueba de algo", real: true },
      { detail: "Estabas viendo el resultado de un partido en directo", real: false },
      { detail: "Estabas chateando con alguien de otra clase", real: false },
    ]
  },
  {
    text: "Te han pillado colándote en una fiesta",
    options: [
      { detail: "En realidad tenías invitación, pero de otra persona", real: true },
      { detail: "En realidad solo querías ver a tu crush que estaba dentro", real: false },
      { detail: "En realidad te confundiste de puerta y ya dentro no supiste salir", real: false },
    ]
  },
  {
    text: "Te han pillado haciendo trampas en el juego online",
    options: [
      { detail: "No era trampa, era un mod que tenías instalado de antes", real: true },
      { detail: "Sí, ibas perdiendo 20 partidas seguidas y no lo soportabas", real: false },
      { detail: "En realidad tu primo pequeño tocó el teclado sin querer", real: false },
    ]
  },
  {
    text: "Te han pillado mirando el WhatsApp de otro",
    options: [
      { detail: "Te dejaron el móvil y solo querías poner una foto graciosa", real: true },
      { detail: "Sospechabas que hablaban mal de ti y querías comprobarlo", real: false },
      { detail: "Te sonó una notificación y la viste sin querer, luego ya no pudiste parar", real: false },
    ]
  },
  {
    text: "Te han pillado durmiéndote en clase",
    options: [
      { detail: "Estuviste hasta tarde haciendo un trabajo que contaba nota", real: true },
      { detail: "Tomaste un medicamento que da sueño como efecto secundario", real: false },
      { detail: "Había una serie que se estrenó a las 3am y no te la podías perder", real: false },
    ]
  },
  {
    text: "Te han pillado saltándote la valla del insti",
    options: [
      { detail: "Se te había caído la cartera al otro lado y no había otra forma", real: true },
      { detail: "Quedaste con unos amigos para ir al centro comercial", real: false },
      { detail: "Viste un perro atrapado y fuiste a ayudarlo sin pensar", real: false },
    ]
  },
];

const POWER_CARD_TYPES = [
  { id: 'mentira_doble', name: 'Mentira Doble', desc: 'Da dos respuestas sin penalización', icon: '🃏' },
  { id: 'detective', name: 'Detective', desc: 'Elimina una opción falsa para todos', icon: '🔍' },
  { id: 'coartada_falsa', name: 'Coartada Falsa', desc: 'Añade una opción falsa convincente', icon: '🎭' },
];

const RANK_TITLES = [
  { minScore: 50, title: 'Mentiroso/a Legendario/a' },
  { minScore: 35, title: 'Detective de Élite' },
  { minScore: 20, title: 'Sombra Sospechosa' },
  { minScore: 10, title: 'Novato/a con Potencial' },
  { minScore: 0, title: 'El Que Siempre Cae' },
];

const REPORT_QUOTES = {
  busted: [
    "¡Te tenemos! La verdad siempre sale a la luz.",
    "Caso cerrado. No puedes esconderte de la justicia.",
    "BUSTED. La próxima vez miente mejor.",
    "La ley ha hablado. Eres culpable y lo sabes.",
  ],
  free: [
    "¡LIBRE! Has engañado a todos como un profesional.",
    "Inocente. Esta vez la has liado bien.",
    "Absuelto por falta de pruebas.",
    "¡Te has salido con la tuya! La duda favorece al acusado.",
  ]
};

// ─── ROOM MANAGER ────────────────────────────────────────────────────

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostPlayer) {
    const code = this.createRoomCode();
    const room = new Room(code, hostPlayer);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code) || null;
  }

  removeRoom(code) {
    this.rooms.delete(code);
  }
}

// ─── ROOM CLASS ───────────────────────────────────────────────────────

class Room {
  constructor(code, hostPlayer) {
    this.code = code;
    this.players = new Map();
    this.hostId = hostPlayer.id;
    this.game = null;
    this.createdAt = Date.now();
    this.timerInterval = null;

    this.addPlayer(hostPlayer);
  }

  addPlayer(player) {
    this.players.set(player.id, player);
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    if (this.hostId === playerId && this.players.size > 0) {
      this.hostId = [...this.players.keys()][0];
    }
  }

  getPlayerList() {
    return [...this.players.values()].map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.id === this.hostId,
    }));
  }

  getPlayer(playerId) {
    return this.players.get(playerId) || null;
  }

  startGame() {
    if (this.game) return null;
    if (this.players.size < 2) return null;
    this.game = new Game([...this.players.values()]);
    return this.game;
  }

  startTimer(seconds, callback) {
    this.stopTimer();
    let remaining = seconds;
    callback(remaining);
    this.timerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.stopTimer();
        callback(0);
      } else {
        callback(remaining);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  cleanup() {
    this.stopTimer();
    this.game = null;
  }
}

// ─── GAME CLASS ───────────────────────────────────────────────────────

class Game {
  constructor(players) {
    this.players = {};
    for (const p of players) {
      this.players[p.id] = {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: 0,
        powerCards: this._dealPowerCards(),
      };
    }
    this.playerIds = players.map(p => p.id);
    this.totalRounds = 5;
    this.currentRound = 0;
    this.roundState = null; // 'interrogation' | 'voting' | 'result'
    this.roundData = null;
    this.usedAccusations = new Set();
    this.rematchRequested = new Set();
  }

  _dealPowerCards() {
    const deck = [...POWER_CARD_TYPES];
    const count = Math.min(2, deck.length);
    const cards = [];
    const shuffled = deck.sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      cards.push({ ...shuffled[i], used: false });
    }
    return cards;
  }

  getNextRound() {
    if (this.currentRound >= this.totalRounds) return null;

    this.currentRound++;
    const round = this.currentRound;

    // Pick accusation
    const available = ACCUSATIONS.filter((_, i) => !this.usedAccusations.has(i));
    if (available.length === 0) this.usedAccusations.clear();
    const pool = available.length > 0 ? available : ACCUSATIONS;
    const accusation = pool[Math.floor(Math.random() * pool.length)];
    const accIndex = ACCUSATIONS.indexOf(accusation);
    this.usedAccusations.add(accIndex);

    // Assign suspect (rotates every round)
    const suspectIdx = (round - 1) % this.playerIds.length;
    const suspectId = this.playerIds[suspectIdx];
    const interrogatorIds = this.playerIds.filter(id => id !== suspectId);

    // Options
    const realIdx = accusation.options.findIndex(o => o.real);
    this.roundData = {
      round,
      accusation: accusation.text,
      suspectId,
      interrogatorIds,
      correctIndex: realIdx,
      currentOptions: accusation.options.map((o, i) => ({ text: o.detail, isReal: i === realIdx })),
      votes: {},        // playerId -> optionIndex voted
      suspectWon: null,
      timerSeconds: 60,
      votingTimer: 30,
    };

    this.roundState = 'interrogation';

    return {
      round,
      totalRounds: this.totalRounds,
      accusation: accusation.text,
      options: this.roundData.currentOptions.map(o => o.text),
      suspectId,
      interrogatorIds,
      timeLimit: 180,
    };
  }

  applyPowerCard(playerId, cardType) {
    const player = this.players[playerId];
    if (!player) return { success: false, error: 'Jugador no encontrado' };

    const card = player.powerCards.find(c => c.id === cardType && !c.used);
    if (!card) return { success: false, error: 'No tienes esa carta disponible' };

    card.used = true;
    const effect = {};

    switch (cardType) {
      case 'mentira_doble':
        if (playerId !== this.roundData.suspectId) return { success: false, error: 'Solo el sospechoso puede usar esta carta' };
        effect.type = 'mentira_doble';
        effect.message = '¡Mentira Doble! El sospechoso puede dar dos versiones distintas';
        break;

      case 'detective': {
        if (this.roundData.interrogatorIds.includes(playerId) && playerId !== this.roundData.suspectId) {
          // Remove a random fake option for everyone
          const fakeIndices = this.roundData.currentOptions
            .map((o, i) => ({ ...o, i }))
            .filter(o => !o.isReal);
          if (fakeIndices.length === 0) return { success: false, error: 'No hay opciones falsas que eliminar' };
          const removeIdx = fakeIndices[Math.floor(Math.random() * fakeIndices.length)].i;
          this.roundData.currentOptions.splice(removeIdx, 1);
          effect.type = 'detective';
          effect.message = '¡Carta Detective! Se ha eliminado una opción falsa para todos';
          effect.removedIndex = removeIdx;
        } else if (playerId === this.roundData.suspectId) {
          return { success: false, error: 'El sospechoso no puede usar esta carta' };
        } else {
          return { success: false, error: 'No puedes usar esta carta ahora' };
        }
        break;
      }

      case 'coartada_falsa':
        if (playerId !== this.roundData.suspectId) return { success: false, error: 'Solo el sospechoso puede usar esta carta' };
        const fakeText = this._generateFakeOption();
        this.roundData.currentOptions.push({ text: fakeText, isReal: false });
        effect.type = 'coartada_falsa';
        effect.message = '¡Coartada Falsa! Se ha añadido una opción falsa muy convincente';
        effect.newOption = fakeText;
        break;
    }

    return { success: true, effect, card };
  }

  _generateFakeOption() {
    const fakes = [
      "La verdad es que fue tu gemelo malvado, no tú",
      "En realidad fue un complot de los aliens para incriminarte",
      "Todo era parte de un experimento social y no sabías que te grababan",
      "La culpa la tiene la IA del instituto que te confundió con otro",
      "En realidad estabas poseído por un espíritu travieso",
      "Todo es un montaje de tus enemigos para arruinarte la vida",
      "La explicación es que viajaste en el tiempo sin querer y alteraste el pasado",
    ];
    return fakes[Math.floor(Math.random() * fakes.length)];
  }

  submitVote(playerId, optionIndex) {
    const rd = this.roundData;
    if (!rd) return { success: false, error: 'No hay ronda activa' };
    if (playerId === rd.suspectId) return { success: false, error: 'El sospechoso no vota' };
    if (rd.votes[playerId] !== undefined) return { success: false, error: 'Ya has votado' };
    if (optionIndex < 0 || optionIndex >= rd.currentOptions.length) return { success: false, error: 'Opción inválida' };
    if (this.roundState !== 'voting') return { success: false, error: 'Aún no es momento de votar' };

    rd.votes[playerId] = optionIndex;

    // Check if all interrogators have voted
    const allVoted = rd.interrogatorIds.every(id => rd.votes[id] !== undefined);

    if (allVoted) {
      return { success: true, allVoted: true };
    }

    return { success: true, allVoted: false };
  }

  resolveRound() {
    const rd = this.roundData;
    if (!rd) return null;

    const correctIdx = rd.currentOptions.findIndex(o => o.isReal);

    // Calculate votes
    let correctVotes = 0;
    let wrongVotes = 0;
    const voteDetails = [];

    for (const id of rd.interrogatorIds) {
      const voted = rd.votes[id] !== undefined;
      if (!voted) {
        // Auto-assign random for anyone who didn't vote
        rd.votes[id] = Math.floor(Math.random() * rd.currentOptions.length);
      }
      const choice = rd.votes[id];
      const isCorrect = choice === correctIdx;
      voteDetails.push({
        playerId: id,
        playerName: this.players[id]?.name || '?',
        choice,
        isCorrect,
      });
      if (isCorrect) correctVotes++;
      else wrongVotes++;
    }

    // Scoring
    const correctBonus = correctVotes * 10; // +10 per correct interrogator
    const wrongPenalty = wrongVotes * 5;    // +5 to suspect per wrong interrogator
    const allWrongBonus = (correctVotes === 0 && rd.interrogatorIds.length > 0) ? 15 : 0; // +15 if all wrong

    for (const id of rd.interrogatorIds) {
      const isCorrect = rd.votes[id] === correctIdx;
      if (isCorrect) this.players[id].score += 10;
    }
    this.players[rd.suspectId].score += wrongPenalty + allWrongBonus;

    const suspectWon = wrongVotes > correctVotes;
    const quotePool = suspectWon ? REPORT_QUOTES.free : REPORT_QUOTES.busted;
    const quote = quotePool[Math.floor(Math.random() * quotePool.length)];

    this.roundState = 'result';

    return {
      correctOptionIndex: correctIdx,
      suspectWon,
      correctVotes,
      wrongVotes,
      wrongPenalty,
      allWrongBonus,
      voteDetails,
      quote,
      options: rd.currentOptions.map(o => o.text),
      correctText: rd.currentOptions.find(o => o.isReal)?.text || '',
      scores: Object.fromEntries(
        Object.entries(this.players).map(([id, p]) => [id, p.score])
      ),
    };
  }

  getRoundInfoForPlayer(playerId) {
    if (!this.roundData) return null;
    const rd = this.roundData;
    const isSuspect = playerId === rd.suspectId;
    const isInterrogator = rd.interrogatorIds.includes(playerId);

    const info = {
      round: rd.round,
      totalRounds: this.totalRounds,
      accusation: rd.accusation,
      role: isSuspect ? 'suspect' : 'voter',
      isSuspect,
      isVoter: isInterrogator,
      options: rd.currentOptions.map(o => o.text),
      timeLimit: 60,
      timerSeconds: rd.timerSeconds,
      votingTimer: rd.votingTimer,
      suspectId: rd.suspectId,
      interrogatorIds: rd.interrogatorIds,
      totalPlayers: this.playerIds.length,
    };

    if (isSuspect) {
      info.secretDetail = rd.currentOptions.findIndex(o => o.isReal);
    }

    return info;
  }

  setTimerSeconds(seconds) {
    if (this.roundData) {
      this.roundData.timerSeconds = seconds;
    }
  }

  setVotingTimer(seconds) {
    if (this.roundData) {
      this.roundData.votingTimer = seconds;
    }
  }

  getScores() {
    return Object.fromEntries(
      Object.entries(this.players).map(([id, p]) => [id, { name: p.name, score: p.score, avatar: p.avatar }])
    );
  }

  getRankings() {
    const sorted = Object.values(this.players).sort((a, b) => b.score - a.score);
    return sorted.map(p => {
      const rank = RANK_TITLES.find(r => p.score >= r.minScore) || RANK_TITLES[RANK_TITLES.length - 1];
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        title: rank.title,
      };
    });
  }

  isComplete() {
    return this.currentRound >= this.totalRounds;
  }

  requestRematch(playerId) {
    this.rematchRequested.add(playerId);
    return this.rematchRequested.size >= this.playerIds.length;
  }

  reset() {
    this.currentRound = 0;
    this.roundState = null;
    this.roundData = null;
    this.usedAccusations = new Set();
    this.rematchRequested = new Set();
    for (const p of Object.values(this.players)) {
      p.score = 0;
      p.powerCards = this._dealPowerCards();
    }
  }
}

export { RoomManager, Room, Game, POWER_CARD_TYPES, ACCUSATIONS };
