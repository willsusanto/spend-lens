import { FinanceTransaction, ImportBatch, TransactionStatus } from './data';

type CsvRow = Record<string, string>;

const normalizeHeader = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const pick = (row: CsvRow, candidates: string[]) => {
  for (const candidate of candidates) {
    const value = row[normalizeHeader(candidate)];

    if (value) {
      return value.trim();
    }
  }

  return '';
};

const parseAmount = (value: string) => {
  const cleaned = value.replace(/[^\d.-]/g, '').replace(/[()]/g, '-');
  const parsed = Number.parseFloat(cleaned);

  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (value: string) => {
  const cleaned = value.trim().replace(/^'/, '');
  const indonesianDate = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (indonesianDate) {
    const [, day, month, year] = indonesianDate;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) {
    return cleaned || 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(date);
};

const inferCategory = (description: string, amount: number) => {
  const text = description.toLowerCase();

  if (
    amount > 0 ||
    /salary|payroll|stripe|deposit|transfer in|bunga|kredit/.test(text)
  ) {
    return { category: 'Income', confidence: 96 };
  }

  if (
    /starbucks|coffee|restaurant|cafe|dining|mcdonald|grabfood|kopi|warung|makan|resto/.test(
      text,
    )
  ) {
    return { category: 'Food & Dining', confidence: 88 };
  }

  if (
    /grocery|market|supermarket|whole foods|trader joe|hypermart|indomaret|alfamart|ultra milk|susu/.test(
      text,
    )
  ) {
    return { category: 'Groceries', confidence: 90 };
  }

  if (/uber|grab|taxi|lyft|train|metro|transit|gojek|tol|parkir/.test(text)) {
    return { category: 'Transportation', confidence: 84 };
  }

  if (/netflix|spotify|apple.com\/bill|subscription|adobe/.test(text)) {
    return { category: 'Subscriptions', confidence: 91 };
  }

  if (/aws|google cloud|azure|cloud|software|github/.test(text)) {
    return { category: 'Software', confidence: 89 };
  }

  if (/electric|water|utility|internet|phone/.test(text)) {
    return { category: 'Utilities', confidence: 82 };
  }

  if (/trsf|transfer|e-banking|ebanking/.test(text)) {
    return { category: 'Transfer', confidence: 72 };
  }

  if (/qr|qris|transaksi debit/.test(text)) {
    return { category: 'Shopping', confidence: 68 };
  }

  return { category: 'Uncategorized', confidence: 31 };
};

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }

      row.push(field);

      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }

      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  row.push(field);

  if (row.some((cell) => cell.trim())) {
    rows.push(row);
  }

  return rows;
};

const findHeaderIndex = (rows: string[][]) =>
  rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);

    return (
      normalized.includes('tanggal') &&
      normalized.includes('keterangan') &&
      normalized.includes('jumlah')
    );
  });

const getHeaderKey = (header: string, index: number) => {
  const normalized = normalizeHeader(header);

  return normalized || `column${index}`;
};

export const parseTransactionsCsv = (
  text: string,
  fileName: string,
): { batch: ImportBatch; transactions: FinanceTransaction[] } => {
  const rows = parseCsvRows(text);
  const detectedHeaderIndex = findHeaderIndex(rows);
  const isIndonesianBankStatement = detectedHeaderIndex >= 0;
  const headerIndex = detectedHeaderIndex >= 0 ? detectedHeaderIndex : 0;
  const headers = rows[headerIndex] ?? [];
  const bodyRows = rows.slice(headerIndex + 1);
  const normalizedHeaders = headers.map(getHeaderKey);
  const importId = `import-${Date.now()}`;

  const csvRows = bodyRows
    .filter((values) => {
      if (!isIndonesianBankStatement) {
        return values.some((value) => value.trim());
      }

      const firstCell = values[0]?.trim().replace(/^'/, '') ?? '';

      return /^\d{2}\/\d{2}\/\d{4}$/.test(firstCell);
    })
    .map((values) =>
      normalizedHeaders.reduce<CsvRow>((row, header, index) => {
        row[header] = values[index] ?? '';

        if (headers[index]?.trim() === '') {
          row[`column${index}`] = values[index] ?? '';
        }

        return row;
      }, {}),
    );

  const amountIndex = normalizedHeaders.indexOf('jumlah');
  const directionIndex =
    amountIndex >= 0 && headers[amountIndex + 1]?.trim() === ''
      ? amountIndex + 1
      : -1;

  const transactions = csvRows.map((row, index) => {
    const rawDescription =
      pick(row, ['merchant', 'payee', 'name']) ||
      pick(row, ['description', 'details', 'memo', 'narrative']) ||
      pick(row, ['keterangan']);
    const description =
      pick(row, ['description', 'details', 'memo', 'narrative']) ||
      pick(row, ['keterangan']) ||
      rawDescription;
    const direction =
      directionIndex >= 0
        ? row[`column${directionIndex}`]?.trim().toUpperCase()
        : '';
    const rawAmount =
      parseAmount(pick(row, ['amount', 'transaction amount'])) ||
      parseAmount(pick(row, ['jumlah'])) ||
      parseAmount(pick(row, ['credit'])) -
        Math.abs(parseAmount(pick(row, ['debit'])));
    const amount = direction === 'DB' ? -Math.abs(rawAmount) : rawAmount;
    const inferred = inferCategory(`${rawDescription} ${description}`, amount);
    const status: TransactionStatus =
      inferred.category === 'Uncategorized' || inferred.confidence < 70
        ? 'Review'
        : 'Pending';

    return {
      id: `${importId}-${index}`,
      date: formatDate(
        pick(row, ['date', 'transaction date', 'posted date']) ||
          pick(row, ['tanggal']),
      ),
      merchant: rawDescription || 'Unknown Merchant',
      description: description || rawDescription || 'No description',
      amount,
      category: inferred.category,
      confidence: inferred.confidence,
      status,
      aiReason: 'Initial local rule match before Ollama categorization.',
      categorizationSource: 'heuristic' as const,
      importId,
      sourceFile: fileName,
    };
  });

  return {
    batch: {
      id: importId,
      fileName,
      date: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      rows: transactions.length,
      status: 'Parsed',
    },
    transactions,
  };
};
