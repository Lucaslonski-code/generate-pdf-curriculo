export type TokenType =
  | 'ENDPOINT_OPEN'
  | 'ENDPOINT_CLOSE'
  | 'CONTENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const ENDPOINT_PATTERN = /^\[\((\/?)([A-Z_]+)\)\]$/;

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const lines = input.split('\n');
  let lineNumber = 1;

  for (const line of lines) {
    let column = 1;
    const trimmed = line.trim();

    const match = trimmed.match(ENDPOINT_PATTERN);
    if (match) {
      const isClose = match[1] === '/';
      const endpointName = match[2];
      tokens.push({
        type: isClose ? 'ENDPOINT_CLOSE' : 'ENDPOINT_OPEN',
        value: endpointName,
        line: lineNumber,
        column: column,
      });
    } else if (trimmed.length > 0) {
      tokens.push({
        type: 'CONTENT',
        value: line,
        line: lineNumber,
        column: column,
      });
    }

    lineNumber++;
  }

  tokens.push({ type: 'EOF', value: '', line: lineNumber, column: 1 });
  return tokens;
}