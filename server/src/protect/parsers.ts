// Dil id → Lezer parser eşlemesi (sunucu tarafı korumalı render için).
// Parser bulunamayan diller için null döner; render katmanı düz metin üretir.
//
// API VARSAYIMI: @lezer/javascript v1'de `parser.configure({ dialect: 'jsx' | 'ts' | 'jsx ts' })`
// yeni bir Parser örneği döner. Diğer @lezer/* paketleri `parser` named export'una sahiptir.
// @lezer/yaml paketi mevcut (spesifikasyondaki dil tablosunda YAML için gerekiyor).
import type { Parser } from '@lezer/common';
import { parser as jsParser } from '@lezer/javascript';
import { parser as pyParser } from '@lezer/python';
import { parser as javaParser } from '@lezer/java';
import { parser as cppParser } from '@lezer/cpp';
import { parser as phpParser } from '@lezer/php';
import { parser as rustParser } from '@lezer/rust';
import { parser as goParser } from '@lezer/go';
import { parser as htmlParser } from '@lezer/html';
import { parser as cssParser } from '@lezer/css';
import { parser as sassParser } from '@lezer/sass';
import { parser as jsonParser } from '@lezer/json';
import { parser as markdownParser } from '@lezer/markdown';
import { parser as xmlParser } from '@lezer/xml';
import { parser as yamlParser } from '@lezer/yaml';

// Not: SQL, C#, Kotlin, Ruby, Shell, Pascal için sunucu tarafı Lezer parser
// mevcut değil veya Node uyumluluğu şüpheli. Bu diller düz metin render edilir
// (tek span, sınıf yok). README'ye not düşülecek.
export function getParserFor(language: string): Parser | null {
  switch (language) {
    case 'javascript':
      return jsParser;
    case 'jsx':
      return jsParser.configure({ dialect: 'jsx' });
    case 'typescript':
      return jsParser.configure({ dialect: 'ts' });
    case 'tsx':
      return jsParser.configure({ dialect: 'jsx ts' });
    case 'python':
      return pyParser;
    case 'java':
      return javaParser;
    case 'c':
    case 'cpp':
      return cppParser;
    case 'php':
      return phpParser;
    case 'rust':
      return rustParser;
    case 'go':
      return goParser;
    case 'html':
      return htmlParser;
    case 'css':
      return cssParser;
    case 'scss':
      return sassParser;
    case 'json':
      return jsonParser;
    case 'markdown':
      return markdownParser;
    case 'xml':
      return xmlParser;
    case 'yaml':
      return yamlParser;
    default:
      return null;
  }
}