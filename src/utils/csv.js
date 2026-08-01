// Shared by every "*.txt station list" fetcher (nodes.txt/csv, meteo.txt,
// earth.txt). Earth/meteo's files interleave junk throughout, not just as a
// leading block — blank lines, "#"-commented exclusions/archive notes, and
// "all :"/"cams :"/"lora :" summary lines can appear between real rows — so
// this filters every line, not just a prefix.
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    if (trimmed === '') return false;
    if (trimmed.startsWith('#')) return false;
    if (/^(all|cams|lora)\s*:/i.test(trimmed)) return false;
    return true;
  });
  if (lines.length === 0) return [];
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((col, i) => {
      row[col] = cells[i];
    });
    return row;
  });
}
