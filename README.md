# 🎮 FALL QUIZ

A real-time multiplayer quiz game where wrong answers make you **fall**. Players start at the top — each mistake drops you further down the cliff. Last one standing wins!

## How It Works

1. **Host** creates a room → gets a 4-letter code
2. **Friends** join with the code (up to 12 players)
3. Host starts the game → 10 multiple-choice questions
4. After each question, see the **falling leaderboard**: wrong answers push you down
5. Final standings reveal the champion 🏆

## Quick Start (Local)

```bash
# Install dependencies
npm install

# Run the server
npm start

# Open http://localhost:3000
```

Your friends on the same network can join via your local IP (e.g., `http://192.168.1.42:3000`).

---

## Hosting Options (so friends can connect remotely)

### Option 1: Railway (Easiest — free tier)
1. Push code to a GitHub repo
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. It auto-detects Node.js, deploys, and gives you a public URL
5. Share the URL with friends!

### Option 2: Render (Free tier)
1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo
4. Build command: `npm install`
5. Start command: `node server.js`
6. Done — free `.onrender.com` URL

### Option 3: Fly.io
```bash
# Install flyctl, then:
fly launch
fly deploy
```

### Option 4: Docker (any VPS)
```bash
docker build -t fall-quiz .
docker run -p 3000:3000 fall-quiz
```

### Option 5: ngrok (Quick temporary sharing)
```bash
npm start
# In another terminal:
ngrok http 3000
```
This gives you a public URL instantly. Great for a one-time game night.

---

## Customizing Questions

Edit the `QUESTIONS` array in `server.js`. Each question has:

```js
{
  question: "Your question here?",
  options: ["Option A", "Option B", "Option C", "Option D"],
  answer: 0  // index of correct option (0-based)
}
```

---

## Tech Stack

- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vanilla HTML/CSS/JS (no build step needed)
- **Real-time**: WebSockets via Socket.IO

## Project Structure

```
fall-quiz/
├── server.js          # Game logic + WebSocket server
├── public/
│   └── index.html     # Full UI (CSS + JS inline)
├── package.json
├── Dockerfile
└── README.md
```
