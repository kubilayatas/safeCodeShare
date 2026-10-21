import { describe, expect, it } from 'vitest';
import { format } from '../src/format';

describe('Formatters', () => {
  it('formats javascript', async () => {
    const res = await format('javascript', 'const  a=1; function f( ){return a}', { tabWidth: 2, useTabs: false });
    expect(res).toContain('const a = 1;');
  });

  it('formats typescript', async () => {
    const res = await format('typescript', 'interface   X{a:number}', { tabWidth: 2, useTabs: false });
    expect(res).toContain('interface X {');
  });

  it('formats python', async () => {
    const res = await format('python', 'def  f( a,b ):\n return a+b\n', { tabWidth: 4, useTabs: false });
    expect(res).toContain('def f(a, b):');
    expect(res).toContain('    return a + b');
  });

  it('formats c / cpp', async () => {
    const resC = await format('c', 'int  main( ){return 0;}', { tabWidth: 2, useTabs: false });
    expect(resC).toContain('int main() {');

    const resCpp = await format('cpp', 'int  main( ){return 0;}', { tabWidth: 2, useTabs: false });
    expect(resCpp).toContain('int main() {');
  });

  it('formats csharp', async () => {
    const res = await format('csharp', 'class  C{void M(){}}', { tabWidth: 4, useTabs: false });
    expect(res).toContain('class C {');
  });

  it('formats go', async () => {
    const res = await format('go', 'package main\nfunc main( ){println(1)}', { tabWidth: 2, useTabs: false });
    expect(res).toContain('package main');
    expect(res).toContain('func main() {');
  });

  it('formats java', async () => {
    const res = await format('java', 'public class C{ public static void main(String[] args){ System.out.println(1); } }', { tabWidth: 2, useTabs: false });
    expect(res).toContain('public class C {');
  });

  it('formats php', async () => {
    const res = await format('php', '<?php function test( $a ){return $a;}', { tabWidth: 2, useTabs: false });
    expect(res).toContain('function test($a)');
  });

  it('formats sql', async () => {
    const res = await format('sql', 'select id,name from users where id=1', { tabWidth: 2, useTabs: false });
    expect(res).toContain('SELECT');
    expect(res).toContain('FROM');
  });

  it('formats html / css / json', async () => {
    const html = await format('html', '<div>\n<p>hi</p>\n</div>', { tabWidth: 2, useTabs: false });
    expect(html).toContain('<div>\n  <p>hi</p>\n</div>');

    const css = await format('css', 'body{color:red;}', { tabWidth: 2, useTabs: false });
    expect(css).toContain('body {\n  color: red;\n}');

    const json = await format('json', '{"a":1,"b":2}', { tabWidth: 2, useTabs: false });
    expect(json.trim()).toBe('{ "a": 1, "b": 2 }');
  });

  it('unsupported language throws FormatError', async () => {
    await expect(format('plaintext', 'test', { tabWidth: 2, useTabs: false })).rejects.toThrow(
      'Bu dil için biçimlendirme desteklenmiyor'
    );
  });
});
