// scripts/backup-to-sql.mjs
// Reads an exportBackup()-produced JSON file and prints SQL statements
// that seed division_data + counters from it. Run once, by hand, with
// its output fed into mcp__Supabase__execute_sql — this script never
// touches the network or holds a database credential itself.
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

const statements = [];
for (const divKey of ['sf', 'wp']) {
  const div = backup[divKey];
  if (!div) continue;
  statements.push(
    `update division_data set systems = ${sqlLiteral(div.systems || [])}, quotations = ${sqlLiteral(div.quotations || [])}, settings = ${sqlLiteral(div.settings || {})}, updated_at = now() where division_key = '${divKey}';`
  );
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

console.log(statements.join('\n'));
