import ExcelJS from 'exceljs';
import { Rankings } from '@/types';

const DEFAULT_TEMPLATE_URL = '/templates/챌린저_참가자.xlsx';
const DEFAULT_START_ROW = 2;

export type ParticipantExcelRow = {
  no: number;
  name: string;
  email: string;
  teamName: string;
  beforeWeight: number | null;
  afterWeight: number | null;
  muscleGain: number;
  fatLoss: number;
  communicationScore: number;
  inspirationScore: number;
  totalScore: number;
  submittedAt: string;
};

type ExportOptions = {
  fileName?: string;
  templateFile?: File;
  worksheetName?: string;
  startRow?: number;
  seasonName?: string;
  rankings?: Rankings;
};

const CANDIDATE_LIMIT = 7;

function addCandidateWorksheet(workbook: ExcelJS.Workbook, rankings: Rankings, seasonName: string) {
  const worksheet = workbook.addWorksheet('왕 후보 TOP7');

  worksheet.columns = [
    { width: 14 },
    { width: 8 },
    { width: 20 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
  ];

  const title = worksheet.getCell('A1');
  title.value = `${seasonName} 왕 후보 리스트 (TOP ${CANDIDATE_LIMIT})`;
  title.font = { bold: true, size: 14 };
  worksheet.mergeCells('A1:F1');

  const sections: Array<{
    title: string;
    key: keyof Rankings;
    scoreLabel: string;
    metricBuilder: (entry: Rankings[keyof Rankings][number]) => string;
  }> = [
    {
      title: '증량왕',
      key: 'gainKing',
      scoreLabel: '총점',
      metricBuilder: (entry) => `근육 +${entry.metrics.muscleGain.toFixed(1)}kg / 체지방 -${entry.metrics.fatLoss.toFixed(1)}kg`,
    },
    {
      title: '감량왕',
      key: 'lossKing',
      scoreLabel: '총점',
      metricBuilder: (entry) => `체지방 -${entry.metrics.fatLoss.toFixed(1)}kg / 근육 +${entry.metrics.muscleGain.toFixed(1)}kg`,
    },
    {
      title: '소통왕',
      key: 'communicationKing',
      scoreLabel: '소통점수',
      metricBuilder: (entry) => `소통 ${entry.participant.communicationScore}점`,
    },
    {
      title: '감동왕',
      key: 'inspirationKing',
      scoreLabel: '동기부여점수',
      metricBuilder: (entry) => `동기부여 ${entry.participant.inspirationScore}점`,
    },
  ];

  let rowPointer = 3;
  sections.forEach((section) => {
    const sectionTitleCell = worksheet.getCell(`A${rowPointer}`);
    sectionTitleCell.value = section.title;
    sectionTitleCell.font = { bold: true, size: 12 };
    worksheet.mergeCells(`A${rowPointer}:F${rowPointer}`);
    rowPointer += 1;

    const headerRow = worksheet.getRow(rowPointer);
    ['순위', '이름', '팀', section.scoreLabel, '지표'].forEach((value, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = value;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' },
      };
    });
    headerRow.commit();
    rowPointer += 1;

    const entries = rankings[section.key].slice(0, CANDIDATE_LIMIT);
    if (entries.length === 0) {
      const emptyRow = worksheet.getRow(rowPointer);
      emptyRow.getCell(1).value = '데이터 없음';
      worksheet.mergeCells(`A${rowPointer}:F${rowPointer}`);
      emptyRow.commit();
      rowPointer += 2;
      return;
    }

    entries.forEach((entry) => {
      const row = worksheet.getRow(rowPointer);
      row.getCell(1).value = entry.rank;
      row.getCell(2).value = entry.participant.name;
      row.getCell(3).value = entry.participant.teamName ?? '-';
      row.getCell(4).value =
        section.key === 'communicationKing'
          ? entry.participant.communicationScore
          : section.key === 'inspirationKing'
            ? entry.participant.inspirationScore
            : entry.metrics.totalScore;
      row.getCell(5).value = section.metricBuilder(entry);
      row.commit();
      rowPointer += 1;
    });

    rowPointer += 2;
  });
}

async function loadTemplateBuffer(templateFile?: File): Promise<ArrayBuffer> {
  if (templateFile) {
    return templateFile.arrayBuffer();
  }

  try {
    const response = await fetch(DEFAULT_TEMPLATE_URL);
    if (!response.ok) {
      return new ArrayBuffer(0);
    }

    return response.arrayBuffer();
  } catch {
    return new ArrayBuffer(0);
  }
}

function createFallbackWorksheet(workbook: ExcelJS.Workbook) {
  const worksheet = workbook.addWorksheet('참가자 목록');
  const headers = [
    '번호',
    '참가자명',
    '이메일',
    '팀명',
    '측정 전 체중(kg)',
    '측정 후 체중(kg)',
    '근육 변화(kg)',
    '체지방 변화(kg)',
    '소통점수',
    '동기부여점수',
    '총점',
    '업로드 일시',
  ];

  const headerRow = worksheet.getRow(1);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };
  });
  headerRow.commit();

  worksheet.columns = [
    { width: 8 },
    { width: 18 },
    { width: 28 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 13 },
    { width: 13 },
    { width: 10 },
    { width: 12 },
    { width: 10 },
    { width: 20 },
  ];

  return worksheet;
}

function triggerDownload(data: BlobPart, fileName: string) {
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportParticipantsExcel(rows: ParticipantExcelRow[], options?: ExportOptions) {
  const workbook = new ExcelJS.Workbook();
  const templateBuffer = await loadTemplateBuffer(options?.templateFile);
  let worksheet: ExcelJS.Worksheet | undefined;

  if (templateBuffer.byteLength > 0) {
    await workbook.xlsx.load(templateBuffer);
    worksheet = options?.worksheetName
      ? workbook.getWorksheet(options.worksheetName)
      : workbook.getWorksheet(1);
  } else {
    worksheet = createFallbackWorksheet(workbook);
  }

  if (!worksheet) {
    throw new Error('엑셀 시트를 찾지 못했습니다.');
  }

  const startRow = options?.startRow ?? DEFAULT_START_ROW;

  rows.forEach((row, index) => {
    const target = worksheet.getRow(startRow + index);
    target.getCell(1).value = row.no;
    target.getCell(2).value = row.name;
    target.getCell(3).value = row.email;
    target.getCell(4).value = row.teamName;
    target.getCell(5).value = row.beforeWeight;
    target.getCell(6).value = row.afterWeight;
    target.getCell(7).value = row.muscleGain;
    target.getCell(8).value = row.fatLoss;
    target.getCell(9).value = row.communicationScore;
    target.getCell(10).value = row.inspirationScore;
    target.getCell(11).value = row.totalScore;
    target.getCell(12).value = row.submittedAt;
    target.commit();
  });

  if (options?.rankings) {
    addCandidateWorksheet(workbook, options.rankings, options.seasonName ?? '선택 기수');
  }

  const output = await workbook.xlsx.writeBuffer();
  triggerDownload(output, options?.fileName ?? '챌린저_참가자_결과.xlsx');
}
