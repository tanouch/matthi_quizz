# 🎮 FALL QUIZ

Multiplayer quiz — wrong answers make you fall. Last one standing wins.

## Architecture

```
frontend/          → Deploy to Netlify (static HTML)
  index.html
  netlify.toml

backend/           → Deploy to Render (Node.js)
  server.js
  questions.json   ← Edit this to change questions!
  package.json
```

## Setup

### 1. Deploy backend on Render (free)
1. Push the `backend/` folder to a GitHub repo
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect repo, set:
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
4. Deploy → copy the URL (e.g. `https://fall-quiz-backend.onrender.com`)

### 2. Deploy frontend on Netlify (free)
1. In `frontend/index.html`, change `BACKEND_URL` to your Render URL
2. Push `frontend/` folder to a GitHub repo (or drag-drop on Netlify)
3. Go to [netlify.com](https://netlify.com) → Add new site → Deploy
4. Share the Netlify URL with friends!

### Local dev
```bash
cd backend && npm install && npm start
# Then open frontend/index.html and keep BACKEND_URL as http://localhost:3000
```

## Customizing questions

Edit `backend/questions.json`. Each question supports 4-8 options:

```json
{
  "question": "Your question?",
  "options": ["A", "B", "C", "D", "E", "F"],
  "answer": 2
}
```

`answer` is the 0-based index of the correct option.
