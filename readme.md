# SafeCodeShare 🎓

**SafeCodeShare**, öğretmenlerin ve eğitmenlerin ders sırasında öğrencileriyle anlık ve gerçek zamanlı kod paylaşımı yapabilmesi için tasarlanmış, modern, hafif ve bağımsız barındırılabilir (self-hosted) bir web platformudur.

---

## 🌟 Temel Özellikler

- **Gerçek Zamanlı İşbirlikçi Düzenleme (CRDT):** Yjs ve Hocuspocus WebSocket altyapısı sayesinde sıfır gecikmeli çoklu düzenleme. Öğretmen yazarken öğrenciler kodu anında görür. Renkli imleçler ve isim etiketleri awareness ile gösterilir.
- **🛡 Kopyalama Koruması (Copy Protection):** Öğrencilerin kodu doğrudan kopyalayıp yapıştırmasını önler. Kod tarayıcıya zehirlenmiş (U+00A0 bölünmez boşluklar ve U+200B sıfır genişlikli boşluklar içeren) SSE (Server-Sent Events) akışıyla iletilir. Panoya kopyalama engellenir, zorla kopyalanan metin çalıştırıldığında derlenmez/hata verir.
- **Ders & Konu Hiyerarşisi:** Kodlar (Pad'ler) rastgele değil; Dersler ve Konular altında hiyerarşik olarak düzenlenir, sürükle-bırak veya tek tıkla yeniden sıralanabilir.
- **Ders Sayfası (`/c/:token`):** Tek bir bağlantı ile o derse ait tüm açık ve zamanı gelmiş kodlar listelenir.
- **Ayrı Yetkilendirme Bağlantıları:**
  - **İzleme Bağlantısı (`/v/:token`):** Salt okunur görünüm (veya korumalı görünüm).
  - **Düzenleme Bağlantısı (`/e/:token`):** Öğrencilerin de birlikte yazabileceği ortak düzenleme linki (varsayılan kapalı).
- **19 Dil ve Gelişmiş Biçimlendirici (Beautify):** Prettier ve WebAssembly tabanlı derleyiciler (`ruff_fmt`, `clang-format`, `gofmt`, `@prettier/plugin-php`, `sql-formatter` vb.) ile tek tıkla kod düzenleme.
- **Lezer Sözdizimi Renklendirmesi & Temalar:** Monokai, Notepad++ ve One Dark temaları. Hem CodeMirror editöründe hem de korumalı SSE görünümünde birebir aynı renk paleti.
- **Öğretmeni Takip Et (Follow Mode):** Öğretmen sayfayı kaydırdığında (scroll) veya farklı bir satıra odaklandığında öğrencinin ekranı otomatik olarak o konuma kayar.
- **Sürüm Geçmişi & Geri Yükleme:** Düzenlemeler periyodik olarak ve manuel butonla kaydedilir. İstenilen sürüme anında geri dönülebilir veya yeni bir pad olarak klonlanabilir.
- **Sunum Modu & QR Kod:** Projeksiyonda ve akıllı tahtada ders anlatımı için tam ekran sunum modu ve tek tıkla öğrencilerin telefonla açabilmesi için dev QR kod.
- **Embed Desteği:** Ders yönetim sistemlerine (Moodle, Canvas, Notion vb.) iframe ile gömülebilme (`/embed/:token`).
- **Ödeme (Lemon Squeezy):** Öğretmenler Pro'yu aylık ya da yıllık abonelikle kendileri alır. Vergi, fatura ve iade işlerini Lemon Squeezy üstlenir. Kurulum: [ODEME.md](ODEME.md).
- **14 Arayüz Dili:** İngilizce, Türkçe, Almanca, Fransızca, İspanyolca, İtalyanca, Portekizce (Brezilya), Rusça, Çince (basitleştirilmiş), Japonca, Korece, Arapça (sağdan sola), Hintçe ve Endonezce. Ayrıntılar aşağıda, "Diller (i18n)" bölümünde.
- **Yedekleme & Yönetim:** SQLite yerel yedekleme API'si (`better-sqlite3`), crontab ile otomatik günlük yedekleme ve yönetici panelinden tam yedek indirme.

---

## 💻 Desteklenen Programlama Dilleri

| Dil | Editör Renklendirme | Korumalı Akış Parser | Beautify / Biçimlendirici Motoru |
|---|---|---|---|
| **JavaScript / TypeScript** | Lezer (CodeMirror) | Lezer | Prettier |
| **Python** | Lezer (CodeMirror) | Lezer | Ruff (WASM) |
| **C / C++** | Lezer (CodeMirror) | Lezer | Clang-Format (WASM) |
| **Java** | Lezer (CodeMirror) | Lezer | Prettier Java Plugin |
| **Go** | Lezer (CodeMirror) | Lezer | Gofmt (WASM) |
| **C#** | CodeMirror (clike) | Düz Metin Render* | Clang-Format (WASM) |
| **PHP** | Lezer (CodeMirror) | Lezer | Prettier PHP Plugin |
| **Rust** | Lezer (CodeMirror) | Lezer | Düz Metin |
| **HTML / CSS / SCSS** | Lezer (CodeMirror) | Lezer | Prettier |
| **JSON / YAML / XML** | Lezer (CodeMirror) | Lezer | Prettier / Prettier XML |
| **SQL** | CodeMirror SQL | Düz Metin Render* | SQL-Formatter |
| **Markdown** | Lezer (CodeMirror) | Lezer | Prettier |
| **Ruby, Shell, Pascal, Kotlin**| CodeMirror Legacy | Düz Metin Render* | Düz Metin |

*\* Not: Lezer dil ağacı bulunmayan diller korumalı kopyalama modunda düz metin span olarak aktarılır; normal düzenleyicide tam renklendirme çalışır.*

---

## 🛠 Geliştirme Ortamı Kurulumu

### Önkoşullar
- **Node.js**: v22 LTS (veya v24 LTS)
- **npm**: v10+
- **C/C++ Derleme Araçları**: `better-sqlite3` yerel modülü için (`python3`, `make`, `g++` ya da Windows için Visual Studio C++ Build Tools).

### 1. Depoyu Klonlayın ve Bağımlılıkları Kurun
```bash
git clone <repo-url>
cd safecodeshare
npm install
```

### 2. Ortam Değişkenlerini Tanımlayın
```bash
cp .env.example .env
```
`.env` dosyasını düzenleyin:
- `COOKIE_SECRET`: En az 32 karakterlik rastgele bir metin (Örn: `openssl rand -hex 32`)
- `ADMIN_EMAIL`: Yönetici öğretmenin e-posta adresi
- `ADMIN_PASSWORD`: Yönetici öğretmenin ilk giriş parolası
- `ADMIN_NAME`: Yönetici adı
- `DATA_DIR`: SQLite veritabanı klasörü (Örn: `./data`)

### 3. Geliştirme Sunucusunu Başlatın
```bash
npm run dev
```
Bu komut sunucuyu `http://localhost:3000` portunda, istemciyi ise Vite ile `http://localhost:5173` portunda eşzamanlı olarak çalıştırır.

---

## 🧪 Testler ve Kalite Kontrol

Projede otomatikleştirilmiş kapsamlı test süitleri yer almaktadır:

```bash
# Tüm Vitest testleri (94 test) ve çeviri dosyası denetimi
npm test

# Yalnızca çeviri dosyalarını denetle (eksik anahtar, yer tutucu, çoğul biçim)
npm run check:i18n

# 19 dilin biçimlendiricilerini smoke test ile doğrula
npm run test:format

# Salt okunur bağlantı ve yazma engelleme testini doğrula
npm run test:readonly

# Kopyalama koruması, SSE snapshot/patch ve zehirlenmiş kod testini doğrula
npm run test:protected

# SQLite veritabanı yedeğini manuel tetikle
npm run backup
```

---

## 🌍 Diller (i18n)

Arayüz 14 dilde: `en` (kaynak), `tr`, `de`, `fr`, `es`, `it`, `pt-BR`, `ru`, `zh-CN`, `ja`, `ko`, `ar`, `hi`, `id`.

**Dil nasıl seçilir?** Sırasıyla:
1. Kullanıcının hesabına kaydettiği dil
2. Bu tarayıcıda seçilen dil
3. Tarayıcının dil ayarı
4. İngilizce

Dil, üst menüdeki seçiciden, giriş sayfasının köşesinden ve Hesabım → Görünüm'den değiştirilir. Öğrenciler hesap açmadığı için onların seçimi tarayıcıda saklanır.

**Nasıl çalışır?**
- **İstemci:** Metinler `client/src/i18n/locales/*.ts` dosyalarında. `en.ts` kaynaktır; diğer dosyalar TypeScript tipiyle ona bağlı olduğu için eksik anahtar derlemeyi bozar.
  - Diller ayrı parçalar halinde, ihtiyaç olunca yüklenir.
  - Çoğullar dilin kurallarına göre seçilir. Örneğin Rusçada 3 biçim, Arapçada 6 biçim vardır.
  - Tarih, saat ve sayılar `Intl` ile biçimlendirilir.
- **Sunucu:** Hata mesajları da çevrilir. Koddaki Türkçe metin anahtardır, çeviriler `server/src/i18n/catalog.ts` içindedir. İstemci her istekte `X-Locale` başlığını gönderir.
- **Arapça (sağdan sola):** Sayfa yönü otomatik değişir. Kod alanları her zaman soldan sağa kalır.
- **Yazı tipleri:** Latin dışı yazılarda (Kiril, Çince, Japonca, Korece, Arapça, Devanagari) arayüz cihazın sistem fontunu kullanır. Böylece megabaytlarca font indirilmez.

**Yeni dil eklemek:**
1. `shared/src/locales.ts` dosyasındaki `LOCALES` listesine dili ekleyin.
2. `en.ts` dosyasını kopyalayıp çevirin.
3. `server/src/i18n/catalog.ts` içinde `LANG_ORDER` listesine dili ekleyin ve her satıra çevirisini yazın.
4. `npm test` çalıştırın. Testler eksik veya bozuk çeviriyi gösterir.

**Çeviriler hakkında:** Çeviriler yapay zekâ ile hazırlandı ve otomatik olarak denetlendi (anahtarlar, yer tutucular, çoğullar). Yayına almadan önce her dili ana dili konuşan birine okutmanız önerilir. Özellikle kullanım koşulları metni hukuki açıdan her ülke için ayrıca incelenmeli.

## 🔒 Güvenlik Mimarisi

- **Content Security Policy (CSP):** Helmet ile production ortamında katı CSP kuralları. `/embed/*` rotaları iframe gömülmesini desteklemek için `frame-ancestors *` olarak ayarlanırken, diğer tüm sayfalar `sameorigin` ile korunur.
- **Oturum Güvenliği:** HTTP-only, SameSite=Lax, SHA-256 HMAC imzalı çerezler (`cookie-signature`).
- **Parola Güvenliği:** bcryptjs ile hashleme (cost 12).
- **Girdi Güvenliği:** Başlık (≤ 120), açıklama (≤ 1000) ve ders adı (≤ 80) uzunluk sınırları; Express gövde limiti 2 MB, WebSocket mesaj limiti 2 MB.
- **Hız Sınırlama (Rate Limiting):** Giriş uç noktası brute-force saldırılarına karşı `express-rate-limit` ile sınırlandırılmıştır.

---

## 🚀 Canlıya Dağıtım (Production)

SafeCodeShare, tek bir Docker komutuyla ayağa kaldırılabilecek şekilde optimize edilmiştir:
```bash
docker compose up -d --build
```
Ayrıntılı bulut kurulum rehberi (Oracle Cloud Always Free, Google Cloud e2-micro, Cloudflare Tunnel, Caddy SSL konfigürasyonu ve otomatik yedekleme) için lütfen **[DEPLOY.md](file:///c:/Users/kubil/Desktop/Project_CodeShare/Antigravity/DEPLOY.md)** belgesini inceleyin.

---

## 📄 Lisans
Bu proje eğitim amaçlı geliştirilmiştir. Tüm hakları saklıdır.

## Render'a kurulum

Render üzerinde çalıştırmak için `RENDER.md` dosyasındaki adımları izleyin. Ücretsiz planda verilerin kalıcı olmadığını unutmayın.
