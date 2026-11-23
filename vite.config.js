import fs from 'node:fs';
import { defineConfig } from 'vite';
import { encodeLink } from './src/obfuscate.js';

// virtual:links-enc = data/links.json with every deposit link encoded (src/obfuscate.js); no plaintext link or promo code
// reaches the bundle. The plain data/links.json stays the source of truth.
const linksEnc = () => ({
  name: 'links-enc',
  resolveId: (id) => (id === 'virtual:links-enc' ? '\0links-enc' : null),
  load(id) {
    if (id !== '\0links-enc') return null;
    const file = new URL('./data/links.json', import.meta.url);
    this.addWatchFile(file.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    const rows = JSON.parse(fs.readFileSync(file, 'utf8')).map((l) => ({ day: l.day, d: encodeLink(l.day, l.deposit) }));
    return `export default ${JSON.stringify(rows)};`;
  },
});

// base './' keeps asset URLs relative, so the page works on a GitHub Pages subpath.
export default defineConfig({
  base: './',
  plugins: [linksEnc()],
});
