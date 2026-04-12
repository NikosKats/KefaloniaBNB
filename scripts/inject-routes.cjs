// Post-build: inject custom domain routes into the generated wrangler config
const fs = require('fs');
const path = require('path');

const cfgPath = path.resolve('dist/server/wrangler.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));

cfg.routes = [
  { pattern: 'kefaloniabnb.com', custom_domain: true },
  { pattern: 'www.kefaloniabnb.com', custom_domain: true },
];
cfg.workers_dev = false;

fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
console.log('✓ Custom domain routes injected into dist/server/wrangler.json');
