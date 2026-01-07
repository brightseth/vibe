#!/usr/bin/env node

/**
 * /vibe Webhook Server Runner
 * 
 * Standalone webhook server for receiving real-time updates from external platforms.
 * Run this on a public server to bridge external platforms into /vibe.
 * 
 * Usage:
 *   node webhook-runner.js [--port 3001]
 *   
 * Environment Variables:
 *   WEBHOOK_PORT=3001
 *   WEBHOOK_SECRET=your-webhook-secret
 *   TELEGRAM_WEBHOOK_SECRET=telegram-secret-token
 *   DISCORD_PUBLIC_KEY=discord-public-key
 */

const express = require('express');
const cors = require('cors');
const { createWebhookHandler, getConfig, getSetupInstructions } = require('./bridges/webhook-server');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json', limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'vibe-webhook-server',
    timestamp: new Date().toISOString()
  });
});

// Setup info endpoint
app.get('/setup', (req, res) => {
  const instructions = getSetupInstructions();
  res.json({
    service: '/vibe Webhook Server',
    instructions,
    endpoints: {
      telegram: '/webhook/telegram',
      discord: '/webhook/discord',
      health: '/health'
    }
  });
});

// Webhook endpoints
app.use('/webhook', createWebhookHandler());

// Error handler
app.use((err, req, res, next) => {
  console.error('Webhook server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
function startServer() {
  const config = getConfig();
  const port = config.port;
  
  const server = app.listen(port, () => {
    console.log(`🌉 /vibe webhook server running on port ${port}`);
    console.log();
    console.log('📡 Endpoints:');
    console.log(`   Health:   http://localhost:${port}/health`);
    console.log(`   Setup:    http://localhost:${port}/setup`);
    console.log(`   Telegram: http://localhost:${port}/webhook/telegram`);
    console.log(`   Discord:  http://localhost:${port}/webhook/discord`);
    console.log();
    console.log('🔧 Configuration:');
    console.log(`   Port: ${port}`);
    console.log(`   Webhook Secret: ${config.secret ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Telegram Secret: ${config.telegramSecret ? '✅ Set' : '❌ Not set'}`);
    console.log(`   Discord Public Key: ${config.discordPublicKey ? '✅ Set' : '❌ Not set'}`);
    console.log();
    console.log('Visit /setup endpoint for platform-specific setup instructions.');
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down webhook server...');
    server.close(() => {
      console.log('✅ Webhook server stopped');
      process.exit(0);
    });
  });
  
  return server;
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
/vibe Webhook Server

Usage:
  node webhook-runner.js [options]

Options:
  --port PORT    Webhook server port (default: 3001)
  --help, -h     Show this help

Environment Variables:
  WEBHOOK_PORT              Webhook server port
  WEBHOOK_SECRET           Secret for webhook signature verification
  TELEGRAM_WEBHOOK_SECRET  Telegram webhook secret token
  DISCORD_PUBLIC_KEY       Discord application public key

Examples:
  node webhook-runner.js
  node webhook-runner.js --port 8080
  WEBHOOK_PORT=3001 node webhook-runner.js
`);
    process.exit(0);
  }
  
  startServer();
}

module.exports = { app, startServer };