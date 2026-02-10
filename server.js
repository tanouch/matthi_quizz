const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ─── Sample Questions (replace/extend as you like) ───
const QUESTIONS = [
  {
    question: "What planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    answer: 1
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Michelangelo", "Raphael", "Leonardo da Vinci", "Donatello"],
    answer: 2
  },
  {
    question: "What is the capital of Japan?",
    options: ["Seoul", "Beijing", "Tokyo", "Bangkok"],
    answer: 2
  },
  {
    question: "Which element has the chemical symbol 'O'?",
    options: ["Gold", "Osmium", "Oxygen", "Oganesson"],
    answer: 2
  },
  {
    question: "In what year did the Titanic sink?",
    options: ["1905", "1912", "1920", "1898"],
    answer: 1
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    answer: 3
  },
  {
    question: "Which language has the most native speakers?",
    options: ["English", "Spanish", "Mandarin Chinese", "Hindi"],
    answer: 2
  },
  {
    question: "What gas do plants absorb from the atmosphere?",
    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Helium"],
    answer: 2
  },
  {
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    answer: 1
  },
  {
    question: "What is the speed of light approximately?",
    options: ["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "30,000 km/s"],
    answer: 0
  }
];

// ─── Game State ───
let rooms = {};

function createRoom(code) {
  return {
    code,
    players: {},        // socketId -> { name, score, alive }
    hostId: null,
    currentQuestion: -1,
    answers: {},         // socketId -> chosenIndex (for current question)
    started: false,
    maxScore: QUESTIONS.length,
    questionTimer: null
  };
}

function getRoomByCode(code) {
  return rooms[code] || null;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms[code] ? generateCode() : code;
}

function broadcastPlayers(room) {
  const players = Object.entries(room.players).map(([id, p]) => ({
    id, name: p.name, score: p.score, isHost: id === room.hostId
  }));
  io.to(room.code).emit('players-update', players);
}

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // Host creates a room
  socket.on('create-room', (name, callback) => {
    const code = generateCode();
    rooms[code] = createRoom(code);
    const room = rooms[code];
    room.hostId = socket.id;
    room.players[socket.id] = { name, score: 0 };
    socket.join(code);
    socket.roomCode = code;
    callback({ code });
    broadcastPlayers(room);
  });

  // Player joins a room
  socket.on('join-room', (code, name, callback) => {
    const room = getRoomByCode(code.toUpperCase());
    if (!room) return callback({ error: 'Room not found' });
    if (room.started) return callback({ error: 'Game already started' });
    if (Object.keys(room.players).length >= 12) return callback({ error: 'Room is full (max 12)' });

    room.players[socket.id] = { name, score: 0 };
    socket.join(room.code);
    socket.roomCode = room.code;
    callback({ code: room.code });
    broadcastPlayers(room);
  });

  // Host starts the game
  socket.on('start-game', () => {
    const room = getRoomByCode(socket.roomCode);
    if (!room || socket.id !== room.hostId) return;
    room.started = true;
    room.currentQuestion = -1;
    // Reset scores
    Object.values(room.players).forEach(p => p.score = 0);
    io.to(room.code).emit('game-started', { totalQuestions: QUESTIONS.length });
    // Send first question after short delay
    setTimeout(() => sendNextQuestion(room), 1500);
  });

  // Player submits an answer
  socket.on('submit-answer', (answerIndex) => {
    const room = getRoomByCode(socket.roomCode);
    if (!room || room.currentQuestion < 0) return;
    if (room.answers[socket.id] !== undefined) return; // already answered
    room.answers[socket.id] = answerIndex;

    // Check if all players answered
    const playerIds = Object.keys(room.players);
    const allAnswered = playerIds.every(id => room.answers[id] !== undefined);
    if (allAnswered) {
      clearTimeout(room.questionTimer);
      revealAnswer(room);
    }
  });

  // Host requests next question
  socket.on('next-question', () => {
    const room = getRoomByCode(socket.roomCode);
    if (!room || socket.id !== room.hostId) return;
    sendNextQuestion(room);
  });

  socket.on('disconnect', () => {
    const room = getRoomByCode(socket.roomCode);
    if (!room) return;
    delete room.players[socket.id];
    if (Object.keys(room.players).length === 0) {
      clearTimeout(room.questionTimer);
      delete rooms[socket.roomCode];
    } else {
      if (room.hostId === socket.id) {
        room.hostId = Object.keys(room.players)[0];
      }
      broadcastPlayers(room);
    }
  });
});

function sendNextQuestion(room) {
  room.currentQuestion++;
  if (room.currentQuestion >= QUESTIONS.length) {
    // Game over
    const finalScores = Object.entries(room.players).map(([id, p]) => ({
      id, name: p.name, score: p.score
    })).sort((a, b) => b.score - a.score);
    io.to(room.code).emit('game-over', finalScores);
    room.started = false;
    return;
  }

  room.answers = {};
  const q = QUESTIONS[room.currentQuestion];
  io.to(room.code).emit('new-question', {
    index: room.currentQuestion,
    total: QUESTIONS.length,
    question: q.question,
    options: q.options,
    timeLimit: 15
  });

  // Auto-reveal after 15s
  room.questionTimer = setTimeout(() => revealAnswer(room), 16000);
}

function revealAnswer(room) {
  const q = QUESTIONS[room.currentQuestion];
  const correctIndex = q.answer;
  const results = {};

  Object.entries(room.players).forEach(([id, player]) => {
    const chosen = room.answers[id];
    const correct = chosen === correctIndex;
    if (correct) player.score++;
    results[id] = { correct, chosen };
  });

  const standings = Object.entries(room.players).map(([id, p]) => ({
    id, name: p.name, score: p.score,
    correct: results[id]?.correct || false,
    maxScore: QUESTIONS.length
  })).sort((a, b) => b.score - a.score);

  io.to(room.code).emit('answer-reveal', {
    correctIndex,
    correctAnswer: q.options[correctIndex],
    results,
    standings,
    questionIndex: room.currentQuestion,
    totalQuestions: QUESTIONS.length
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎮 Fall Quiz running on http://localhost:${PORT}`);
});
