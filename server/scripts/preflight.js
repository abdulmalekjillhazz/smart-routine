// Run before every launch and after every configuration change.
//   npm run preflight -w server
import 'dotenv/config';
import { loadEnv } from '../src/config/env.js';
import { preflightIssues } from '../src/services/preflight.js';

let config;
try {
  config = loadEnv();
} catch (err) {
  console.error(`FAIL  ${err.message}`);
  process.exit(1);
}

const issues = preflightIssues(config);
for (const i of issues) console.log(`${i.level === 'error' ? 'FAIL ' : 'WARN '} ${i.message}`);
const errors = issues.filter((i) => i.level === 'error').length;
console.log(errors ? `\n${errors} blocking problem(s). Do not launch.` : `\nNo blocking problems. ${issues.length} warning(s).`);
process.exit(errors ? 1 : 0);
