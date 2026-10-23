import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const now = Math.floor(Date.now() / 1000);

function loadDotEnv() {
  const out = {};
  for (const f of [".env", ".env.example"]) {
    try {
      const txt = fs.readFileSync(f, "utf8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && out[m[1]] === undefined) out[m[1]] = m[2].trim();
      }
      if (f === ".env") break;
    } catch {}
  }
  return out;
}

const env = loadDotEnv();
const TEACHER_USERNAME = process.env.TEACHER_USERNAME || env.TEACHER_USERNAME || "teacher";
const TEACHER_EMAIL = process.env.TEACHER_EMAIL || env.TEACHER_EMAIL || "teacher@mydream.uz";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || env.TEACHER_PASSWORD || "ChangeMe123!";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  const b = randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return `MDM-${s}`;
}

function hashPassword(password, saltB64) {
  const salt = Buffer.from(saltB64, "base64");
  const dk = pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return dk.toString("base64");
}

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const saltB64 = randomBytes(16).toString("base64");
const pwHash = hashPassword(TEACHER_PASSWORD, saltB64);
const teacherId = randomUUID();

const sections = [
  ["addition", "Qo'shish", "Qo'shish amallari", "plus", 1],
  ["subtraction", "Ayirish", "Ayirish amallari", "minus", 2],
  ["multiplication", "Ko'paytirish", "Ko'paytirish jadvali va undan yuqori", "x", 3],
  ["division", "Bo'lish", "Qoldiqsiz bo'lish", "divide", 4],
  ["mixed", "Aralash amallar", "Barcha amallar aralash", "shuffle", 5],
  ["speed", "Tez hisoblash", "Vaqtga qarshi tez misollar", "zap", 6],
  ["advanced", "Murakkab daraja", "Katta sonlar va kombinatsiyalar", "star", 7],
  ["custom", "Maxsus test", "O'qituvchi tomonidan tuzilgan", "cog", 8],
];

const levels = [
  ["BEGINNER", "Boshlang'ich", 1, 10, 1],
  ["EASY", "Oson", 1, 20, 2],
  ["MEDIUM", "O'rta", 1, 50, 3],
  ["HARD", "Qiyin", 1, 100, 4],
  ["EXPERT", "Ekspert", 10, 200, 5],
];

const groupNames = ["Boshlang'ich", "1-guruh", "Intermediate"];
const groupIds = groupNames.map(() => randomUUID());

const studentNames = [
  "Ali Valiyev",
  "Malika Yusupova",
  "Sardor Hakimov",
  "Dilorom Qodirova",
  "Jasur Toshpo'latov",
  "Kamola Rahimova",
  "Otabek Nazarov",
  "Nodira Azimova",
  "Bekzod Ergashev",
  "Sevara Olimova",
];
const studentLevels = ["BEGINNER", "BEGINNER", "EASY", "EASY", "MEDIUM", "MEDIUM", "EASY", "BEGINNER", "HARD", "MEDIUM"];

const usedCodes = new Set();
function uniqueCode() {
  let c = makeCode();
  while (usedCodes.has(c)) c = makeCode();
  usedCodes.add(c);
  return c;
}

let sql = "";
sql += `INSERT OR IGNORE INTO teachers (id, username, email, password_hash, password_salt, full_name, created_at, updated_at) VALUES ('${teacherId}', '${esc(TEACHER_USERNAME)}', '${esc(TEACHER_EMAIL)}', '${pwHash}', '${saltB64}', 'Bosh o''qituvchi', ${now}, ${now});\n`;
for (const [key, title, desc, icon, sort] of sections) {
  sql += `INSERT OR IGNORE INTO sections (id, key, title_uz, description_uz, icon, sort_order, is_active, created_at) VALUES ('${randomUUID()}', '${key}', '${esc(title)}', '${esc(desc)}', '${icon}', ${sort}, 1, ${now});\n`;
}
for (const [key, title, mn, mx, sort] of levels) {
  sql += `INSERT OR IGNORE INTO levels (id, key, title_uz, min_number, max_number, sort_order, is_active) VALUES ('${randomUUID()}', '${key}', '${esc(title)}', ${mn}, ${mx}, ${sort}, 1);\n`;
}
groupNames.forEach((g, i) => {
  sql += `INSERT OR IGNORE INTO groups (id, name, description, is_active, created_at, updated_at) VALUES ('${groupIds[i]}', '${esc(g)}', '', 1, ${now}, ${now});\n`;
});
const studentRows = [];
studentNames.forEach((nm, i) => {
  const gid = groupIds[i % groupIds.length];
  const code = uniqueCode();
  const sid = randomUUID();
  studentRows.push({ id: sid, name: nm, code });
  sql += `INSERT OR IGNORE INTO students (id, full_name, student_code, group_id, level, status, created_at, updated_at, last_active_at, total_active_seconds) VALUES ('${sid}', '${esc(nm)}', '${code}', '${gid}', '${studentLevels[i]}', 'active', ${now}, ${now}, NULL, 0);\n`;
});

// Sample tests (section ids resolved via subquery by key)
// Hamma testlar mental (chaqnash) rejimda: raqamlar ketma-ket chaqadi.
// [name, sectionKey, difficulty, examples, timeLimit, min, max, ops, numbersPerExample, intervalMs]
const tests = [
  ["Bugungi tez hisoblash", "speed", "EASY", 10, 300, 1, 50, '["+","-"]', 5, 1000],
  ["Qo'shish mashqi", "addition", "BEGINNER", 10, 300, 1, 20, '["+"]', 3, 1400],
  ["Ayirish mashqi", "subtraction", "EASY", 10, 300, 1, 30, '["+","-"]', 4, 1200],
  ["Aralash sinov", "mixed", "MEDIUM", 15, 600, 1, 50, '["+","-"]', 5, 1000],
  ["Ekspert chaqiruv", "advanced", "HARD", 20, 900, 10, 100, '["+","-"]', 7, 800],
  ["Chaqnash mashqi", "speed", "EASY", 5, 180, 1, 20, '["+","-"]', 5, 1200],
];
for (const [name, skey, diff, ex, tl, mn, mx, ops, fn, fms] of tests) {
  sql += `INSERT INTO tests (id, name, section_id, difficulty, question_count, time_limit_seconds, min_number, max_number, allowed_operations, allow_back, randomize, daily_enabled, is_active, mode, flash_numbers, flash_interval_ms, created_at, updated_at) SELECT '${randomUUID()}', '${esc(name)}', id, '${diff}', ${ex}, ${tl}, ${mn}, ${mx}, '${ops}', 0, 1, 1, 1, 'flash', ${fn}, ${fms}, ${now}, ${now} FROM sections WHERE key='${skey}' AND NOT EXISTS (SELECT 1 FROM tests WHERE name='${esc(name)}');\n`;
}

const outFile = path.join(process.cwd(), ".seed.tmp.sql");
fs.writeFileSync(outFile, sql, "utf8");

const target = remote ? "--remote" : "--local";
console.log(`Seed: teacher=${TEACHER_USERNAME} / ${TEACHER_EMAIL}`);
console.log("Student codes:");
for (const s of studentRows) console.log(`  ${s.name}  ->  ${s.code}`);
try {
  execSync(`npx wrangler d1 execute my-dream-mental-db ${target} --yes --file "${outFile}"`, { stdio: "inherit" });
  console.log("Seed applied OK (" + target + ").");
} finally {
  try { fs.unlinkSync(outFile); } catch {}
}
