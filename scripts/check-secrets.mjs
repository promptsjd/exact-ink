import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (...args) => execFileSync('git', ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, '-C', root, ...args], { encoding: 'utf8' });
const actualRoot = git('rev-parse', '--show-toplevel').trim();
if (path.resolve(actualRoot).toLowerCase() !== root.toLowerCase()) {
  throw new Error('Initialize Git inside this project before running the publication scan.');
}
const paths = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean);
const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['AWS access key', /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ['credential URL', /[a-z]+:\/\/[^\s:@/]+:[^\s@/]+@/],
  ['service-account credentials', /"type"\s*:\s*"service_account"/],
];
let failures = 0;
for (const file of new Set(paths)) {
  if (/(?:^|\/)\.env(?:\.|$)/.test(file) && file !== '.env.example' ||
      /(?:service.account.*\.json|credentials.*\.json|\.(?:pem|key|p12|pfx|jks))$/i.test(file)) {
    console.error(`${file}: credential file must not be published`);
    failures++;
  }
  if (/\.(png|ico|jpe?g|gif|woff2?)$/i.test(file)) continue;
  const text = readFileSync(path.join(root, file), 'utf8');
  if (file === '.env.example' && text.split(/\r?\n/).some(line =>
      line.trim() && !line.trim().startsWith('#') && !/^[A-Z_][A-Z_0-9]*=\s*$/.test(line))) {
    console.error(`${file}: environment template values must remain empty`);
    failures++;
  }
  for (const [label, pattern] of patterns) {
    if (pattern.test(text)) { console.error(`${file}: possible ${label} (value redacted)`); failures++; }
  }
}
if (failures) process.exitCode = 1;
else console.log(`Publication scan passed for ${new Set(paths).size} files. Pattern scanning does not guarantee the absence of secrets.`);
