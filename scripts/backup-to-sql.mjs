// scripts/backup-to-sql.mjs
// Reads an exportBackup()-produced JSON file and prints SQL statements
// that seed division_data + counters from it. Run once, by hand, with
// its output fed into mcp__Supabase__execute_sql — this script never
// touches the network or holds a database credential itself.
//
// One statement per system / per quotation (appended with the jsonb ||
// operator onto the existing array), rather than one combined statement
// per division: a single division's combined systems+quotations blob
// can run past what a human-in-the-loop executor can read back in full
// over a chat-based tool call and safely retype verbatim, which risks
// silently corrupting real client data (a dropped character inside a
// quotation's remark text, say). Division rows are expected to already
// exist with systems/quotations initialized to '[]' (not null) — ||
// against a null jsonb column yields null, silently discarding data.
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/backup-to-sql.mjs <backup-file.json>');
  process.exit(1);
}

const backup = JSON.parse(readFileSync(path, 'utf8'));

function sqlLiteral(value) {
  // Postgres dollar-quoting sidesteps having to escape every embedded
  // quote/backslash in arbitrary quotation text — safe as long as the
  // JSON text itself never contains the literal token "$sql$", which
  // application-authored quotation content will not.
  return `$sql$${JSON.stringify(value)}$sql$::jsonb`;
}

const MAX_SAFE_STATEMENT_LEN = 8000; // conservative; flag anything that would be awkward to hand-verify

const statements = [];
for (const divKey of ['sf', 'wp']) {
  const div = backup[divKey];
  if (!div) continue;
  for (const system of div.systems || []) {
    statements.push(
      `update division_data set systems = systems || ${sqlLiteral([system])}, updated_at = now() where division_key = '${divKey}';`
    );
  }
  for (const quotation of div.quotations || []) {
    statements.push(
      `update division_data set quotations = quotations || ${sqlLiteral([quotation])}, updated_at = now() where division_key = '${divKey}';`
    );
  }
  if (div.settings && Object.keys(div.settings).length > 0) {
    statements.push(
      `update division_data set settings = ${sqlLiteral(div.settings)}, updated_at = now() where division_key = '${divKey}';`
    );
  }
  const counterPairs = [
    ['quotation', div.counterYear, div.counterNext],
    ['proforma', div.piCounterYear, div.piCounterNext],
  ];
  for (const [docType, year, next] of counterPairs) {
    if (!year || !next) continue;
    // next_number here should be the NEXT number still to be issued —
    // exactly what counterNext/piCounterNext already mean in the
    // exported data, so no +/-1 adjustment is needed.
    statements.push(
      `insert into counters (division_key, doc_type, year, next_number) values ('${divKey}', '${docType}', ${year}, ${next}) on conflict (division_key, doc_type, year) do update set next_number = excluded.next_number;`
    );
  }
}

for (const [i, s] of statements.entries()) {
  if (s.length > MAX_SAFE_STATEMENT_LEN) {
    console.error(`WARNING: statement ${i + 1} is ${s.length} chars — may be unsafe to hand-verify in one piece.`);
  }
}

console.log(statements.join('\n'));
