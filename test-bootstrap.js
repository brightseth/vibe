// Test the discovery bootstrap
const bootstrap = require('./mcp-server/tools/discovery-bootstrap.js');

async function test() {
  try {
    const result = await bootstrap.handler({ count: 10, clear: false });
    console.log(result.display);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();