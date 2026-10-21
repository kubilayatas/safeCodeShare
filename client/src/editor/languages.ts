// Dil id → CodeMirror LanguageSupport / StreamLanguage eşlemesi.
// Paketler dinamik import ile yüklenir; bundle küçük kalır.
import type { Extension } from '@codemirror/state';

type Loader = () => Promise<Extension>;

const loaders: Record<string, Loader> = {
  javascript: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript();
  },
  jsx: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: true });
  },
  typescript: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ typescript: true });
  },
  tsx: async () => {
    const { javascript } = await import('@codemirror/lang-javascript');
    return javascript({ jsx: true, typescript: true });
  },
  html: async () => {
    const { html } = await import('@codemirror/lang-html');
    return html();
  },
  css: async () => {
    const { css } = await import('@codemirror/lang-css');
    return css();
  },
  scss: async () => {
    const { sass } = await import('@codemirror/lang-sass');
    return sass({ indented: false });
  },
  json: async () => {
    const { json } = await import('@codemirror/lang-json');
    return json();
  },
  markdown: async () => {
    const { markdown } = await import('@codemirror/lang-markdown');
    return markdown();
  },
  yaml: async () => {
    const { yaml } = await import('@codemirror/lang-yaml');
    return yaml();
  },
  xml: async () => {
    const { xml } = await import('@codemirror/lang-xml');
    return xml();
  },
  python: async () => {
    const { python } = await import('@codemirror/lang-python');
    return python();
  },
  java: async () => {
    const { java } = await import('@codemirror/lang-java');
    return java();
  },
  c: async () => {
    const { cpp } = await import('@codemirror/lang-cpp');
    return cpp();
  },
  cpp: async () => {
    const { cpp } = await import('@codemirror/lang-cpp');
    return cpp();
  },
  csharp: async () => {
    const { StreamLanguage } = await import('@codemirror/language');
    const mod = await import('@codemirror/legacy-modes/mode/clike');
    return StreamLanguage.define(mod.csharp);
  },
  php: async () => {
    const { php } = await import('@codemirror/lang-php');
    return php();
  },
  sql: async () => {
    const { sql } = await import('@codemirror/lang-sql');
    return sql();
  },
  go: async () => {
    const { go } = await import('@codemirror/lang-go');
    return go();
  },
  rust: async () => {
    const { rust } = await import('@codemirror/lang-rust');
    return rust();
  },
  kotlin: async () => {
    const { StreamLanguage } = await import('@codemirror/language');
    const mod = await import('@codemirror/legacy-modes/mode/clike');
    return StreamLanguage.define(mod.kotlin);
  },
  ruby: async () => {
    const { StreamLanguage } = await import('@codemirror/language');
    const mod = await import('@codemirror/legacy-modes/mode/ruby');
    return StreamLanguage.define(mod.ruby);
  },
  shell: async () => {
    const { StreamLanguage } = await import('@codemirror/language');
    const mod = await import('@codemirror/legacy-modes/mode/shell');
    return StreamLanguage.define(mod.shell);
  },
  pascal: async () => {
    const { StreamLanguage } = await import('@codemirror/language');
    const mod = await import('@codemirror/legacy-modes/mode/pascal');
    return StreamLanguage.define(mod.pascal);
  }
};

export async function loadLanguage(id: string): Promise<Extension | null> {
  const loader = loaders[id];
  if (!loader) return null;
  try {
    return await loader();
  } catch (err) {
    console.warn(`[editor] dil yüklenemedi: ${id}`, err);
    return null;
  }
}