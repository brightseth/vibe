// Bootstrap Skills Exchange - temporary runner
const bootstrap = require('./mcp-server/tools/bootstrap-skills.js');

async function run() {
  console.log('Bootstrapping Skills Exchange...');
  const result = await bootstrap.handler({});
  console.log(result.display);
}

run().catch(console.error);