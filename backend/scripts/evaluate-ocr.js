#!/usr/bin/env node

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

function parseArgs(argv) {
  const args = {
    root: '',
    labels: '',
    labelsJson: '',
    apiBase: 'http://127.0.0.1:3001/api',
    tolerance: 0.2,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!value) {
      break;
    }

    if (key === '--root') {
      args.root = value;
      i += 1;
    } else if (key === '--labels') {
      args.labels = value;
      i += 1;
    } else if (key === '--labels-json') {
      args.labelsJson = value;
      i += 1;
    } else if (key === '--api-base') {
      args.apiBase = value.replace(/\/+$/, '');
      i += 1;
    } else if (key === '--tolerance') {
      args.tolerance = Number(value);
      i += 1;
    }
  }

  if (!args.root || (!args.labels && !args.labelsJson)) {
    throw new Error(
      'Usage: node scripts/evaluate-ocr.js --root <challenge_dir> (--labels <labels.csv> | --labels-json <labels.json>) [--api-base http://127.0.0.1:3001/api] [--tolerance 0.2]',
    );
  }

  return args;
}

function parseCsv(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return [];
  }

  const header = lines[0].split(',').map((cell) => cell.trim());
  const records = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',');
    if (cols.length !== header.length) {
      continue;
    }

    const row = {};
    for (let j = 0; j < header.length; j += 1) {
      row[header[j]] = cols[j].trim();
    }
    records.push(row);
  }

  return records;
}

function parseLabelsJson(jsonText) {
  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed)) {
    throw new Error('labels JSON must be an array');
  }

  return parsed.map((row) => ({
    participant_name: row.participant_name,
    phase: row.phase,
    weight: row.weight,
    skeletal_muscle_mass: row.skeletal_muscle_mass,
    body_fat_mass: row.body_fat_mass,
  }));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeName(name) {
  return (name || '').trim().replace(/\s+/g, '');
}

async function uploadImage(apiBase, filePath) {
  const fileBuffer = await fsp.readFile(filePath);
  const form = new FormData();
  form.append('image', new Blob([fileBuffer]), path.basename(filePath));

  const res = await fetch(`${apiBase}/uploads/image`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    throw new Error(`upload failed: ${res.status}`);
  }

  return res.json();
}

async function ocrExtract(apiBase, imageUrl) {
  const res = await fetch(`${apiBase}/inbody-records/ocr-extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ocr-extract failed: ${res.status} ${text}`);
  }

  return res.json();
}

function diff(a, b) {
  if (a === null || b === null) {
    return null;
  }
  return Math.abs(a - b);
}

async function main() {
  const args = parseArgs(process.argv);
  const labelsText = await fsp.readFile(args.labelsJson || args.labels, 'utf8');
  const labelRows = args.labelsJson ? parseLabelsJson(labelsText) : parseCsv(labelsText);

  const labelsByKey = new Map();
  for (const row of labelRows) {
    const key = `${normalizeName(row.participant_name)}::${(row.phase || '').toLowerCase()}`;
    labelsByKey.set(key, {
      participantName: row.participant_name,
      phase: (row.phase || '').toLowerCase(),
      weight: toNumber(row.weight),
      skeletalMuscleMass: toNumber(row.skeletal_muscle_mass),
      bodyFatMass: toNumber(row.body_fat_mass),
    });
  }

  const personDirs = (await fsp.readdir(args.root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'ko'));

  const results = [];

  for (const personName of personDirs) {
    const dirPath = path.join(args.root, personName);
    const files = await fsp.readdir(dirPath);

    const beforeFile = files.find((f) => /before/i.test(f));
    const afterFile = files.find((f) => /after/i.test(f));

    const targets = [
      { phase: 'before', filename: beforeFile },
      { phase: 'after', filename: afterFile },
    ];

    for (const target of targets) {
      if (!target.filename) {
        continue;
      }

      const key = `${normalizeName(personName)}::${target.phase}`;
      const label = labelsByKey.get(key);
      if (!label) {
        continue;
      }

      const imagePath = path.join(dirPath, target.filename);

      try {
        const uploaded = await uploadImage(args.apiBase, imagePath);
        const predicted = await ocrExtract(args.apiBase, uploaded.url);

        const item = {
          participantName: personName,
          phase: target.phase,
          labelWeight: label.weight,
          predWeight: toNumber(predicted.weight),
          labelSmm: label.skeletalMuscleMass,
          predSmm: toNumber(predicted.skeletal_muscle_mass),
          labelFatMass: label.bodyFatMass,
          predFatMass: toNumber(predicted.body_fat_mass),
        };
        results.push(item);
      } catch (error) {
        results.push({
          participantName: personName,
          phase: target.phase,
          error: String(error.message || error),
        });
      }
    }
  }

  let count = 0;
  let exactWeight = 0;
  let exactSmm = 0;
  let exactFat = 0;

  for (const row of results) {
    if (row.error) {
      continue;
    }

    count += 1;
    if ((diff(row.labelWeight, row.predWeight) ?? 999) <= args.tolerance) {
      exactWeight += 1;
    }
    if ((diff(row.labelSmm, row.predSmm) ?? 999) <= args.tolerance) {
      exactSmm += 1;
    }
    if ((diff(row.labelFatMass, row.predFatMass) ?? 999) <= args.tolerance) {
      exactFat += 1;
    }
  }

  const report = {
    tested: count,
    tolerance: args.tolerance,
    accuracy: {
      weight: count > 0 ? Number((exactWeight / count).toFixed(4)) : 0,
      skeletalMuscleMass: count > 0 ? Number((exactSmm / count).toFixed(4)) : 0,
      bodyFatMass: count > 0 ? Number((exactFat / count).toFixed(4)) : 0,
    },
    failures: results.filter((row) => row.error),
  };

  const outDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const detailPath = path.join(outDir, `ocr-eval-detail-${timestamp}.json`);
  const summaryPath = path.join(outDir, `ocr-eval-summary-${timestamp}.json`);

  fs.writeFileSync(detailPath, JSON.stringify(results, null, 2));
  fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`detail: ${detailPath}`);
  console.log(`summary: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
