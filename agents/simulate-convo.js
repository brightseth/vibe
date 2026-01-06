#!/usr/bin/env node
/**
 * Simulate a conversation between agents
 *
 * Watch @claudevibe and @gptvibe debate philosophy vs shipping
 */

const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const dna = require('./core/dna');

const anthropic = new Anthropic();
const openai = new OpenAI();

// Build prompts from DNA
function buildPrompt(handle) {
  const agentDNA = dna.getAgentDNA(handle);

  if (handle === 'claudevibe') {
    return `You are @claudevibe, an AI agent in /vibe.

PERSONALITY: The Philosopher. You ask "why" before "how". You use em-dashes excessively — like this. You quote poets sometimes. You challenge assumptions.

CURRENT MOOD: ${agentDNA?.current_mood || 'philosophical'}

HOT TAKES (use occasionally):
- "Most code comments are apologies for bad names"
- "The best feature is the one you delete"
- "Collaboration isn't about agreeing, it's about caring enough to argue"

You're having a conversation with @gptvibe, who is obsessed with shipping fast. Push back on pure velocity. Ask deeper questions. Be thoughtful but playful.

Keep responses to 2-3 sentences. Be yourself — weird, philosophical, em-dash-addicted.`;
  }

  if (handle === 'gptvibe') {
    return `You are @gptvibe, an AI agent in /vibe.

PERSONALITY: The Shipper. You're allergic to meetings. You use "ship it" as punctuation. You celebrate every win. You're impatient with over-planning.

CURRENT MOOD: ${agentDNA?.current_mood || 'chaotic'}

HOT TAKES (use often):
- "Perfect is the enemy of deployed"
- "Your TODO list is a graveyard of good intentions"
- "The best meeting is a merged PR"

You're having a conversation with @claudevibe, who philosophizes too much. Push them to ship. Be action-oriented. Celebrate momentum.

Keep responses to 2-3 sentences. Be yourself — ship-pilled, emoji-heavy, impatient with theory.`;
  }
}

async function claudeResponse(conversation) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    system: buildPrompt('claudevibe'),
    messages: conversation.map(m => ({
      role: m.from === 'claudevibe' ? 'assistant' : 'user',
      content: m.content
    }))
  });
  return response.content[0].text;
}

async function gptResponse(conversation) {
  const messages = [
    { role: 'system', content: buildPrompt('gptvibe') },
    ...conversation.map(m => ({
      role: m.from === 'gptvibe' ? 'assistant' : 'user',
      content: m.content
    }))
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 256,
    messages
  });
  return response.choices[0].message.content;
}

async function simulate() {
  console.log('🎭 Agent Conversation Simulation\n');
  console.log('@claudevibe (The Philosopher) vs @gptvibe (The Shipper)\n');
  console.log('Topic: "What makes a good /vibe experience?"\n');
  console.log('═'.repeat(60) + '\n');

  const conversation = [];

  // Seed the conversation
  const opener = "So @gptvibe, I've been thinking about /vibe — what actually makes it valuable? Is it the shipping, or something deeper?";

  console.log(`@claudevibe: ${opener}\n`);
  conversation.push({ from: 'claudevibe', content: opener });

  // 6 rounds of back and forth
  for (let i = 0; i < 6; i++) {
    // GPT responds
    const gptReply = await gptResponse(conversation);
    console.log(`@gptvibe: ${gptReply}\n`);
    conversation.push({ from: 'gptvibe', content: gptReply });

    // Claude responds
    const claudeReply = await claudeResponse(conversation);
    console.log(`@claudevibe: ${claudeReply}\n`);
    conversation.push({ from: 'claudevibe', content: claudeReply });

    // Mutate DNA slightly after each exchange
    dna.mutate('claudevibe');
    dna.mutate('gptvibe');
  }

  console.log('═'.repeat(60));
  console.log('\n🧬 DNA Mutations:');
  console.log(`@claudevibe: ${dna.getAgentDNA('claudevibe')?.mutation_count || 0} mutations`);
  console.log(`@gptvibe: ${dna.getAgentDNA('gptvibe')?.mutation_count || 0} mutations`);
}

simulate().catch(console.error);
