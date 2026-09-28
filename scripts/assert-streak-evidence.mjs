/**
 * D-16 guard: a record's carried streak start is judged on THAT RECORD'S OWN evidence.
 *
 * ## Why this file exists
 *
 * One rule — "a streak may not exceed the evidence for it" — has escaped five times in this
 * phase, at five different sites: the write path saturating at the window bound, the read
 * path recomputing from the trimmed window, the sanitizer keeping a claim whole while
 * dropping the history that backed it, an unbounded `totalDaysPlayed`, and finally the
 * two-device merge. Each escape was patched with a correct new condition, and each patch was
 * a new branch of the same rule, which is why there was always a next site.
 *
 * The fifth fix was structural instead: `carriedStartIsCredible` takes the claimant as ONE
 * `DailyRecord` and reads its window, its counter and its claim off that object alone, so a
 * call site has nothing left to cross. MEASURED before it: a legitimate 450-day copy merged
 * with a 2-date copy carrying `totalDaysPlayed: 3000` read `Streak · 2709` — 450 alone, 2
 * alone, 2709 merged — and the next close would have written that into the one-way
 * `longestStreak`, which no later release can repair.
 *
 * A shape is only a convention until something fails when it is broken. This is that
 * something. It fails the build if a future edit gives the predicate a second evidence
 * source, or hands one record's window beside another record's scalars.
 *
 * Exit 1 on any violation. `npm test` runs it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TELEMETRY = 'src/services/storage/telemetry.ts';
const PARSE_BLOB = 'src/services/storage/parseBlob.ts';

/** The three things a record says about its own streak. Crossing any of them is the defect. */
const EVIDENCE_FIELDS = ['history', 'totalDaysPlayed', 'currentStreakStart'];

function read(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function fail(msg) {
  console.error(`assert-streak-evidence: ${msg}`);
  process.exit(1);
}

/**
 * The source of `function <name>(...) { ... }`, brace-balanced, signature included.
 * String and comment bodies are not parsed — this file's regions contain neither braces in
 * strings nor block comments, and the check below verifies each region was actually found.
 */
function functionRegion(src, name, rel) {
  const at = src.indexOf(`function ${name}(`);
  if (at < 0) {
    fail(`could not find \`function ${name}(\` in ${rel} — the guard has drifted off its target`);
  }
  // A brace group after the parameter list may be an inline RETURN TYPE rather than the
  // body (`runStartInWindow` returns an object literal type). The body is the last such
  // group: keep matching until the next non-space character is not another `{`.
  let cursor = src.indexOf('{', src.indexOf(')', at));
  for (;;) {
    if (cursor < 0) fail(`could not find a body for \`${name}\` in ${rel}`);
    let depth = 0;
    let end = -1;
    for (let i = cursor; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}' && --depth === 0) {
        end = i;
        break;
      }
    }
    if (end < 0) fail(`unbalanced braces walking \`${name}\` in ${rel}`);
    const rest = src.slice(end + 1);
    const next = rest.match(/^\s*\{/);
    if (!next) return src.slice(at, end + 1);
    cursor = end + next[0].length - 1;
  }
}

/**
 * Every mention of an evidence field in a region that is NOT reached as `<owner>.<field>`.
 *
 * Deliberately an allowlist rather than a receiver blocklist. Two earlier drafts of this
 * guard matched the token left of the dot and were walked straight past — first by
 * `(derivedStart as unknown as DailyRecord).totalDaysPlayed` and then by
 * `[a, b][0]!.totalDaysPlayed`, both of which read a second record's evidence. There is no
 * finite list of the shapes an expression can end in, so the question asked here is the
 * other way round: the ONLY admissible way to touch this record's window, counter or claim
 * is the literal text `<owner>.`, and every other occurrence — however it is spelled — is a
 * finding. A legitimate edit that trips this should be rewritten to read off `<owner>`; an
 * edit that cannot be is the defect.
 */
function foreignEvidence(region, owner) {
  const out = [];
  const re = new RegExp(`\\b(${EVIDENCE_FIELDS.join('|')})\\b`, 'g');
  const allowed = new RegExp(`(^|[^\\w$])${owner}\\.$`);
  let m;
  while ((m = re.exec(region)) !== null) {
    if (allowed.test(region.slice(0, m.index))) continue;
    out.push({
      field: m[1],
      at: region.slice(Math.max(0, m.index - 48), m.index + m[1].length).trim(),
    });
  }
  return out;
}

/** Every call to `name` in a region, as its top-level (depth-0) argument strings. */
function callsTo(region, name) {
  const out = [];
  const re = new RegExp(`\\b${name}\\(`, 'g');
  let m;
  while ((m = re.exec(region)) !== null) {
    // A declaration is not a call. Without this the whole-file scans below read
    // `function resolveStreakStart(record: DailyRecord)` as a call site passing a type.
    if (/\bfunction\s+$/.test(region.slice(0, m.index))) continue;
    let depth = 0;
    const args = [''];
    for (let i = m.index + m[0].length - 1; i < region.length; i++) {
      const c = region[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') {
        if (--depth === 0) break;
      }
      if (depth === 1 && c === ',') args.push('');
      else if (depth >= 1 && !(depth === 1 && c === '(' && args.length === 1 && args[0] === ''))
        args[args.length - 1] += c;
    }
    out.push(args.map((a) => a.trim()).filter((a, i) => a !== '' || i > 0));
  }
  return out;
}

/** Every `function <name>(` declared at the top level of a module. */
function topLevelFunctions(src) {
  return [...src.matchAll(/^(?:export )?function ([A-Za-z_$][\w$]*)\(/gm)].map((m) => m[1]);
}

const telemetry = read(TELEMETRY);

// ---------------------------------------------------------------- 1. the predicate's shape
const predicate = functionRegion(telemetry, 'carriedStartIsCredible', TELEMETRY);
const signature = predicate.slice(0, predicate.indexOf('{'));
const params = signature
  .slice(signature.indexOf('(') + 1, signature.lastIndexOf(')'))
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

if (params.length !== 2) {
  fail(
    `carriedStartIsCredible takes ${params.length} parameters, expected 2 ` +
      `(claimant: DailyRecord, derivedStart: DerivedStart). A third parameter is a second ` +
      `evidence source, which is exactly how this rule escaped five times — read it off the ` +
      `claimant instead. Signature: ${signature.trim()}`,
  );
}
if (!/^claimant\s*:\s*DailyRecord$/.test(params[0])) {
  fail(
    `carriedStartIsCredible's first parameter must be \`claimant: DailyRecord\` — the whole ` +
      `record, so its window, counter and claim cannot be supplied from different records. ` +
      `Found: ${params[0]}`,
  );
}
if (!/^derivedStart\s*:\s*DerivedStart$/.test(params[1])) {
  fail(
    `carriedStartIsCredible's second parameter must be \`derivedStart: DerivedStart\` — the ` +
      `branded type keeps a carried CLAIM from being passed in as its own floor. ` +
      `Found: ${params[1]}`,
  );
}

// ------------------------------------------------ 2. the predicate reads one object only
for (const { field, at } of foreignEvidence(predicate.slice(predicate.indexOf('{')), 'claimant')) {
  fail(
    `carriedStartIsCredible touches \`${field}\` somewhere other than \`claimant.${field}\` ` +
      `— evidence must come off the claimant and nothing else, because a second source is a ` +
      `second record's evidence waiting to be crossed with this one's. At: ...${at}`,
  );
}
for (const args of callsTo(predicate.slice(predicate.indexOf('{')), 'dateKeysOf')) {
  if (args.length !== 1 || args[0] !== 'claimant') {
    fail(
      `carriedStartIsCredible calls dateKeysOf(${args.join(', ')}) — it may only ever ask ` +
        `for the claimant's own keys`,
    );
  }
}

// --------------------------------------------------------- 3. EVERY consumer, generically
//
// Named regions were tried first and were not enough: a guard that watched only
// `reconcileStreakStart` waved through the identical cross-wiring planted one function up in
// `resolveStreakStart`, because nothing said the OTHER consumer had to obey the same rule.
// So the consumers are discovered rather than listed. Any function that asks the predicate
// must hand it a bare identifier, and inside that function the record's window, counter and
// claim may be reached only through that same identifier. A consumer added next year is
// covered the day it is written.
const consumers = [];
for (const name of topLevelFunctions(telemetry)) {
  if (name === 'carriedStartIsCredible') continue;
  const region = functionRegion(telemetry, name, TELEMETRY);
  const body = region.slice(region.indexOf('{'));
  const calls = callsTo(body, 'carriedStartIsCredible');
  if (calls.length === 0) continue;
  consumers.push(name);

  const owners = new Set();
  for (const args of calls) {
    if (args.length !== 2) {
      fail(
        `${name} calls carriedStartIsCredible with ${args.length} arguments, expected 2 ` +
          `(the claimant record, and the derived floor): (${args.join(', ')})`,
      );
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(args[0])) {
      fail(
        `${name} passes \`${args[0]}\` as the claimant. It must be a bare record variable: ` +
          `an expression assembled at the call site is where one copy's window gets paired ` +
          `with another copy's counter, which is the 2709-streak defect.`,
      );
    }
    if (!/^[A-Za-z_$][\w$]*$/.test(args[1])) {
      fail(
        `${name} passes \`${args[1]}\` as the derived floor. It must be a bare variable: a ` +
          `floor computed inline at the call site is how one copy's dates end up deciding ` +
          `whether the OTHER copy's claim beats what is already derivable.`,
      );
    }
    owners.add(args[0]);
  }
  // One floor per consumer, derived from the keys the consumer was given. Without this,
  // `const aStart = runStartInWindow(dateKeysOf(a)).start` re-opens the same hole one line
  // earlier, having satisfied the bare-variable rule above.
  const floors = callsTo(body, 'runStartInWindow');
  if (floors.length !== 1) {
    fail(
      `${name} derives ${floors.length} run starts. A consumer of carriedStartIsCredible ` +
        'must have exactly one floor in scope, or the question "does this claim beat what ' +
        'stored dates already prove" has more than one answer to choose from.',
    );
  }
  for (const args of callsTo(body, 'dateKeysOf')) {
    if (args.length !== 1 || args[0] !== owners.values().next().value) {
      fail(
        `${name} calls dateKeysOf(${args.join(', ')}) — a consumer may only ever ask for the ` +
          'keys of the record it is judging. Another record\'s window is not evidence here.',
      );
    }
  }
  if (owners.size !== 1) {
    fail(`${name} judges more than one claimant variable (${[...owners].join(', ')})`);
  }
  const owner = [...owners][0];
  for (const { field, at } of foreignEvidence(body, owner)) {
    fail(
      `${name} touches \`${field}\` somewhere other than \`${owner}.${field}\` — a record's ` +
        `window, counter and claim may only be reached through the single record being ` +
        `judged. Pairing one copy's evidence with another's claim is the 2709-streak ` +
        `defect this guard exists for. At: ...${at}`,
    );
  }
}
if (consumers.length === 0) {
  fail(
    `nothing in ${TELEMETRY} calls carriedStartIsCredible — the rule has been inlined ` +
      'somewhere, which is how it escaped the first four times',
  );
}

// ---------------------------------------- 4. no call site outside telemetry.ts asks at all
if (/\bcarriedStartIsCredible\s*\(/.test(read(PARSE_BLOB))) {
  fail(`${PARSE_BLOB} calls carriedStartIsCredible — the parse boundary is the wrong place`);
}

// ------------------- 5. the two-copy merge goes THROUGH the rule, not around it
//
// `mergeDailyRecords` is the one function that legitimately holds two records at once, so
// the checks above cannot ban it from reading both copies' fields — that is its job. What it
// must never do is lift a claim straight off a copy: the only ways it may obtain a
// `currentStreakStart` are `reconcileStreakStart` (question 1: is the claim credible about
// the copy that made it) and `resolveStreakStart` (question 2: can the merged record account
// for the survivor). Reading `a.currentStreakStart` here would skip question 1 entirely,
// which is the shape the rule escaped through the first time.
const mergeRecords = functionRegion(telemetry, 'mergeDailyRecords', TELEMETRY);
const mergeBody = mergeRecords.slice(mergeRecords.indexOf('{'));
// An object-literal KEY `currentStreakStart:` is how the merged record is assembled and is
// fine; a property READ `<something>.currentStreakStart` is a claim being lifted off a copy.
const liftedClaim = mergeBody.match(/\.\s*currentStreakStart\b|\[\s*['"`]currentStreakStart['"`]\s*\]/);
if (liftedClaim) {
  fail(
    `mergeDailyRecords reads \`${liftedClaim[0].trim()}\` — a claim may only enter the merged ` +
      'record through reconcileStreakStart (is it credible about the copy that made it) and ' +
      'then resolveStreakStart (can the merged record account for the survivor). Lifting one ' +
      'straight off a copy skips the first question entirely.',
  );
}
for (const fn of ['reconcileStreakStart', 'resolveStreakStart']) {
  if (callsTo(mergeBody, fn).length !== 1) {
    fail(
      `mergeDailyRecords calls ${fn} ${callsTo(mergeBody, fn).length} times, expected once — ` +
        'the merged start must be settled by asking both questions exactly once, in order',
    );
  }
}
for (const args of callsTo(telemetry, 'resolveStreakStart')) {
  if (args.length !== 1 || !/^[A-Za-z_$][\w$]*$/.test(args[0])) {
    fail(
      `resolveStreakStart is called as (${args.join(', ')}). Its claimant must be a bare ` +
        'record variable, so that the record being judged is one a reader can name and ' +
        'follow rather than an object assembled inside the call.',
    );
  }
}

// ------------------------------------------- 5. only runStartInWindow can mint the floor
const runStart = functionRegion(telemetry, 'runStartInWindow', TELEMETRY);
const brandTotal = (telemetry.match(/as DerivedStart\b/g) ?? []).length;
const brandInRunStart = (runStart.match(/as DerivedStart\b/g) ?? []).length;
if (brandInRunStart === 0) {
  fail('runStartInWindow no longer mints a DerivedStart — the floor has lost its only producer');
}
if (brandTotal !== brandInRunStart) {
  fail(
    `\`as DerivedStart\` appears ${brandTotal} times in ${TELEMETRY} but only ` +
      `${brandInRunStart} inside runStartInWindow. The floor must be derivable from stored ` +
      `dates alone; minting one elsewhere lets a carried claim vouch for itself.`,
  );
}

// -------------------------------------------------- 6. one rule, one place (parseBlob.ts)
const parseBlob = read(PARSE_BLOB);
const sanitize = functionRegion(parseBlob, 'sanitizeStreakStart', PARSE_BLOB);
for (const field of ['totalDaysPlayed', 'currentStreakStart']) {
  if (new RegExp(`\\b${field}\\b`).test(sanitize)) {
    fail(
      `sanitizeStreakStart mentions \`${field}\` — the parse boundary must not restate the ` +
        `admissibility rule. A record assembled in memory never re-enters the parser, so a ` +
        `rule stated here would not govern the write that makes \`longestStreak\` permanent. ` +
        `One rule, one place: carriedStartIsCredible.`,
    );
  }
}
if (/DAILY_HISTORY_BOUND|DAILY_STREAK_WALK_CAP/.test(sanitize)) {
  fail(
    'sanitizeStreakStart mentions a streak bound — a record assembled in memory never ' +
      're-enters the parser, so a rule stated here would not govern the write that makes ' +
      '`longestStreak` permanent. Keep it in carriedStartIsCredible.',
  );
}

console.log(
  `assert-streak-evidence: OK (${consumers.length} consumer(s) — ${consumers.join(', ')} — ` +
    'each judge one record on its own window, counter and claim; the floor is derived-only; ' +
    'parseBlob does not restate the rule)',
);
process.exit(0);
