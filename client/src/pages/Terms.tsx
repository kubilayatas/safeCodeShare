import Shell from '../components/Shell';

// ÖNEMLİ (site sahibi için): Bu metin genel bir başlangıç taslağıdır, hukuki danışmanlık değildir.
// Siteyi herkese açmadan önce kendi bilgilerinizle (veri sorumlusu adı, iletişim adresi vb.)
// güncelleyin ve gerekirse bir hukukçuya kontrol ettirin.
export default function Terms(): JSX.Element {
  return (
    <Shell narrow>
      <article className="prose">
        <h1>Kullanım koşulları ve gizlilik</h1>
        <p className="muted">Bu metni site yöneticisi kendi bilgileriyle güncellemelidir.</p>

        <h2>Hizmet</h2>
        <p>
          SafeCodeShare, öğretmenlerin derste kod paylaşmasını sağlar. Öğrenciler hesap açmadan,
          öğretmenin verdiği linkle kodu izler.
        </p>

        <h2>Toplanan bilgiler</h2>
        <ul>
          <li>Öğretmen hesabı için: ad, e-posta adresi ve parolanın şifrelenmiş hali.</li>
          <li>Oluşturduğun dersler, konular, kodlar ve kodların sürüm geçmişi.</li>
          <li>Oturumu açık tutmak için bir tarayıcı çerezi. Site yöneticisi reklam gösterimini açarsa reklam sağlayıcısı (Google AdSense) kendi çerezlerini kullanabilir.</li>
          <li>Öğrencilerden hesap bilgisi alınmaz. Öğrencinin seçtiği takma ad yalnızca canlı derste görünür ve saklanmaz.</li>
        </ul>

        <h2>Bilgilerin kullanımı</h2>
        <p>
          Bilgiler yalnızca hizmeti sunmak için kullanılır, üçüncü kişilere satılmaz. Site yöneticisi,
          kötüye kullanımı önlemek için hesapları ve paylaşımları inceleyebilir, askıya alabilir veya silebilir.
        </p>

        <h2>Kurallar</h2>
        <ul>
          <li>Zararlı yazılım, kişisel veri veya telif hakkıyla korunan içerik paylaşma.</li>
          <li>Hizmeti başkalarını rahatsız etmek veya yanıltmak için kullanma.</li>
        </ul>

        <h2>Kopyalama ve AI/OCR koruması hakkında</h2>
        <p>
          Bu korumalar kopyalamayı büyük ölçüde zorlaştırır, ancak hiçbir web sistemi bunu tamamen
          engelleyemez. Korumalar caydırıcıdır; garanti değildir.
        </p>

        <h2>Haklarınız</h2>
        <p>
          Hesabının ve verilerinin silinmesini isteyebilirsin. Bunun için site yöneticisiyle iletişime geç.
        </p>
      </article>
    </Shell>
  );
}
