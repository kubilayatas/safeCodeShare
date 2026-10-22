// Desteklenen diller ve biçimlendirici eşlemeleri

export type FormatterId =
  | 'prettier-babel'
  | 'prettier-typescript'
  | 'prettier-html'
  | 'prettier-css'
  | 'prettier-scss'
  | 'prettier-json'
  | 'prettier-markdown'
  | 'prettier-yaml'
  | 'prettier-xml'
  | 'prettier-java'
  | 'prettier-php'
  | 'ruff'
  | 'clang-c'
  | 'clang-cpp'
  | 'clang-csharp'
  | 'gofmt'
  | 'sql';

export type Language = {
  id: string;
  label: string;
  extension: string;
  formatter: FormatterId | null;
};

// Tablo: spesifikasyon §8
export const LANGUAGES: readonly Language[] = [
  { id: 'plaintext',  label: 'Plain text',       extension: '.txt',  formatter: null },
  { id: 'javascript', label: 'JavaScript',       extension: '.js',   formatter: 'prettier-babel' },
  { id: 'jsx',        label: 'JavaScript (JSX)', extension: '.jsx',  formatter: 'prettier-babel' },
  { id: 'typescript', label: 'TypeScript',       extension: '.ts',   formatter: 'prettier-typescript' },
  { id: 'tsx',        label: 'TypeScript (TSX)', extension: '.tsx',  formatter: 'prettier-typescript' },
  { id: 'html',       label: 'HTML',             extension: '.html', formatter: 'prettier-html' },
  { id: 'css',        label: 'CSS',              extension: '.css',  formatter: 'prettier-css' },
  { id: 'scss',       label: 'SCSS',             extension: '.scss', formatter: 'prettier-scss' },
  { id: 'json',       label: 'JSON',             extension: '.json', formatter: 'prettier-json' },
  { id: 'markdown',   label: 'Markdown',         extension: '.md',   formatter: 'prettier-markdown' },
  { id: 'yaml',       label: 'YAML',             extension: '.yaml', formatter: 'prettier-yaml' },
  { id: 'xml',        label: 'XML',              extension: '.xml',  formatter: 'prettier-xml' },
  { id: 'python',     label: 'Python',           extension: '.py',   formatter: 'ruff' },
  { id: 'java',       label: 'Java',             extension: '.java', formatter: 'prettier-java' },
  { id: 'c',          label: 'C',                extension: '.c',    formatter: 'clang-c' },
  { id: 'cpp',        label: 'C++',              extension: '.cpp',  formatter: 'clang-cpp' },
  { id: 'csharp',     label: 'C#',               extension: '.cs',   formatter: 'clang-csharp' },
  { id: 'php',        label: 'PHP',              extension: '.php',  formatter: 'prettier-php' },
  { id: 'sql',        label: 'SQL',              extension: '.sql',  formatter: 'sql' },
  { id: 'go',         label: 'Go',               extension: '.go',   formatter: 'gofmt' },
  { id: 'rust',       label: 'Rust',             extension: '.rs',   formatter: null },
  { id: 'kotlin',     label: 'Kotlin',           extension: '.kt',   formatter: null },
  { id: 'ruby',       label: 'Ruby',             extension: '.rb',   formatter: null },
  { id: 'shell',      label: 'Bash/Shell',       extension: '.sh',   formatter: null },
  { id: 'pascal',     label: 'Pascal',           extension: '.pas',  formatter: null }
] as const;

export const LANGUAGE_IDS: readonly string[] = LANGUAGES.map((l) => l.id);

export function getLanguage(id: string): Language | undefined {
  return LANGUAGES.find((l) => l.id === id);
}

export function languageExtension(id: string): string {
  return getLanguage(id)?.extension ?? '.txt';
}

export function languageLabel(id: string): string {
  return getLanguage(id)?.label ?? id;
}

export function languageHasFormatter(id: string): boolean {
  return getLanguage(id)?.formatter != null;
}