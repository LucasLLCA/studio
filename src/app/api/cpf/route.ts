import { NextRequest, NextResponse } from 'next/server';

const normalizeSpaces = (value: string): string => {
  return value.replace(/\s+/g, ' ').trim();
};

const normalizeForCompare = (value: string): string => {
  return normalizeSpaces(
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
  );
};

const cleanName = (value: string): string => {
  return normalizeSpaces(
    value.replace(/\s*[-–—]?\s*matr(?:[ií]cula)?\.?\s*[:\-]?\s*[a-z0-9.\-\/]+/gi, '')
  );
};

const cleanMatricula = (value: string): string => {
  return normalizeSpaces(
    value
      .replace(/matr(?:[ií]cula)?\.?\s*[:\-]?/gi, '')
      .replace(/\s+/g, '')
  );
};

const buildMatriculaCandidates = (rawMatricula: string): string[] => {
  const base = cleanMatricula(rawMatricula);
  const candidates = new Set<string>();

  if (!base) return [];

  candidates.add(base);
  candidates.add(base.toUpperCase());

  const alnum = base.replace(/[^a-z0-9]/gi, '');
  if (alnum) {
    candidates.add(alnum);
    if (alnum.length >= 2) {
      candidates.add(`${alnum.slice(0, -1)}-${alnum.slice(-1)}`);
    }
  }

  return Array.from(candidates).filter(Boolean);
};

const buildNameCandidates = (rawName: string): string[] => {
  const base = cleanName(rawName);
  const tokens = base.split(' ').filter(Boolean);
  const candidates = new Set<string>();

  if (base) candidates.add(base);

  const asciiBase = normalizeForCompare(base);
  if (asciiBase && asciiBase !== base) candidates.add(asciiBase);

  // Keep only stronger fragments to avoid broad queries.
  if (tokens.length >= 5) candidates.add(tokens.slice(0, 5).join(' '));
  if (tokens.length >= 4) candidates.add(tokens.slice(0, 4).join(' '));
  if (tokens.length >= 3) candidates.add(tokens.slice(0, 3).join(' '));

  return Array.from(candidates).map(normalizeSpaces).filter(Boolean);
};

const tokenizeName = (value: string): string[] => {
  const stopwords = new Set(['de', 'da', 'do', 'dos', 'das', 'e']);
  return Array.from(new Set(
    normalizeForCompare(value)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopwords.has(token))
  ));
};

const extractCpfFromResponse = (payload: any, targetName?: string): string | null => {
  if (!payload?.pessoa || !Array.isArray(payload.pessoa)) return null;

  const people = payload.pessoa.filter((person: any) => typeof person?.cpf === 'string' && person.cpf.trim());
  if (people.length === 0) return null;

  // For matricula-based searches, first result is expected to be deterministic.
  if (!targetName) return people[0].cpf;

  const targetNormalized = normalizeForCompare(cleanName(targetName));
  if (!targetNormalized) return null;

  const targetTokens = tokenizeName(targetNormalized);
  const minimumTokenMatch = Math.max(2, Math.ceil(targetTokens.length * 0.6));

  let bestCpf: string | null = null;
  let bestScore = -Infinity;

  for (const person of people) {
    const candidateName = normalizeForCompare(person?.nome || '');
    if (!candidateName) continue;

    const exact = candidateName === targetNormalized;
    const contains = targetNormalized.length >= 8 && (
      candidateName.includes(targetNormalized) || targetNormalized.includes(candidateName)
    );

    const candidateTokens = new Set(tokenizeName(candidateName));
    const overlap = targetTokens.filter((token) => candidateTokens.has(token)).length;
    const overlapRatio = targetTokens.length > 0 ? overlap / targetTokens.length : 0;

    const isStrongMatch = exact || contains || overlap >= minimumTokenMatch;
    if (!isStrongMatch) continue;

    const score =
      (exact ? 120 : 0) +
      (contains ? 60 : 0) +
      overlap * 12 +
      overlapRatio * 30;

    if (score > bestScore) {
      bestScore = score;
      bestCpf = person.cpf;
    }
  }

  // If no strong match, prefer null instead of returning a wrong CPF.
  return bestCpf;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const matriculaRaw = searchParams.get('matricula');
  const nomeRaw = searchParams.get('nome');
  const matricula = matriculaRaw ? normalizeSpaces(matriculaRaw) : null;
  const nome = nomeRaw ? normalizeSpaces(nomeRaw) : null;

  const apiUrl = process.env.NEXT_PUBLIC_MCP_API_URL || 'https://mcp.gestor.sead.pi.gov.br';
  const apiKey = process.env.MCP_API_KEY || '';
  const seiToken = request.headers.get('x-sei-token');

  try {
    const queryCpf = async (url: string, targetName?: string): Promise<string | null> => {
      const headers: Record<string, string> = {
        accept: 'application/json',
        'X-API-Key': apiKey,
      };
      if (seiToken) headers['x-sei-token'] = seiToken;

      const response = await fetch(url, {
        headers,
      });

      if (!response.ok) return null;
      const data = await response.json();
      return extractCpfFromResponse(data, targetName);
    };

    const isValidMatricula = (mat: string | null): boolean => {
      if (!mat || mat.trim() === '') return false;
      const digitsOnly = mat.replace(/[^\d]/g, '');
      // Rejeita matrícula vazia ou "00000000"
      return digitsOnly !== '' && digitsOnly !== '00000000';
    };

    // 1) Search by matricula first (if valid)
    if (isValidMatricula(matricula)) {
      const matriculaCandidates = buildMatriculaCandidates(matricula!);
      for (const matriculaCandidate of matriculaCandidates) {
        if (!isValidMatricula(matriculaCandidate)) continue;
        const url = `${apiUrl}/pessoa/produtividade?matricula=${encodeURIComponent(matriculaCandidate)}`;
        const cpf = await queryCpf(url);
        if (cpf) return NextResponse.json({ cpf });
      }
    }

    // 2) Fallback to nome with strict matching (sempre tenta, mesmo se matricula foi fornecida)
    if (nome) {
      const nameCandidates = buildNameCandidates(nome);
      for (const candidate of nameCandidates) {
        if (!candidate) continue;
        const url = `${apiUrl}/pessoa/produtividade?nome=${encodeURIComponent(candidate)}`;
        const cpf = await queryCpf(url, nome);
        if (cpf) return NextResponse.json({ cpf });
      }
    }

    return NextResponse.json({ cpf: null });
  } catch (error) {
    console.error('[cpf-api] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
