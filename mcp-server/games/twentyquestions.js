/**
 * 20 Questions game implementation for /vibe
 * One player thinks of something, the other tries to guess it in 20 yes/no questions
 */

// Categories and example items for random selection
const CATEGORIES = {
  animals: [
    'elephant', 'dolphin', 'penguin', 'tiger', 'butterfly', 'octopus', 'kangaroo',
    'giraffe', 'owl', 'shark', 'panda', 'wolf', 'eagle', 'whale', 'lion',
    'monkey', 'bear', 'rabbit', 'snake', 'turtle', 'fox', 'deer', 'bat'
  ],
  objects: [
    'smartphone', 'guitar', 'bicycle', 'telescope', 'clock', 'umbrella', 'camera',
    'mirror', 'keyboard', 'lamp', 'backpack', 'compass', 'hammer', 'scissors',
    'calculator', 'headphones', 'pencil', 'book', 'chair', 'door', 'window', 'table'
  ],
  food: [
    'pizza', 'chocolate', 'apple', 'sushi', 'ice cream', 'hamburger', 'pasta',
    'banana', 'cheese', 'bread', 'cookie', 'sandwich', 'orange', 'cake',
    'popcorn', 'honey', 'soup', 'salad', 'coffee', 'tea', 'yogurt', 'rice'
  ],
  places: [
    'library', 'beach', 'mountain', 'forest', 'castle', 'hospital', 'school',
    'museum', 'theater', 'restaurant', 'park', 'bridge', 'lighthouse', 'cave',
    'waterfall', 'desert', 'island', 'city', 'village', 'garden', 'zoo', 'airport'
  ],
  activities: [
    'swimming', 'reading', 'dancing', 'cooking', 'painting', 'singing', 'running',
    'climbing', 'writing', 'fishing', 'gardening', 'photography', 'camping',
    'hiking', 'surfing', 'skiing', 'cycling', 'shopping', 'traveling', 'studying'
  ]
};

// Get random item from a category or all categories
function getRandomItem(category = null) {
  if (category && CATEGORIES[category]) {
    const items = CATEGORIES[category];
    return {
      item: items[Math.floor(Math.random() * items.length)],
      category: category
    };
  } else {
    // Random from all categories
    const allCategories = Object.keys(CATEGORIES);
    const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
    return getRandomItem(randomCategory);
  }
}

// Create initial 20 questions state
function createInitialTwentyQuestionsState(mode = 'guess', customItem = null, category = null) {
  const randomSelection = customItem ? 
    { item: customItem.toLowerCase(), category: 'custom' } : 
    getRandomItem(category);
    
  return {
    mode: mode, // 'guess' = player guesses AI's item, 'think' = AI guesses player's item
    item: randomSelection.item,
    category: randomSelection.category,
    questions: [],
    questionsLeft: 20,
    gameOver: false,
    won: false,
    currentQuestion: null,
    moves: 0,
    guesses: [] // Track actual guesses (not just questions)
  };
}

// Process a question (for 'guess' mode where player asks questions)
function askQuestion(gameState, question) {
  const { item, questions, questionsLeft, gameOver, moves } = gameState;
  
  if (gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  if (questionsLeft <= 0) {
    return { error: 'No questions left! Make your final guess.' };
  }
  
  // Normalize question
  const normalizedQuestion = question.toLowerCase().trim();
  
  // Check if it's a guess rather than a yes/no question
  if (normalizedQuestion.startsWith('is it ')) {
    const guess = normalizedQuestion.substring(6);
    return processGuess(gameState, guess);
  }
  
  // Simple AI to answer yes/no questions
  const answer = answerQuestion(normalizedQuestion, item, gameState.category);
  
  const newQuestions = [...questions, { question, answer, questionNumber: moves + 1 }];
  const newQuestionsLeft = questionsLeft - 1;
  const newMoves = moves + 1;
  
  const newGameState = {
    ...gameState,
    questions: newQuestions,
    questionsLeft: newQuestionsLeft,
    moves: newMoves,
    currentQuestion: { question, answer }
  };
  
  // Check if no questions left
  if (newQuestionsLeft === 0) {
    return {
      success: true,
      gameState: {
        ...newGameState,
        message: `That's all 20 questions! What's your final guess?`
      }
    };
  }
  
  return { success: true, gameState: newGameState };
}

// Process a final guess
function processGuess(gameState, guess) {
  const { item, guesses, gameOver } = gameState;
  
  if (gameOver) {
    return { error: 'Game is already over!' };
  }
  
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedItem = item.toLowerCase().trim();
  
  // Check for exact match or close match
  const isCorrect = normalizedGuess === normalizedItem || 
                   normalizedItem.includes(normalizedGuess) ||
                   normalizedGuess.includes(normalizedItem);
  
  const newGuesses = [...guesses, { guess: normalizedGuess, correct: isCorrect }];
  
  const newGameState = {
    ...gameState,
    guesses: newGuesses,
    gameOver: true,
    won: isCorrect,
    finalGuess: normalizedGuess
  };
  
  return { success: true, gameState: newGameState };
}

// Simple AI to answer yes/no questions about an item
function answerQuestion(question, item, category) {
  const q = question.toLowerCase();
  const itemLower = item.toLowerCase();
  
  // Size-related questions
  if (q.includes('big') || q.includes('large')) {
    const bigThings = ['elephant', 'whale', 'giraffe', 'mountain', 'castle', 'tree', 'building', 'car', 'house'];
    return bigThings.some(thing => itemLower.includes(thing) || thing.includes(itemLower)) ? 'yes' : 'no';
  }
  
  if (q.includes('small') || q.includes('tiny')) {
    const smallThings = ['butterfly', 'mouse', 'ant', 'coin', 'key', 'pencil', 'ring', 'watch'];
    return smallThings.some(thing => itemLower.includes(thing) || thing.includes(itemLower)) ? 'yes' : 'no';
  }
  
  // Category questions
  if (q.includes('animal') || q.includes('creature') || q.includes('living thing')) {
    return category === 'animals' ? 'yes' : 'no';
  }
  
  if (q.includes('food') || q.includes('eat') || q.includes('edible')) {
    return category === 'food' ? 'yes' : 'no';
  }
  
  if (q.includes('place') || q.includes('location') || q.includes('building')) {
    return category === 'places' ? 'yes' : 'no';
  }
  
  // Color questions
  if (q.includes('red')) {
    const redThings = ['apple', 'fire truck', 'rose', 'blood', 'strawberry', 'tomato'];
    return redThings.some(thing => itemLower.includes(thing)) ? 'yes' : 'no';
  }
  
  if (q.includes('blue')) {
    const blueThings = ['ocean', 'sky', 'whale', 'blueberry'];
    return blueThings.some(thing => itemLower.includes(thing)) ? 'yes' : 'no';
  }
  
  if (q.includes('green')) {
    const greenThings = ['tree', 'grass', 'frog', 'leaf', 'lettuce', 'cucumber'];
    return greenThings.some(thing => itemLower.includes(thing)) ? 'yes' : 'no';
  }
  
  // Physical properties
  if (q.includes('fly') || q.includes('flies')) {
    const flyingThings = ['bird', 'butterfly', 'bat', 'plane', 'helicopter', 'eagle', 'owl'];
    return flyingThings.some(thing => itemLower.includes(thing)) ? 'yes' : 'no';
  }
  
  if (q.includes('swim')) {
    const swimmingThings = ['fish', 'dolphin', 'shark', 'whale', 'turtle', 'penguin'];
    return swimmingThings.some(thing => itemLower.includes(thing)) ? 'yes' : 'no';
  }
  
  if (q.includes('water')) {
    const waterThings = ['ocean', 'river', 'fish', 'boat', 'swimming', 'whale', 'dolphin'];
    return waterThings.some(thing => itemLower.includes(thing)) ? 'yes' : 'no';
  }
  
  // Usage questions
  if (q.includes('use') || q.includes('tool')) {
    return category === 'objects' ? 'yes' : 'no';
  }
  
  if (q.includes('electronic') || q.includes('electricity') || q.includes('power')) {
    const electronicThings = ['phone', 'computer', 'tv', 'radio', 'camera', 'calculator', 'lamp'];
    return electronicThings.some(thing => itemLower.includes(thing)) ? 'yes' : 'no';
  }
  
  // Default responses for unhandled questions
  const yesWords = ['can', 'does', 'has', 'would', 'could'];
  const hasYesWord = yesWords.some(word => q.includes(word));
  
  // Give somewhat random but consistent answers for unrecognized questions
  const hash = question.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return Math.abs(hash) % 2 === 0 ? 'yes' : 'no';
}

// Format 20 questions display
function formatTwentyQuestionsDisplay(gameState) {
  const { questions, questionsLeft, gameOver, won, category, currentQuestion, guesses, finalGuess, item } = gameState;
  
  let display = `🤔 **20 Questions** (${20 - questionsLeft}/20 questions used)\n\n`;
  
  if (gameOver) {
    if (won) {
      display += `🎉 **You got it!** The answer was "${item}"!\n`;
      display += `Solved in ${questions.length} questions!`;
    } else {
      display += `💀 **Game Over!** The answer was "${item}"\n`;
      if (finalGuess) {
        display += `Your guess: "${finalGuess}"`;
      }
    }
  } else {
    display += `**Category hint:** ${category}\n`;
    display += `**Questions remaining:** ${questionsLeft}\n\n`;
    
    // Show recent questions
    if (questions.length > 0) {
      display += '**Recent questions:**\n';
      const recentQuestions = questions.slice(-3); // Show last 3
      for (const q of recentQuestions) {
        display += `${q.questionNumber}. "${q.question}" → **${q.answer}**\n`;
      }
      display += '\n';
    }
    
    if (currentQuestion) {
      display += `Last answer: **${currentQuestion.answer}**\n\n`;
    }
    
    if (questionsLeft > 0) {
      display += '**Ask a yes/no question or make a guess!**\n';
      display += 'Examples: "Is it alive?", "Is it bigger than a car?", "Is it a cat?"';
    } else {
      display += '**No questions left! What\'s your final guess?**';
    }
  }
  
  return display;
}

module.exports = {
  createInitialTwentyQuestionsState,
  askQuestion,
  processGuess,
  formatTwentyQuestionsDisplay,
  getRandomItem,
  CATEGORIES
};