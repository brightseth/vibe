// Temporary script to bootstrap skills exchange
const { handler } = require('./mcp-server/tools/bootstrap-skills.js');

async function run() {
  const result = await handler({});
  console.log(result.display || result.error || 'Done');
}

run().catch(console.error);