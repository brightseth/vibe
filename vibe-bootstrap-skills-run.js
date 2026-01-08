// Quick bootstrap execution
const { handler } = require('./mcp-server/tools/bootstrap-skills.js');

async function run() {
  const result = await handler({ force: false });
  console.log(result.display);
}

run().catch(console.error);