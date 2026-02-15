const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QUESTIONS = require('./questions.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

function generateCode() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += c[Math.floor(Math.random() * c.length)];
  return rooms[code] ? generateCode() : code;
}

function broadcastPlayers(room) {
  const players = Object.entries(room.players).map(([id, p]) => ({
    id, name: p.name, score: p.score, isHost: id === room.hostId
  }));
  io.to(room.code).emit('players-update', players);
}

function sendNextQuestion(room) {
  room.currentQuestion++;
  if (room.currentQuestion >= QUESTIONS.length) {
    const scores = Object.entries(room.players)
      .map(([id, p]) => ({ id, name: p.name, score: p.score }))
      .sort((a, b) => b.score - a.score);
    io.to(room.code).emit('game-over', scores);
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
    timeLimit: 8
  });
  room.questionTimer = setTimeout(() => revealAnswer(room), 9000);
}

function revealAnswer(room) {
  const q = QUESTIONS[room.currentQuestion];
  const results = {};
  Object.entries(room.players).forEach(([id, player]) => {
    const chosen = room.answers[id];
    const correct = chosen === q.answer;
    if (correct) player.score++;
    results[id] = { correct, chosen };
  });
  const standings = Object.entries(room.players)
    .map(([id, p]) => ({
      id, name: p.name, score: p.score,
      correct: results[id]?.correct || false
    }))
    .sort((a, b) => b.score - a.score);
  io.to(room.code).emit('answer-reveal', {
    correctIndex: q.answer,
    correctAnswer: q.options[q.answer],
    results, standings,
    questionIndex: room.currentQuestion,
    totalQuestions: QUESTIONS.length
  });
}

io.on('connection', (socket) => {
  socket.on('create-room', (name, cb) => {
    const code = generateCode();
    rooms[code] = { code, players: {}, hostId: socket.id, currentQuestion: -1, answers: {}, started: false, questionTimer: null };
    rooms[code].players[socket.id] = { name, score: 0 };
    socket.join(code);
    socket.roomCode = code;
    cb({ code });
    broadcastPlayers(rooms[code]);
  });

  socket.on('join-room', (code, name, cb) => {
    const room = rooms[code?.toUpperCase()];
    if (!room) return cb({ error: 'Room not found' });
    if (room.started) return cb({ error: 'Game already started' });
    room.players[socket.id] = { name, score: 0 };
    socket.join(room.code);
    socket.roomCode = room.code;
    cb({ code: room.code });
    broadcastPlayers(room);
  });

  socket.on('start-game', () => {
    const room = rooms[socket.roomCode];
    if (!room || socket.id !== room.hostId) return;
    room.started = true;
    room.currentQuestion = -1;
    Object.values(room.players).forEach(p => p.score = 0);
    io.to(room.code).emit('game-started', { totalQuestions: QUESTIONS.length });
    setTimeout(() => sendNextQuestion(room), 1500);
  });

  socket.on('submit-answer', (idx) => {
    const room = rooms[socket.roomCode];
    if (!room || room.currentQuestion < 0 || room.answers[socket.id] !== undefined) return;
    room.answers[socket.id] = idx;
    if (Object.keys(room.players).every(id => room.answers[id] !== undefined)) {
      clearTimeout(room.questionTimer);
      revealAnswer(room);
    }
  });

  socket.on('next-question', () => {
    const room = rooms[socket.roomCode];
    if (room && socket.id === room.hostId) sendNextQuestion(room);
  });

  socket.on('disconnect', () => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    delete room.players[socket.id];
    if (!Object.keys(room.players).length) {
      clearTimeout(room.questionTimer);
      delete rooms[socket.roomCode];
    } else {
      if (room.hostId === socket.id) room.hostId = Object.keys(room.players)[0];
      broadcastPlayers(room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 Fall Quiz on http://localhost:${PORT}`));