import { fixtureServer } from '../tests/server.mjs';
const { url, server } = await fixtureServer({ preview: true });
console.log(`Local QA preview: ${url}/qa`);
process.stdin.on('data', () => server.close(() => process.exit(0)));
