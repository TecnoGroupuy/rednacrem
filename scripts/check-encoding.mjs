import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = path.resolve('src');
const allowedExtensions = new Set(['.js', '.jsx']);
const patterns = ['ÃƒÂ', 'â‚¬', 'Ã'];
const matches = [];

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!allowedExtensions.has(path.extname(entry.name))) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (patterns.some((pattern) => line.includes(pattern))) {
        matches.push({
          file: path.relative(process.cwd(), fullPath).replaceAll('\\', '/'),
          line: index + 1,
          text: line.trim()
        });
      }
    });
  }
}

walk(rootDir);

if (matches.length) {
  console.error('Encoding check failed. Found possible mojibake in src:');
  matches.forEach((match) => {
    console.error(`${match.file}:${match.line}:${match.text}`);
  });
  process.exit(1);
}

console.log('Encoding check passed. No matches for ÃƒÂ, â‚¬, or Ã in src.');
