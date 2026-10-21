# SafeCodeShare — Render Üzerinde Kurulum

Bu rehber, servisi Render panelinden elle oluşturduğunuzu varsayar. Ayarlarınızı aşağıdaki listeyle tek tek karşılaştırın.

## Siteyi herkese açacaksanız: ücretsiz plan uygun değil

Herkese açık kayıtta kullanıcılar hesap açar, ders hazırlar, belki ücret öder. Ücretsiz planda bunların **hepsi** sunucu her uyuduğunda silinir: kullanıcı ertesi gün giriş yapamaz, çünkü hesabı artık yoktur. Herkese açmadan önce:

1. Servisi **Starter** plana yükseltin ($7/ay).
2. **Disks** bölümünden `/data` yoluna 1 GB disk ekleyin ($0.25/ay).
3. Yönetim paneli → Genel bakış → **Yedeği indir** ile düzenli yedek alın.

Disk ekledikten sonra kodda hiçbir değişiklik gerekmez; uygulama verilerini zaten `/data` içine yazar. O güne kadar kayıtları kapalı tutmak için: Yönetim → Site ayarları → "Herkes hesap oluşturabilsin" kutusunu kaldırın.

## Ücretsiz planda veriler kalıcı değil

- 15 dakika boyunca sunucuya istek gelmezse Render sunucuyu uyutur. Tekrar açılması yaklaşık 1 dakika sürer.
- Sunucu **her uyuduğunda, yeniden başladığında ve her deploy'da** tüm dersler, kodlar, sürümler ve sonradan eklenen öğretmen hesapları silinir.
- **Admin hesabı silinmez:** Her açılışta ortam değişkenlerindeki (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) bilgilerle yeniden oluşturulur, böylece giriş yapabilirsiniz. Profil sayfasından parolayı değiştirseniz bile bir sonraki silinmede ortam değişkenindeki parola geri gelir.
- Sayfa açık ve ekranda görünürken uygulama her 4 dakikada bir küçük bir istek gönderir. Böylece ders sırasında, sizin veya bir öğrencinin sekmesi açıkken sunucu uyumaz.
- Ders bitince saklamak istediğiniz kodları panelden indirin (ders menüsü → **Zip indir**).
- Her ay 750 ücretsiz saat hakkınız var. Tek bir servis bütün ay açık kalsa bile bu sınırın altında kalır.
- Ücretsiz planda işlemci gücü düşük (0.1 CPU). Özellikle "✨ Biçimlendir" ilk kullanımda birkaç saniye sürebilir.

Veriler kalıcı olsun isterseniz servisi **Starter** plana ($7/ay) yükseltip `/data` yoluna 1 GB disk ($0.25/ay) bağlamanız yeterli. Kodda başka bir değişiklik gerekmez.

## 1. Kodu GitHub'a gönderin

Bu klasörü bir GitHub deposuna gönderin. `.gitignore` dosyası `node_modules`, `.env` ve `data/` klasörlerini zaten dışarıda bırakır; bunları **asla** depoya eklemeyin.

## 2. Servis ayarları (Settings sekmesi)

| Ayar | Değer |
|---|---|
| Language / Runtime | **Docker** |
| Branch | Kodunuzun olduğu dal (ör. `main`) |
| Root Directory | **Boş** (içinde `Dockerfile` olan ana klasör) |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Instance Type | **Free** |
| Region | **Frankfurt** (Türkiye'ye en yakın; sonradan değiştirilemez) |
| Health Check Path | `/api/health` |
| Auto-Deploy | **Off** (her deploy verileri sildiği için dönem içinde elle deploy edin) |
| Start Command / Build Command | **Boş bırakın** (Dockerfile'daki komutlar kullanılır) |

## 3. Ortam değişkenleri (Environment sekmesi)

| Değişken | Değer | Not |
|---|---|---|
| `NODE_ENV` | `production` | Zorunlu |
| `COOKIE_SECRET` | En az 32 karakter rastgele dize | Zorunlu. Panelde "Generate" ile üretebilirsiniz. |
| `ADMIN_EMAIL` | Giriş e-postanız | Zorunlu |
| `ADMIN_PASSWORD` | En az 8 karakter | Zorunlu |
| `ADMIN_NAME` | Adınız | Zorunlu |
| `APP_NAME` | `SafeCodeShare` | İsteğe bağlı |
| `DATA_DIR` | `/data` | İsteğe bağlı (Dockerfile'da zaten var) |
| `VITE_ADSENSE_CLIENT_ID` | `ca-pub-...` | İsteğe bağlı. Boşsa reklam alanı hiç görünmez. |
| `REGISTER_RATE_MAX` | `5` | İsteğe bağlı. Aynı IP'den saatte en fazla kaç kayıt yapılabileceği. |

**Eklemeyin:**
- `PORT`: Render kendisi verir (10000) ve uygulama onu kullanır. Eklediyseniz silmeniz en temizi.
- `DOMAIN`: Sadece Caddy içindir; Render HTTPS'i kendisi sağlar.
- `PUBLIC_URL`: Gerek yok; boşsa Render'ın verdiği `https://...onrender.com` adresi kullanılır. Eklerseniz `https://` ile başlayan tam adres olmalı (ör. `https://safecodeshare.onrender.com`), yoksa uygulama açılmaz.

## 4. Deploy ve kontrol

1. **Manual Deploy → Deploy latest commit**'e basın.
2. **Logs** sekmesinde şu satırları görmelisiniz:
   ```
   [db] migration uygulandı: 001_init
   [db] migration uygulandı: 002_copy_protect
   [seed] admin oluşturuldu: ...
   [server] SafeCodeShare — http://localhost:10000 (production)
   ```
3. `https://<servis-adınız>.onrender.com/api/health` adresi `{"ok":true,...}` döndürmeli.
4. Ana adrese gidip admin bilgilerinizle giriş yapın.
5. Bir kod oluşturun, "Paylaş"tan izleme linkini başka bir tarayıcıda (veya telefonda) açın ve canlı güncellendiğini görün.

## 5. Sık karşılaşılan hatalar

| Belirti | Sebep / Çözüm |
|---|---|
| Logda `Ortam değişkenleri geçersiz` | `COOKIE_SECRET` 32 karakterden kısa, `ADMIN_PASSWORD` 8 karakterden kısa ya da `PUBLIC_URL` tam adres değil (`https://` ile başlamıyor). |
| Logda `Kullanıcı tablosu boş ve ADMIN_EMAIL ... tanımlı değil` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` veya `ADMIN_NAME` eksik. |
| Öğrenciler sabah linke girince "Paylaşım bulunamadı" görüyor | Sunucu gece uyudu ve veriler silindi (ücretsiz planın davranışı). Kodu yeniden oluşturup yeni linki paylaşın. |
| İlk açılış 1 dakika sürüyor | Sunucu uyuyordu. Dersten birkaç dakika önce siteyi açarak uyandırın. |
