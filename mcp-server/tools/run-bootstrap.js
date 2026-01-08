/**
 * Run bootstrap for Skills Exchange
 */

const { handler } = require('./bootstrap-skills');

async function runBootstrap() {
  try {
    const result = await handler({ force: false });
    console.log(result.display || result.error || JSON.stringify(result));
  } catch (error) {
    console.error('Bootstrap error:', error.message);
  }
}

runBootstrap();