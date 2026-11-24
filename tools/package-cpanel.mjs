// Builds the upload package for cPanel: release/digiinn360-website.zip
//
//   npm run package
//
// The zip holds the Django backend, the already-built website (site/) and INSTALL.md.
// No Node.js is needed on the server. Secrets (.env), local databases, logs and the
// local virtualenv are never included.
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, writeSync } from 'node:fs';
import { crc32, deflateRawSync } from 'node:zlib';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const backend = join(root, 'backend');
const name = 'digiinn360-website';
const releaseDir = join(root, 'release');
const out = join(releaseDir, name);
const zip = join(releaseDir, `${name}.zip`);

const EXCLUDE_DIRS = new Set(['.venv', 'venv', '__pycache__', 'logs', 'var', 'staticfiles', 'site', 'tmp', '.pytest_cache']);
const EXCLUDE_FILES = [/^\.env(\..+)?$/, /^db\.sqlite3/, /\.sqlite3/, /\.sql(\.gz)?$/, /\.bak$/, /\.pyc$/, /\.log$/, /^FIRST-ADMIN-PASSWORD/];

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first (or use `npm run package`).');
  process.exit(1);
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

cpSync(backend, out, {
  recursive: true,
  filter: (src) => {
    const rel = relative(backend, src);
    if (!rel) return true;
    const parts = rel.split(sep);
    if (parts.some((p) => EXCLUDE_DIRS.has(p))) return false;
    const base = parts[parts.length - 1];
    if (base === '.env.example') return true;
    return !(statSync(src).isFile() && EXCLUDE_FILES.some((re) => re.test(base)));
  },
});
cpSync(dist, join(out, 'site'), { recursive: true });

// The server is Linux: give the backend's text files Unix line endings.
const TEXT = /\.(py|md|txt|html|example|gitignore)$|^\.env\.example$/;
const normalise = (dir) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) { if (entry !== 'site') normalise(p); }
    else if (TEXT.test(entry)) {
      const text = readFileSync(p, 'utf8');
      if (text.includes('\r\n')) writeFileSync(p, text.replace(/\r\n/g, '\n'));
    }
  }
};
normalise(out);

// Refuse to ship anything that looks like a secret.
const leaked = [];
const scan = (dir) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) scan(p);
    else if ((/^\.env/.test(entry) && entry !== '.env.example') || /\.(sqlite3|sql|bak)$/.test(entry) || entry.startsWith('FIRST-ADMIN')) leaked.push(relative(out, p));
  }
};
scan(out);
if (leaked.length) {
  console.error('Refusing to package, sensitive files found:', leaked);
  process.exit(1);
}

// Minimal zip writer. Archive paths always use '/', so the zip extracts correctly on the
// Linux server (Windows `tar`/Compress-Archive can write '\' separators, which cPanel would
// unpack as single files with backslashes in their names).
function writeZip(zipPath, baseDir, topName) {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir).sort()) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(join(baseDir, topName));
  const fd = openSync(zipPath, 'w');
  let offset = 0;
  const central = [];
  const put = (buf) => { writeSync(fd, buf); offset += buf.length; };
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const file of files) {
    const name = Buffer.from(relative(baseDir, file).split(sep).join('/'), 'utf8');
    const data = readFileSync(file);
    const crc = crc32(data);
    let body = deflateRawSync(data, { level: 9 });
    let method = 8;
    if (body.length >= data.length) { body = data; method = 0; }
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8); local.writeUInt16LE(dosTime, 10); local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    const headerOffset = offset;
    put(local); put(name); put(body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE((3 << 8) | 20, 4); cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8); cen.writeUInt16LE(method, 10); cen.writeUInt16LE(dosTime, 12);
    cen.writeUInt16LE(dosDate, 14); cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(data.length, 24); cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(((0o100644 << 16) >>> 0), 38); cen.writeUInt32LE(headerOffset, 42);
    central.push(Buffer.concat([cen, name]));
  }
  const cdStart = offset;
  for (const c of central) put(c);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(offset - cdStart, 12); end.writeUInt32LE(cdStart, 16);
  put(end);
  closeSync(fd);
  return files.length;
}

const count = writeZip(zip, releaseDir, name);
console.log(`Package folder: ${relative(root, out)}`);
console.log(`Upload this file: ${relative(root, zip)} (${count} files)`);
