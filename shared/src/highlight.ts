// @lezer/highlight tag'lerini CSS sınıflarına eşler.
// Hem editör hem de korumalı görüntüleyici bu haritayı kullanır (EK §C).
import { tags, tagHighlighter } from '@lezer/highlight';

export const tkHighlighter = tagHighlighter([
  // Anahtar kelimeler
  { tag: tags.keyword, class: 'tk-kw' },
  { tag: tags.controlKeyword, class: 'tk-kw' },
  { tag: tags.operatorKeyword, class: 'tk-kw' },
  { tag: tags.definitionKeyword, class: 'tk-kw' },
  { tag: tags.moduleKeyword, class: 'tk-kw' },
  { tag: tags.modifier, class: 'tk-kw' },

  // Sınıf ve tip isimleri
  { tag: tags.className, class: 'tk-class' },
  { tag: tags.typeName, class: 'tk-class' },
  { tag: tags.namespace, class: 'tk-class' },

  // Fonksiyon isimleri
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], class: 'tk-fn' },
  { tag: tags.function(tags.definition(tags.variableName)), class: 'tk-fn tk-def' },

  // Değişken tanımları (sınıf/fonksiyon dışı)
  { tag: tags.definition(tags.variableName), class: 'tk-var-def' },

  // String, karakter, düzenli ifade
  { tag: tags.string, class: 'tk-str' },
  { tag: tags.special(tags.string), class: 'tk-str' },
  { tag: tags.regexp, class: 'tk-str' },
  { tag: tags.character, class: 'tk-str' },
  { tag: tags.attributeValue, class: 'tk-str' },

  // Sayı, boolean, null, atom
  { tag: tags.number, class: 'tk-num' },
  { tag: tags.bool, class: 'tk-num' },
  { tag: tags.null, class: 'tk-num' },
  { tag: tags.atom, class: 'tk-num' },

  // Kaçış
  { tag: tags.escape, class: 'tk-esc' },

  // Yorumlar
  { tag: tags.comment, class: 'tk-com' },
  { tag: tags.lineComment, class: 'tk-com' },
  { tag: tags.blockComment, class: 'tk-com' },
  { tag: tags.docComment, class: 'tk-com' },

  // self / this
  { tag: tags.self, class: 'tk-self' },

  // Meta / dekoratör
  { tag: tags.meta, class: 'tk-meta' },
  { tag: tags.annotation, class: 'tk-meta' },

  // Property
  { tag: tags.propertyName, class: 'tk-prop' },

  // Operatörler
  { tag: tags.operator, class: 'tk-op' },
  { tag: tags.compareOperator, class: 'tk-op' },
  { tag: tags.arithmeticOperator, class: 'tk-op' },
  { tag: tags.logicOperator, class: 'tk-op' },

  // Noktalama
  { tag: tags.punctuation, class: 'tk-punc' },
  { tag: tags.bracket, class: 'tk-punc' },

  // HTML/XML
  { tag: tags.tagName, class: 'tk-tag' },
  { tag: tags.attributeName, class: 'tk-attr' },

  // Markdown
  { tag: tags.heading, class: 'tk-heading' },
  { tag: tags.link, class: 'tk-link' },
  { tag: tags.url, class: 'tk-link' },

  // Geçersiz
  { tag: tags.invalid, class: 'tk-invalid' }
]);