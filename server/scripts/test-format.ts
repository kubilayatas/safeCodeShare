// Her biçimlendiricili dil için bilerek bozuk girintili örnek kod formatlanır.
// Sonuç boş olmamalı ve girdiden farklı olmalı. PASS/FAIL tablosu yazdırılır.
//
// Her WASM paketi için ayrıca izole `smoke` bloğu çalışır. Paketin API'si farklıysa
// ilgili blok FAIL verir ve çıktıda hangi paketin uyumsuz olduğu görünür.
import { format } from '../src/format';

type Sample = {
  language: string;
  code: string;
};

const SAMPLES: Sample[] = [
  {
    language: 'javascript',
    code: 'const   x=1;function foo( a,b ){return a+b}\nconsole.log( foo(1,2) )'
  },
  {
    language: 'jsx',
    code: 'const App=()=>{return (<div className="a"   ><span>hi</span></div>)}'
  },
  {
    language: 'typescript',
    code: 'interface A{x:number;y:string}\nconst a:A={x:1,y:"a"}'
  },
  {
    language: 'tsx',
    code: 'const App:React.FC=()=>(<div>{1+2}</div>)'
  },
  {
    language: 'html',
    code: '<div><p>merhaba</p><span>dunya</span></div>'
  },
  {
    language: 'css',
    code: 'body{margin:0;padding:0;color:red}'
  },
  {
    language: 'scss',
    code: '$c:red;body{color:$c;.x{color:blue}}'
  },
  {
    language: 'json',
    code: '{"a":1,"b":[1,2,3],"c":{"d":true}}'
  },
  {
    language: 'markdown',
    code: '# Baslik\n\n*  madde1\n*    madde2'
  },
  {
    language: 'yaml',
    code: 'a: 1\nb:\n - x\n - y\nc: {d: true}'
  },
  {
    language: 'xml',
    code: '<?xml version="1.0"?><root><item id="1">x</item></root>'
  },
  {
    language: 'python',
    code: 'def   topla(a,b):\n  return a+b\n\nprint(  topla(1,2) )'
  },
  {
    language: 'java',
    code: 'public class A{public static void main(String[] args){System.out.println("hi");}}'
  },
  {
    language: 'c',
    code: '#include <stdio.h>\nint main(){int x=1;printf("%d\\n",x);return 0;}'
  },
  {
    language: 'cpp',
    code: '#include <iostream>\nint main(){std::cout<<"hi"<<std::endl;return 0;}'
  },
  {
    language: 'csharp',
    code: 'using System;class Program{static void Main(){Console.WriteLine("hi");}}'
  },
  {
    language: 'php',
    code: '<?php\nfunction  foo( $a,$b ){return $a+$b;}\necho foo(1,2);'
  },
  {
    language: 'sql',
    code: 'select id,name from users where id=1 order by name'
  },
  {
    language: 'go',
    code: 'package main\nimport "fmt"\nfunc main(){fmt.Println("hi")}'
  }
];

type Row = { language: string; status: 'PASS' | 'FAIL' | 'SKIP'; note: string };

async function runOne(sample: Sample): Promise<Row> {
  try {
    const out = await format(sample.language, sample.code, { tabWidth: 2, useTabs: false });
    if (typeof out !== 'string' || out.trim().length === 0) {
      return { language: sample.language, status: 'FAIL', note: 'boş sonuç' };
    }
    if (out === sample.code) {
      return { language: sample.language, status: 'FAIL', note: 'girdiyle aynı' };
    }
    return { language: sample.language, status: 'PASS', note: `${out.length} byte` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { language: sample.language, status: 'FAIL', note: msg.slice(0, 80) };
  }
}

async function smokeWasm(): Promise<Row[]> {
  const out: Row[] = [];

  // @wasm-fmt/ruff_fmt smoke
  try {
    const mod = (await import('@wasm-fmt/ruff_fmt')) as unknown as {
      default?: () => Promise<unknown>;
      format: (s: string, path?: string | null, o?: Record<string, unknown> | null) => string;
    };
    if (typeof mod.default === 'function') {
      await mod.default();
    }
    const r = mod.format('x=1\n', 'test.py');
    if (typeof r === 'string' && r.length > 0) {
      out.push({ language: 'smoke:ruff_fmt', status: 'PASS', note: `${r.length} byte` });
    } else {
      out.push({ language: 'smoke:ruff_fmt', status: 'FAIL', note: 'beklenen string dönmedi' });
    }
  } catch (err) {
    out.push({
      language: 'smoke:ruff_fmt',
      status: 'FAIL',
      note: (err instanceof Error ? err.message : String(err)).slice(0, 80)
    });
  }

  // @wasm-fmt/clang-format smoke
  try {
    const mod = (await import('@wasm-fmt/clang-format')) as unknown as {
      default: () => Promise<unknown>;
      format: (s: string, f: string, st: string) => string;
    };
    await mod.default();
    const style = JSON.stringify({ BasedOnStyle: 'Google', IndentWidth: 2, UseTab: 'Never' });
    const r = mod.format('int main(){return 0;}\n', 'main.c', style);
    if (typeof r === 'string' && r.length > 0) {
      out.push({ language: 'smoke:clang-format', status: 'PASS', note: `${r.length} byte` });
    } else {
      out.push({ language: 'smoke:clang-format', status: 'FAIL', note: 'beklenen string dönmedi' });
    }
  } catch (err) {
    out.push({
      language: 'smoke:clang-format',
      status: 'FAIL',
      note: (err instanceof Error ? err.message : String(err)).slice(0, 80)
    });
  }

  // @wasm-fmt/gofmt smoke
  try {
    const mod = (await import('@wasm-fmt/gofmt')) as unknown as {
      default?: () => Promise<unknown>;
      format: (s: string) => string;
    };
    if (typeof mod.default === 'function') {
      await mod.default();
    }
    const r = mod.format('package main\nfunc main(){}\n');
    if (typeof r === 'string' && r.length > 0) {
      out.push({ language: 'smoke:gofmt', status: 'PASS', note: `${r.length} byte` });
    } else {
      out.push({ language: 'smoke:gofmt', status: 'FAIL', note: 'beklenen string dönmedi' });
    }
  } catch (err) {
    out.push({
      language: 'smoke:gofmt',
      status: 'FAIL',
      note: (err instanceof Error ? err.message : String(err)).slice(0, 80)
    });
  }

  return out;
}

async function main(): Promise<void> {
  const rows: Row[] = [];
  for (const s of SAMPLES) {
    rows.push(await runOne(s));
  }
  const smokes = await smokeWasm();

  // Tablo
  const w = Math.max(...rows.map((r) => r.language.length), 'Dil'.length);
  console.log('Dil'.padEnd(w) + '  Durum  Not');
  console.log('-'.repeat(w + 20));
  for (const r of rows) {
    console.log(`${r.language.padEnd(w)}  ${r.status.padEnd(5)}  ${r.note}`);
  }
  console.log('');
  console.log('--- smoke ---');
  for (const r of smokes) {
    console.log(`${r.language.padEnd(w)}  ${r.status.padEnd(5)}  ${r.note}`);
  }

  const failed = [...rows, ...smokes].filter((r) => r.status === 'FAIL');
  console.log('');
  console.log(failed.length === 0 ? 'PASS' : `FAIL (${failed.length} başarısız)`);
  process.exit(failed.length === 0 ? 0 : 1);
}

void main();