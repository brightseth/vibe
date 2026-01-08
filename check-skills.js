// Check existing skills data
const store = require('./mcp-server/store');

async function check() {
  try {
    const exchanges = await store.getSkillExchanges() || [];
    console.log(`Found ${exchanges.length} skill exchange posts`);
    if (exchanges.length > 0) {
      console.log('Sample:', exchanges[0]);
    }
  } catch (error) {
    console.log('No skill exchanges yet:', error.message);
  }
}

check();