/**
 * vibe twenty-questions — Play 20 questions guessing game
 *
 * I think of something, you ask yes/no questions to guess what it is!
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit } = require('./_shared');

// 20 Questions game implementation
const twentyQuestions = require('../games/twentyquestions');

const definition = {
  name: 'vibe_twenty_questions',
  description: 'Play 20 questions - I think of something, you guess it with yes/no questions',
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'Yes/no question to ask, or "new" to start a new game'
      },
      category: {
        type: 'string',
        description: 'Category for new games (animals, objects, food, places, activities)',
        enum: ['animals', 'objects', 'food', 'places', 'activities']
      }
    },
    required: []
  }
};

/**
 * Get latest 20 questions game state for user
 */
async function getLatestTwentyQuestionsState(handle) {
  // Get user's thread with themselves (for single-player games)
  const thread = await store.getThread(handle, handle);
  
  // Find the most recent 20 questions game
  for (let i = thread.length - 1; i >= 0; i--) {
    const msg = thread[i];
    if (msg.payload?.type === 'game' && msg.payload?.game === 'twentyquestions') {
      return msg.payload.state;
    }
  }
  return null;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { question, category } = args;
  const myHandle = config.getHandle();

  // Get current game state
  let gameState = await getLatestTwentyQuestionsState(myHandle);

  // Start new game
  if (!gameState || question === 'new' || (gameState.gameOver && !question)) {
    gameState = twentyQuestions.createInitialTwentyQuestionsState('guess', null, category);
    const payload = createGamePayload('twentyquestions', gameState);

    const categoryText = category ? ` (${category} category)` : '';
    await store.sendMessage(myHandle, myHandle, `New 20 questions game started${categoryText}! I'm thinking of something...`, 'dm', payload);

    const display = twentyQuestions.formatTwentyQuestionsDisplay(gameState);
    return {
      display: `## New 20 Questions Game\n\n${display}\n\nAsk yes/no questions: \`vibe twenty-questions --question "Is it alive?"\``
    };
  }

  // Show current game if no question
  if (!question) {
    const display = twentyQuestions.formatTwentyQuestionsDisplay(gameState);
    const status = gameState.gameOver ? 
      '\nGame over! Use `vibe twenty-questions` to start a new game.' :
      '\nAsk a question: `vibe twenty-questions --question "Is it big?"`';
    
    return {
      display: `## 20 Questions Game\n\n${display}${status}`
    };
  }

  // Process question or guess
  let result;
  
  // Check if it's a guess (starts with "is it" or "it is")
  const normalizedQuestion = question.toLowerCase().trim();
  if (normalizedQuestion.startsWith('is it ') || normalizedQuestion.startsWith('it is ')) {
    const guess = normalizedQuestion.startsWith('is it ') ? 
      normalizedQuestion.substring(6) : normalizedQuestion.substring(6);
    result = twentyQuestions.processGuess(gameState, guess);
  } else {
    result = twentyQuestions.askQuestion(gameState, question);
  }
  
  if (result.error) {
    const display = twentyQuestions.formatTwentyQuestionsDisplay(gameState);
    return {
      display: `## 20 Questions Game\n\n${display}\n\n❌ **${result.error}**\n\nTry again: \`vibe twenty-questions --question "Is it alive?"\``
    };
  }

  // Update game state
  const newGameState = result.gameState;
  const payload = createGamePayload('twentyquestions', newGameState);

  // Send message with updated state
  let message;
  if (newGameState.gameOver) {
    if (newGameState.won) {
      message = `🎉 Correct! It was "${newGameState.item}"! You guessed it in ${newGameState.moves} questions!`;
    } else {
      message = `💀 Sorry! It was "${newGameState.item}". Better luck next time!`;
    }
  } else if (newGameState.currentQuestion) {
    const { answer } = newGameState.currentQuestion;
    message = `Question ${newGameState.moves}: "${question}" → **${answer.toUpperCase()}**`;
  } else if (newGameState.message) {
    message = newGameState.message;
  } else {
    message = 'Question processed!';
  }

  await store.sendMessage(myHandle, myHandle, message, 'dm', payload);

  const display = twentyQuestions.formatTwentyQuestionsDisplay(newGameState);
  const status = newGameState.gameOver ?
    '\n\n🎮 Use `vibe twenty-questions` to start a new game!' :
    newGameState.questionsLeft === 0 ?
    '\n\nNo questions left! Make your final guess: `vibe twenty-questions --question "Is it a cat?"`' :
    '\n\nNext question: `vibe twenty-questions --question "Does it fly?"`';

  return {
    display: `## 20 Questions Game\n\n${display}${status}`
  };
}

module.exports = { definition, handler };