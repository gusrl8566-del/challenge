const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const sqlite3 = require('sqlite3');

const DB_PATH = path.resolve(__dirname, '..', 'inbody.sqlite');
const SOURCE_ROWS = `
이지은	필그렛챌린저1기	15	22.5	56.9	13	22.6	55.2		2026. 3. 6. 오전 1:34:38
조현_박윤설	필그렛챌린저1기	22.7	22.1	63.4	21.7	22.8	63.6		2026. 3. 6. 오전 1:34:09
이영희_김정숙	필그렛챌린저1기	13.1	21.3	52.6	8.7	24.2	53		2026. 3. 6. 오전 1:21:38
이윤종_전현서	필그렛챌린저1기	17.9	29.8	71.7	12.7	30.6	67.5	before 인바디 1월2일  aftter 인바디 3월4일  기간이 차이가 많이남	2026. 3. 6. 오전 1:19:50
박윤설	필그렛챌린저1기	19.1	22	59.9	18.3	20.5	56.4		2026. 3. 6. 오전 1:18:11
심효정_박윤설	필그렛챌린저1기	14.2	21.7	54.8	12.8	23.3	56.2		2026. 3. 6. 오전 1:17:40
윤경희_맹옥재	필그렛챌린저1기	24.5	18.5	59.4	23.8	19.2	60		2026. 3. 6. 오전 1:17:10
윤서희_전현서	필그렛챌린저1기	15.5	21.6	55.3	16.3	21.8	56.4		2026. 3. 6. 오전 1:16:36
이기영_손영주	필그렛챌린저1기	11.7	33.8	71.5	10.9	35.4	73.6		2026. 3. 6. 오전 1:15:49
이다현_이현숙	필그렛챌린저1기	19.8	18.2	54.2	18.9	18.3	53.3		2026. 3. 6. 오전 1:15:07
이미자_이정현	필그렛챌린저1기	23.6	23.4	66.9	22.7	23.2	65.7		2026. 3. 6. 오전 1:14:38
이종화_서준모	필그렛챌린저1기	16.6	30.9	72	14	32	71.3		2026. 3. 6. 오전 1:03:42
이희승_이희철	필그렛챌린저1기	17.4	24	61.5	17.4	23.2	59.9		2026. 3. 6. 오전 1:02:58
장연지_송현미	필그렛챌린저1기	27.9	23.4	70.1	26.6	23.5	69.2		2026. 3. 6. 오전 1:02:26
정은미_박시영	필그렛챌린저1기	17.7	28.7	69.4	16.6	28.3	68.2		2026. 3. 6. 오전 1:01:48
전현서	필그렛챌린저1기	19.7	23.8	63.6	18.9	25.3	65.4		2026. 3. 6. 오전 1:01:03
김태미_이정훈	필그렛챌린저1기	16.2	23	58.8	15.8	23.1	58.9		2026. 3. 6. 오전 12:52:52
고동명_표영은	필그렛챌린저1기	26.9	33.5	87	27.9	33	87		2026. 3. 6. 오전 12:49:22
김남숙_표영은	필그렛챌린저1기	16.6	22.1	57.5	16.3	23	58.7		2026. 3. 6. 오전 12:48:41
김은선_표영은	필그렛챌린저1기	26.5	23.4	69.8	25.9	23.1	68.6		2026. 3. 6. 오전 12:42:26
기지영_박윤설	필그렛챌린저1기	27.5	21	66.7	25.9	21	65		2026. 3. 6. 오전 12:40:46
강경신_박지	필그렛챌린저1기	19.8	21.1	59.3	18.3	20.2	56		2026. 3. 6. 오전 12:11:46
손영숙_표영은	필그렛챌린저1기	21.8	22.5	63.2	20.9	22.1	61.6		2026. 3. 6. 오전 12:11:46
신화영_표영은	필그렛챌린저1기	18.4	18.3	52.8	18.9	18.2	53.2		2026. 3. 6. 오전 12:11:46
장만호_이영걸	필그렛챌린저1기	6.7	26.4	54.3	6.5	27.4	55.7		2026. 3. 6. 오전 12:11:46
이영걸	필그렛챌린저1기	24.7	33.5	83.7	23.2	34.9	84.6		2026. 3. 6. 오전 12:11:46
최미지_김애영	필그렛챌린저1기	20.7	23.3	63	19.3	23.3	61.5	before/after 인바디 기계가 상이함	2026. 3. 6. 오전 12:11:46
`.trim();

function parseKoreanTimestamp(text) {
  const value = text.trim();
  const match = value.match(
    /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})$/
  );

  if (!match) {
    return new Date();
  }

  const [, year, month, day, meridian, h, m, s] = match;
  let hour = Number(h);

  if (meridian === '오전' && hour === 12) {
    hour = 0;
  }
  if (meridian === '오후' && hour !== 12) {
    hour += 12;
  }

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mins = String(m).padStart(2, '0');
  const secs = String(s).padStart(2, '0');

  return new Date(`${year}-${mm}-${dd}T${hh}:${mins}:${secs}+09:00`);
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

const parsedRows = SOURCE_ROWS.split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line, index) => {
    const columns = line.split('\t');
    if (columns.length < 9) {
      return null;
    }

    const timestampIndex = columns.length - 1;
    const noteIndex = columns.length - 2;
    const hasNote = columns[noteIndex] && columns[noteIndex].trim();
    const submittedAt = parseKoreanTimestamp(columns[timestampIndex]);

    return {
      index,
      name: columns[0].trim(),
      teamName: columns[1].trim(),
      beforeWeight: toNumber(columns[4]),
      beforeSkeletalMuscleMass: toNumber(columns[3]),
      beforeBodyFatMass: toNumber(columns[2]),
      afterWeight: toNumber(columns[7]),
      afterSkeletalMuscleMass: toNumber(columns[6]),
      afterBodyFatMass: toNumber(columns[5]),
      note: hasNote ? columns[noteIndex].trim() : '',
      submittedAt,
    };
  })
  .filter(Boolean);

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onResult(error) {
      if (error) {
        reject(error);
        return;
      }
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(row);
    });
  });
}

async function importData() {
  const defaultPassword = await bcrypt.hash('TempPassword123!', 10);

  await run('BEGIN IMMEDIATE TRANSACTION');

  try {
    for (const row of parsedRows) {
      const email = `import-${String(row.index + 1).padStart(3, '0')}@example.com`;
      const existing = await get('SELECT id FROM participants WHERE email = ?', [email]);

      let participantId = existing?.id;

      if (!participantId) {
        participantId = crypto.randomUUID();

        await run(
          'INSERT INTO participants (id, email, password, name, teamName, role, isActive, communicationScore, inspirationScore) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0)',
          [
            participantId,
            email,
            defaultPassword,
            row.name,
            row.teamName,
            'participant',
          ]
        );
      }

      await run('DELETE FROM inbody_data WHERE participantId = ?', [participantId]);
      await run(
        'INSERT INTO inbody_data (id, participantId, beforeWeight, beforeSkeletalMuscleMass, beforeBodyFatMass, beforeImageUrl, beforeImageFilename, afterWeight, afterSkeletalMuscleMass, afterBodyFatMass, afterImageUrl, afterImageFilename, beforeVerified, afterVerified, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          crypto.randomUUID(),
          participantId,
          row.beforeWeight,
          row.beforeSkeletalMuscleMass,
          row.beforeBodyFatMass,
          '',
          '',
          row.afterWeight,
          row.afterSkeletalMuscleMass,
          row.afterBodyFatMass,
          '',
          '',
          0,
          0,
          row.submittedAt.toISOString(),
        ]
      );
    }

    await run('COMMIT');
    console.log(`Inserted ${parsedRows.length} participants`);
  } catch (error) {
    await run('ROLLBACK');
    console.error('Failed to import data:', error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

importData();
