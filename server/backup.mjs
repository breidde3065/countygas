// Copies orders, products, settings and photos into a dated folder: npm run backup
// Download that folder somewhere off the server too; a backup on the same disk is not a safe copy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : here;
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const target = path.join(root, 'backups', stamp);

let copied = 0;
for (const name of ['data', 'uploads']) {
  const from = path.join(root, name);
  if (fs.existsSync(from)) { fs.cpSync(from, path.join(target, name), { recursive: true }); copied++; }
}
console.log(copied ? `Backup saved to ${target}` : `Nothing to back up yet in ${root}`);
