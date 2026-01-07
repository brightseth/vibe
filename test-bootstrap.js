// Quick test of the bootstrap system
const bootstrap = require('./mcp-server/tools/discovery-bootstrap.js');

async function test() {
  console.log('Creating sample profiles...');
  const result = await bootstrap.handler({ command: 'create' });
  console.log(result.display);
}

test().catch(console.error);