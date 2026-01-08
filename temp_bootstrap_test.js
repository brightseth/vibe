// Test bootstrap system
const bootstrap = require('./mcp-server/tools/discovery-bootstrap.js');

async function test() {
  console.log('Testing bootstrap...');
  const result = await bootstrap.handler({ command: 'create' });
  console.log(result.display);
}

test();