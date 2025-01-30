# Brutalist Synonym Game

A manual implementation of a word matching game with a brutalist design aesthetic.

## Game Rules

1. Two players take turns entering words
2. Each round has different states:
   - WAITING: Initial game state
   - COUNTDOWN: 10-second countdown (manual advance)
   - ACTIVE: 20-second word submission phase (manual advance)
   - SCORING: Calculate points based on word similarity
   - COMPLETE: Game ends after 6 rounds

## Scoring

- Base score: 100 points
- -20 points per differing letter
- Scores accumulate over rounds
- Highest total score wins

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to play the game.

## How to Play

1. Press "START GAME" to begin
2. Follow the button prompts to advance through game states
3. Enter words during the ACTIVE state
4. Complete 6 rounds to finish the game
5. Press "PLAY AGAIN" to start a new game
