// Run from this folder with Node 23.6+ (it strips types): node csv.check.mjs
import assert from "node:assert/strict";

import { csvCell, csvRow } from "./csv.ts";

for (const lead of ["=", "+", "-", "@", "\t", "\r"]) {
  assert.ok(csvCell(`${lead}SUM(A1)`).replace(/^"/, "").startsWith("'"), `formula lead ${JSON.stringify(lead)}`);
}
assert.equal(csvCell("=1+1"), "'=1+1");
assert.equal(csvCell('=HYPERLINK("x","y")'), `"'=HYPERLINK(""x"",""y"")"`);
assert.equal(csvCell("plain"), "plain");
assert.equal(csvCell(12.5), "12.5");
assert.equal(csvCell("a,b"), '"a,b"');
assert.equal(csvCell('say "hi"'), '"say ""hi"""');
assert.equal(csvCell("line\nbreak"), '"line\nbreak"');
assert.equal(csvRow(["2025-01-01", 3, "=cmd"]), "2025-01-01,3,'=cmd");
console.log("csv ok");
