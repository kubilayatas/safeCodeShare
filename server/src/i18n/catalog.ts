// Sunucu mesajları çeviri tablosu.
// Anahtar: koddaki Türkçe kaynak metin. Değer: dil sırasına göre çeviriler (LANG_ORDER).
// Türkçe için kaynak metin aynen kullanılır. test/i18n.test.ts, koddaki her mesajın
// burada bulunduğunu ve her satırın tam olduğunu doğrular.
import type { LocaleCode } from '@safecodeshare/shared';

export const LANG_ORDER = ['en', 'de', 'fr', 'es', 'it', 'pt-BR', 'ru', 'zh-CN', 'ja', 'ko', 'ar', 'hi', 'id'] as const;
type Row = [string, string, string, string, string, string, string, string, string, string, string, string, string];

export const TABLE: Record<string, Row> = {
  'Abonelik bulunamadı': [
    'Subscription not found',
    'Abonnement nicht gefunden',
    'Abonnement introuvable',
    'Suscripción no encontrada',
    'Abbonamento non trovato',
    'Assinatura não encontrada',
    'Подписка не найдена',
    '未找到订阅',
    'サブスクリプションが見つかりません',
    '구독을 찾을 수 없습니다',
    'لم يتم العثور على الاشتراك',
    'सदस्यता नहीं मिली',
    'Langganan tidak ditemukan'
  ],
  'Bu kullanıcının devam eden bir aboneliği var. Önce Lemon Squeezy panelinden iptal edin.': [
    'This user has an ongoing subscription. Cancel it in Lemon Squeezy first.',
    'Dieser Benutzer hat ein laufendes Abonnement. Kündigen Sie es zuerst in Lemon Squeezy.',
    'Cet utilisateur a un abonnement en cours. Annulez-le d’abord dans Lemon Squeezy.',
    'Este usuario tiene una suscripción activa. Cancélala primero en Lemon Squeezy.',
    'Questo utente ha un abbonamento in corso. Annullalo prima in Lemon Squeezy.',
    'Este usuário tem uma assinatura em andamento. Cancele-a primeiro no Lemon Squeezy.',
    'У этого пользователя действующая подписка. Сначала отмените её в Lemon Squeezy.',
    '该用户仍有进行中的订阅。请先在 Lemon Squeezy 中取消。',
    'このユーザーには継続中のサブスクリプションがあります。先に Lemon Squeezy で解約してください。',
    '이 사용자에게 진행 중인 구독이 있습니다. 먼저 Lemon Squeezy에서 취소하세요.',
    'لدى هذا المستخدم اشتراك جارٍ. ألغِه أولًا من Lemon Squeezy.',
    'इस उपयोगकर्ता की सदस्यता अभी चालू है। पहले Lemon Squeezy में उसे रद्द करें।',
    'Pengguna ini memiliki langganan yang masih berjalan. Batalkan dulu di Lemon Squeezy.'
  ],
  'Geçersiz ödeme dönemi': [
    'Invalid billing period',
    'Ungültiger Abrechnungszeitraum',
    'Période de facturation non valide',
    'Periodo de facturación no válido',
    'Periodo di fatturazione non valido',
    'Período de cobrança inválido',
    'Недопустимый период оплаты',
    '付款周期无效',
    '請求期間が正しくありません',
    '결제 주기가 올바르지 않습니다',
    'فترة الفوترة غير صالحة',
    'अमान्य बिलिंग अवधि',
    'Periode tagihan tidak valid'
  ],
  'Yönetici hesaplarında sınır yoktur; abonelik gerekmez': [
    'Admin accounts have no limits, so they don\'t need a subscription',
    'Administratorkonten haben keine Grenzen und brauchen kein Abonnement',
    'Les comptes administrateur n’ont aucune limite et n’ont pas besoin d’abonnement',
    'Las cuentas de administrador no tienen límites y no necesitan suscripción',
    'Gli account amministratore non hanno limiti e non richiedono un abbonamento',
    'Contas de administrador não têm limites e não precisam de assinatura',
    'У администраторов нет ограничений, подписка не нужна',
    '管理员账户没有限制，无需订阅',
    '管理者アカウントには制限がないため、サブスクリプションは不要です',
    '관리자 계정에는 제한이 없어 구독이 필요하지 않습니다',
    'لا توجد حدود على حسابات المسؤولين، لذا لا تحتاج إلى اشتراك',
    'एडमिन खातों पर कोई सीमा नहीं होती, इसलिए सदस्यता की ज़रूरत नहीं है',
    'Akun admin tidak memiliki batasan, jadi tidak perlu berlangganan'
  ],
  'Zaten etkin bir aboneliğiniz var': [
    'You already have an active subscription',
    'Sie haben bereits ein aktives Abonnement',
    'Vous avez déjà un abonnement actif',
    'Ya tienes una suscripción activa',
    'Hai già un abbonamento attivo',
    'Você já tem uma assinatura ativa',
    'У вас уже есть активная подписка',
    '您已有有效的订阅',
    'すでに有効なサブスクリプションがあります',
    '이미 활성 구독이 있습니다',
    'لديك اشتراك نشط بالفعل',
    'आपकी सदस्यता पहले से सक्रिय है',
    'Anda sudah memiliki langganan aktif'
  ],
  'Ödeme sağlayıcısına şu anda ulaşılamıyor. Lütfen biraz sonra tekrar deneyin.': [
    'The payment provider can\'t be reached right now. Please try again shortly.',
    'Der Zahlungsanbieter ist gerade nicht erreichbar. Bitte versuchen Sie es gleich noch einmal.',
    'Le prestataire de paiement est injoignable pour le moment. Réessayez dans un instant.',
    'No se puede contactar con el proveedor de pagos en este momento. Inténtalo de nuevo en breve.',
    'Il fornitore dei pagamenti non è raggiungibile al momento. Riprova tra poco.',
    'Não foi possível acessar o provedor de pagamento agora. Tente novamente em instantes.',
    'Платёжный сервис сейчас недоступен. Повторите попытку чуть позже.',
    '暂时无法连接支付服务，请稍后再试。',
    '現在、決済サービスに接続できません。しばらくしてからもう一度お試しください。',
    '지금은 결제 서비스에 연결할 수 없습니다. 잠시 후 다시 시도하세요.',
    'تعذّر الوصول إلى مزوّد الدفع حاليًا. حاول مرة أخرى بعد قليل.',
    'भुगतान सेवा से अभी संपर्क नहीं हो पा रहा है। कृपया थोड़ी देर बाद फिर कोशिश करें।',
    'Penyedia pembayaran sedang tidak dapat dihubungi. Coba lagi sebentar lagi.'
  ],
  'Ödeme sistemi henüz yapılandırılmadı': [
    'Payments are not set up yet',
    'Zahlungen sind noch nicht eingerichtet',
    'Les paiements ne sont pas encore configurés',
    'Los pagos aún no están configurados',
    'I pagamenti non sono ancora configurati',
    'Os pagamentos ainda não foram configurados',
    'Оплата ещё не настроена',
    '尚未设置付款功能',
    '支払いはまだ設定されていません',
    '결제가 아직 설정되지 않았습니다',
    'لم يتم إعداد المدفوعات بعد',
    'भुगतान अभी सेट नहीं किया गया है',
    'Pembayaran belum diatur'
  ],
  '"{feature}" özelliği {plan} planınızda yok.': [
    'The "{feature}" feature isn\'t included in the {plan} plan.',
    'Die Funktion „{feature}“ ist im Tarif „{plan}“ nicht enthalten.',
    'La fonctionnalité « {feature} » n’est pas incluse dans l’offre « {plan} ».',
    'La función «{feature}» no está incluida en el plan {plan}.',
    'La funzione «{feature}» non è inclusa nel piano {plan}.',
    'O recurso "{feature}" não está incluído no plano {plan}.',
    'Функция «{feature}» не входит в тариф «{plan}».',
    '“{plan}”方案不包含“{feature}”功能。',
    '「{feature}」は「{plan}」プランに含まれていません。',
    '"{feature}" 기능은 {plan} 플랜에 포함되어 있지 않습니다.',
    'ميزة «{feature}» غير متاحة في خطة «{plan}».',
    '"{feature}" सुविधा "{plan}" प्लान में शामिल नहीं है।',
    'Fitur "{feature}" tidak termasuk dalam paket {plan}.'
  ],
  'AI/OCR koruması': [
    'AI/OCR protection', 'KI/OCR-Schutz', 'Protection IA/OCR', 'Protección IA/OCR', 'Protezione IA/OCR',
    'Proteção IA/OCR', 'Защита от ИИ/OCR', 'AI/OCR 防护', 'AI/OCR 対策', 'AI/OCR 보호', 'حماية من الذكاء الاصطناعي/OCR',
    'AI/OCR सुरक्षा', 'Perlindungan AI/OCR'
  ],
  'AI/OCR koruması için önce kopyalama korumasını açın': [
    'Turn on copy protection before AI/OCR protection',
    'Aktivieren Sie zuerst den Kopierschutz, um den KI/OCR-Schutz zu nutzen',
    'Activez d’abord la protection contre la copie pour utiliser la protection IA/OCR',
    'Activa primero la protección contra copia para usar la protección IA/OCR',
    'Attiva prima la protezione dalla copia per usare la protezione IA/OCR',
    'Ative a proteção contra cópia antes da proteção IA/OCR',
    'Сначала включите защиту от копирования, затем защиту от ИИ/OCR',
    '请先开启防复制保护，再开启 AI/OCR 防护',
    'AI/OCR 対策を使うには、先にコピー防止をオンにしてください',
    'AI/OCR 보호를 사용하려면 먼저 복사 방지를 켜세요',
    'فعّل الحماية من النسخ أولًا قبل حماية الذكاء الاصطناعي/OCR',
    'AI/OCR सुरक्षा से पहले कॉपी सुरक्षा चालू करें',
    'Aktifkan perlindungan salin terlebih dahulu sebelum perlindungan AI/OCR'
  ],
  'Ad en az 2 karakter olmalı': [
    'Name must be at least 2 characters', 'Der Name muss mindestens 2 Zeichen lang sein', 'Le nom doit comporter au moins 2 caractères',
    'El nombre debe tener al menos 2 caracteres', 'Il nome deve avere almeno 2 caratteri', 'O nome deve ter pelo menos 2 caracteres',
    'Имя должно содержать не менее 2 символов', '名称至少需要 2 个字符', '名前は 2 文字以上で入力してください', '이름은 2자 이상이어야 합니다',
    'يجب أن يتكون الاسم من حرفين على الأقل', 'नाम कम से कम 2 अक्षरों का होना चाहिए', 'Nama minimal 2 karakter'
  ],
  'Ad gerekli': [
    'Name is required', 'Name ist erforderlich', 'Le nom est obligatoire', 'El nombre es obligatorio', 'Il nome è obbligatorio',
    'O nome é obrigatório', 'Укажите имя', '请输入名称', '名前を入力してください', '이름을 입력하세요', 'الاسم مطلوب', 'नाम आवश्यक है', 'Nama wajib diisi'
  ],
  'Ad geçersiz': [
    'Invalid name', 'Ungültiger Name', 'Nom non valide', 'Nombre no válido', 'Nome non valido', 'Nome inválido', 'Недопустимое имя',
    '名称无效', '名前が正しくありません', '이름이 올바르지 않습니다', 'الاسم غير صالح', 'नाम अमान्य है', 'Nama tidak valid'
  ],
  'Başka sitelere gömme (iframe)': [
    'Embed on other sites (iframe)', 'Auf anderen Websites einbetten (iframe)', 'Intégration sur d’autres sites (iframe)',
    'Insertar en otros sitios (iframe)', 'Incorporamento in altri siti (iframe)', 'Incorporar em outros sites (iframe)',
    'Встраивание на другие сайты (iframe)', '嵌入到其他网站（iframe）', '他サイトへの埋め込み（iframe）', '다른 사이트에 삽입(iframe)',
    'التضمين في مواقع أخرى (iframe)', 'दूसरी साइटों पर एम्बेड (iframe)', 'Sematkan di situs lain (iframe)'
  ],
  'Başlık gerekli': [
    'Title is required', 'Titel ist erforderlich', 'Le titre est obligatoire', 'El título es obligatorio', 'Il titolo è obbligatorio',
    'O título é obrigatório', 'Укажите название', '请输入标题', 'タイトルを入力してください', '제목을 입력하세요', 'العنوان مطلوب',
    'शीर्षक आवश्यक है', 'Judul wajib diisi'
  ],
  'Başlık gerekli ve en fazla 80 karakter olmalı': [
    'A title is required and can be at most 80 characters', 'Ein Titel ist erforderlich (höchstens 80 Zeichen)',
    'Un titre est obligatoire (80 caractères maximum)', 'El título es obligatorio y puede tener hasta 80 caracteres',
    'Il titolo è obbligatorio e può avere al massimo 80 caratteri', 'O título é obrigatório e pode ter no máximo 80 caracteres',
    'Укажите название (не более 80 символов)', '标题为必填项，最多 80 个字符', 'タイトルは必須で、80 文字以内です', '제목은 필수이며 최대 80자입니다',
    'العنوان مطلوب ويجب ألا يتجاوز 80 حرفًا', 'शीर्षक आवश्यक है और अधिकतम 80 अक्षरों का हो सकता है', 'Judul wajib diisi, maksimal 80 karakter'
  ],
  'Biçimlendirici bulunamadı': [
    'No formatter found', 'Kein Formatierer gefunden', 'Aucun formateur trouvé', 'No se encontró un formateador', 'Nessun formattatore trovato',
    'Nenhum formatador encontrado', 'Средство форматирования не найдено', '未找到格式化工具', 'フォーマッターが見つかりません', '포매터를 찾을 수 없습니다',
    'لم يتم العثور على أداة تنسيق', 'फ़ॉर्मैटर नहीं मिला', 'Pemformat tidak ditemukan'
  ],
  'Biçimlendirme başarısız': [
    'Formatting failed', 'Formatierung fehlgeschlagen', 'Échec de la mise en forme', 'No se pudo formatear', 'Formattazione non riuscita',
    'Falha na formatação', 'Не удалось отформатировать', '格式化失败', '整形に失敗しました', '서식 지정에 실패했습니다', 'فشل التنسيق',
    'फ़ॉर्मैटिंग विफल रही', 'Pemformatan gagal'
  ],
  'Biçimlendirme boş sonuç döndürdü': [
    'Formatting returned an empty result', 'Die Formatierung lieferte ein leeres Ergebnis', 'La mise en forme a renvoyé un résultat vide',
    'El formateo devolvió un resultado vacío', 'La formattazione ha restituito un risultato vuoto', 'A formatação retornou um resultado vazio',
    'Форматирование вернуло пустой результат', '格式化返回了空结果', '整形結果が空でした', '서식 지정 결과가 비어 있습니다',
    'أعاد التنسيق نتيجة فارغة', 'फ़ॉर्मैटिंग का परिणाम खाली रहा', 'Pemformatan menghasilkan hasil kosong'
  ],
  'Biçimlendirme hatası': [
    'Formatting error', 'Formatierungsfehler', 'Erreur de mise en forme', 'Error de formato', 'Errore di formattazione', 'Erro de formatação',
    'Ошибка форматирования', '格式化错误', '整形エラー', '서식 지정 오류', 'خطأ في التنسيق', 'फ़ॉर्मैटिंग त्रुटि', 'Kesalahan pemformatan'
  ],
  'Bu bağlantıdan çok fazla kayıt denemesi yapıldı. Bir saat sonra tekrar deneyin.': [
    'Too many sign-up attempts from this connection. Try again in an hour.',
    'Zu viele Registrierungsversuche von dieser Verbindung. Versuchen Sie es in einer Stunde erneut.',
    'Trop de tentatives d’inscription depuis cette connexion. Réessayez dans une heure.',
    'Demasiados intentos de registro desde esta conexión. Inténtalo de nuevo en una hora.',
    'Troppi tentativi di registrazione da questa connessione. Riprova tra un’ora.',
    'Muitas tentativas de cadastro a partir desta conexão. Tente novamente em uma hora.',
    'Слишком много попыток регистрации с этого подключения. Повторите через час.',
    '此网络的注册尝试次数过多，请一小时后再试。',
    'この接続からの登録の試行回数が多すぎます。1 時間後にもう一度お試しください。',
    '이 연결에서 가입 시도가 너무 많습니다. 1시간 후에 다시 시도하세요.',
    'محاولات تسجيل كثيرة جدًا من هذا الاتصال. حاول مرة أخرى بعد ساعة.',
    'इस कनेक्शन से साइन-अप के बहुत अधिक प्रयास हुए। एक घंटे बाद फिर कोशिश करें।',
    'Terlalu banyak percobaan pendaftaran dari koneksi ini. Coba lagi dalam satu jam.'
  ],
  'Bu ders sayfası kapalı': [
    'This course page is closed', 'Diese Kursseite ist geschlossen', 'Cette page de cours est fermée', 'Esta página del curso está cerrada',
    'Questa pagina del corso è chiusa', 'Esta página do curso está fechada', 'Страница курса закрыта', '此课程页面已关闭', 'このコースページは閉じられています',
    '이 강의 페이지는 닫혀 있습니다', 'صفحة الدورة هذه مغلقة', 'यह कोर्स पेज बंद है', 'Halaman kursus ini ditutup'
  ],
  'Bu ders sayfası şu anda kullanılamıyor': [
    'This course page is currently unavailable', 'Diese Kursseite ist derzeit nicht verfügbar', 'Cette page de cours est actuellement indisponible',
    'Esta página del curso no está disponible en este momento', 'Questa pagina del corso al momento non è disponibile',
    'Esta página do curso não está disponível no momento', 'Страница курса сейчас недоступна', '此课程页面暂时不可用', 'このコースページは現在利用できません',
    '이 강의 페이지는 현재 사용할 수 없습니다', 'صفحة الدورة هذه غير متاحة حاليًا', 'यह कोर्स पेज अभी उपलब्ध नहीं है', 'Halaman kursus ini sedang tidak tersedia'
  ],
  'Bu derse erişim yetkiniz yok': [
    "You don't have access to this course", 'Sie haben keinen Zugriff auf diesen Kurs', 'Vous n’avez pas accès à ce cours', 'No tienes acceso a este curso',
    'Non hai accesso a questo corso', 'Você não tem acesso a este curso', 'У вас нет доступа к этому курсу', '您无权访问此课程', 'このコースへのアクセス権がありません',
    '이 강의에 접근할 권한이 없습니다', 'ليست لديك صلاحية الوصول إلى هذه الدورة', 'आपके पास इस कोर्स की पहुँच नहीं है', 'Anda tidak memiliki akses ke kursus ini'
  ],
  'Bu dil için biçimlendirme desteklenmiyor': [
    "Formatting isn't supported for this language", 'Für diese Sprache wird keine Formatierung unterstützt', 'La mise en forme n’est pas prise en charge pour ce langage',
    'El formateo no está disponible para este lenguaje', 'La formattazione non è supportata per questo linguaggio', 'A formatação não é compatível com esta linguagem',
    'Для этого языка форматирование не поддерживается', '此语言不支持格式化', 'この言語は整形に対応していません', '이 언어는 서식 지정을 지원하지 않습니다',
    'التنسيق غير مدعوم لهذه اللغة', 'इस भाषा के लिए फ़ॉर्मैटिंग उपलब्ध नहीं है', 'Pemformatan tidak didukung untuk bahasa ini'
  ],
  'Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.': [
    'An account with this email already exists. Try logging in.', 'Mit dieser E-Mail-Adresse gibt es bereits ein Konto. Melden Sie sich an.',
    'Un compte existe déjà avec cette adresse e-mail. Essayez de vous connecter.', 'Ya existe una cuenta con este correo. Prueba a iniciar sesión.',
    'Esiste già un account con questa email. Prova ad accedere.', 'Já existe uma conta com este e-mail. Tente entrar.',
    'Аккаунт с этим адресом уже существует. Попробуйте войти.', '该邮箱已注册账户，请尝试登录。', 'このメールアドレスのアカウントは既にあります。ログインしてください。',
    '이 이메일로 된 계정이 이미 있습니다. 로그인해 보세요.', 'يوجد حساب بهذا البريد الإلكتروني بالفعل. جرّب تسجيل الدخول.',
    'इस ईमेल से पहले से एक खाता है। लॉग इन करके देखें।', 'Akun dengan email ini sudah ada. Coba masuk.'
  ],
  'Bu e-posta zaten kayıtlı': [
    'This email is already registered', 'Diese E-Mail-Adresse ist bereits registriert', 'Cette adresse e-mail est déjà enregistrée',
    'Este correo ya está registrado', 'Questa email è già registrata', 'Este e-mail já está cadastrado', 'Этот адрес уже зарегистрирован',
    '该邮箱已注册', 'このメールアドレスは既に登録されています', '이미 등록된 이메일입니다', 'هذا البريد الإلكتروني مسجل بالفعل', 'यह ईमेल पहले से पंजीकृत है',
    'Email ini sudah terdaftar'
  ],
  'Bu edit token geçerli değil': [
    "This edit link isn't valid", 'Dieser Bearbeitungslink ist ungültig', 'Ce lien de modification n’est pas valide', 'Este enlace de edición no es válido',
    'Questo link di modifica non è valido', 'Este link de edição não é válido', 'Ссылка для редактирования недействительна', '此编辑链接无效',
    'この編集リンクは無効です', '이 편집 링크는 유효하지 않습니다', 'رابط التحرير هذا غير صالح', 'यह संपादन लिंक मान्य नहीं है', 'Tautan edit ini tidak valid'
  ],
  'Bu işlem için yetkiniz yok': [
    "You don't have permission to do this", 'Dazu fehlt Ihnen die Berechtigung', 'Vous n’avez pas l’autorisation de faire cela', 'No tienes permiso para hacer esto',
    'Non hai l’autorizzazione per farlo', 'Você não tem permissão para fazer isso', 'У вас нет прав на это действие', '您无权执行此操作', 'この操作を行う権限がありません',
    '이 작업을 할 권한이 없습니다', 'ليست لديك صلاحية لهذا الإجراء', 'आपको यह करने की अनुमति नहीं है', 'Anda tidak memiliki izin untuk melakukan ini'
  ],
  'Bu kod henüz yayınlanmadı': [
    "This code hasn't been published yet", 'Dieser Code ist noch nicht veröffentlicht', 'Ce code n’est pas encore publié', 'Este código aún no se ha publicado',
    'Questo codice non è ancora stato pubblicato', 'Este código ainda não foi publicado', 'Этот код ещё не опубликован', '此代码尚未发布', 'このコードはまだ公開されていません',
    '이 코드는 아직 공개되지 않았습니다', 'لم يُنشر هذا الكود بعد', 'यह कोड अभी प्रकाशित नहीं हुआ है', 'Kode ini belum dipublikasikan'
  ],
  'Bu kod kopyalamaya kapalıdır': [
    'This code is copy-protected', 'Dieser Code ist kopiergeschützt', 'Ce code est protégé contre la copie', 'Este código está protegido contra copia',
    'Questo codice è protetto dalla copia', 'Este código está protegido contra cópia', 'Этот код защищён от копирования', '此代码受防复制保护', 'このコードはコピーできません',
    '이 코드는 복사할 수 없습니다', 'هذا الكود محمي من النسخ', 'यह कोड कॉपी-सुरक्षित है', 'Kode ini dilindungi dari penyalinan'
  ],
  'Bu koda erişim yetkiniz yok': [
    "You don't have access to this snippet", 'Sie haben keinen Zugriff auf dieses Snippet', 'Vous n’avez pas accès à cet extrait', 'No tienes acceso a este fragmento',
    'Non hai accesso a questo snippet', 'Você não tem acesso a este trecho', 'У вас нет доступа к этому фрагменту', '您无权访问此代码片段', 'このスニペットへのアクセス権がありません',
    '이 스니펫에 접근할 권한이 없습니다', 'ليست لديك صلاحية الوصول إلى هذا المقطع', 'आपके पास इस स्निपेट की पहुँच नहीं है', 'Anda tidak memiliki akses ke cuplikan ini'
  ],
  'Bu konuya erişim yetkiniz yok': [
    "You don't have access to this topic", 'Sie haben keinen Zugriff auf dieses Thema', 'Vous n’avez pas accès à ce thème', 'No tienes acceso a este tema',
    'Non hai accesso a questo argomento', 'Você não tem acesso a este tópico', 'У вас нет доступа к этой теме', '您无权访问此主题', 'このトピックへのアクセス権がありません',
    '이 주제에 접근할 권한이 없습니다', 'ليست لديك صلاحية الوصول إلى هذا الموضوع', 'आपके पास इस विषय की पहुँच नहीं है', 'Anda tidak memiliki akses ke topik ini'
  ],
  'Bu payda kopyalama koruması kapalı; normal görüntüleyiciyi kullanın': [
    'Copy protection is off for this snippet; use the regular viewer', 'Für dieses Snippet ist der Kopierschutz aus; nutzen Sie die normale Ansicht',
    'La protection contre la copie est désactivée pour cet extrait ; utilisez l’affichage normal', 'La protección contra copia está desactivada; usa el visor normal',
    'La protezione dalla copia è disattivata; usa il visualizzatore normale', 'A proteção contra cópia está desativada; use o visualizador normal',
    'Защита от копирования для этого фрагмента выключена; используйте обычный просмотр', '此代码片段未开启防复制保护，请使用普通查看器',
    'このスニペットはコピー防止がオフです。通常のビューアーを使ってください', '이 스니펫은 복사 방지가 꺼져 있습니다. 일반 뷰어를 사용하세요',
    'الحماية من النسخ معطّلة لهذا المقطع؛ استخدم العارض العادي', 'इस स्निपेट के लिए कॉपी सुरक्षा बंद है; सामान्य व्यूअर इस्तेमाल करें',
    'Perlindungan salin nonaktif untuk cuplikan ini; gunakan penampil biasa'
  ],
  'Bu paylaşım kapalı': [
    'This share is turned off', 'Diese Freigabe ist deaktiviert', 'Ce partage est désactivé', 'Este enlace está desactivado', 'Questa condivisione è disattivata',
    'Este compartilhamento está desativado', 'Доступ по этой ссылке отключён', '此分享已关闭', 'この共有はオフになっています', '이 공유는 꺼져 있습니다',
    'هذه المشاركة متوقفة', 'यह शेयर बंद है', 'Berbagi ini dinonaktifkan'
  ],
  'Bu paylaşım şifreli değil': [
    "This share isn't password protected", 'Diese Freigabe ist nicht passwortgeschützt', 'Ce partage n’est pas protégé par mot de passe',
    'Este enlace no está protegido con contraseña', 'Questa condivisione non è protetta da password', 'Este compartilhamento não é protegido por senha',
    'Эта ссылка не защищена паролем', '此分享未设置密码', 'この共有にはパスワードが設定されていません', '이 공유에는 비밀번호가 없습니다',
    'هذه المشاركة غير محمية بكلمة مرور', 'यह शेयर पासवर्ड से सुरक्षित नहीं है', 'Berbagi ini tidak dilindungi kata sandi'
  ],
  'Bu paylaşım şu anda kullanılamıyor': [
    'This share is currently unavailable', 'Diese Freigabe ist derzeit nicht verfügbar', 'Ce partage est actuellement indisponible',
    'Este enlace no está disponible en este momento', 'Questa condivisione al momento non è disponibile', 'Este compartilhamento não está disponível no momento',
    'Эта ссылка сейчас недоступна', '此分享暂时不可用', 'この共有は現在利用できません', '이 공유는 현재 사용할 수 없습니다', 'هذه المشاركة غير متاحة حاليًا',
    'यह शेयर अभी उपलब्ध नहीं है', 'Berbagi ini sedang tidak tersedia'
  ],
  'Bu paylaşıma erişilemiyor': [
    "This share can't be opened", 'Diese Freigabe kann nicht geöffnet werden', 'Impossible d’ouvrir ce partage', 'No se puede abrir este enlace',
    'Impossibile aprire questa condivisione', 'Não é possível abrir este compartilhamento', 'Не удаётся открыть эту ссылку', '无法打开此分享', 'この共有を開けません',
    '이 공유를 열 수 없습니다', 'لا يمكن فتح هذه المشاركة', 'यह शेयर नहीं खोला जा सकता', 'Berbagi ini tidak dapat dibuka'
  ],
  'Bu paylaşımın süresi doldu': [
    'This share has expired', 'Diese Freigabe ist abgelaufen', 'Ce partage a expiré', 'Este enlace ha caducado', 'Questa condivisione è scaduta',
    'Este compartilhamento expirou', 'Срок действия ссылки истёк', '此分享已过期', 'この共有は期限切れです', '이 공유는 만료되었습니다', 'انتهت صلاحية هذه المشاركة',
    'इस शेयर की समय सीमा समाप्त हो गई है', 'Berbagi ini sudah kedaluwarsa'
  ],
  'Bulunamadı': [
    'Not found', 'Nicht gefunden', 'Introuvable', 'No encontrado', 'Non trovato', 'Não encontrado', 'Не найдено', '未找到', '見つかりません', '찾을 수 없습니다',
    'غير موجود', 'नहीं मिला', 'Tidak ditemukan'
  ],
  'C/C++ biçimlendirme hatası': [
    'C/C++ formatting error', 'C/C++-Formatierungsfehler', 'Erreur de mise en forme C/C++', 'Error de formato de C/C++', 'Errore di formattazione C/C++',
    'Erro de formatação C/C++', 'Ошибка форматирования C/C++', 'C/C++ 格式化错误', 'C/C++ の整形エラー', 'C/C++ 서식 지정 오류', 'خطأ في تنسيق C/C++',
    'C/C++ फ़ॉर्मैटिंग त्रुटि', 'Kesalahan pemformatan C/C++'
  ],
  'Content-Type application/json olmalı': [
    'Content-Type must be application/json', 'Content-Type muss application/json sein', 'Le Content-Type doit être application/json',
    'El Content-Type debe ser application/json', 'Il Content-Type deve essere application/json', 'O Content-Type deve ser application/json',
    'Content-Type должен быть application/json', 'Content-Type 必须为 application/json', 'Content-Type は application/json である必要があります',
    'Content-Type은 application/json이어야 합니다', 'يجب أن يكون Content-Type ‏application/json', 'Content-Type application/json होना चाहिए',
    'Content-Type harus application/json'
  ],
  'Ders bulunamadı': [
    'Course not found', 'Kurs nicht gefunden', 'Cours introuvable', 'Curso no encontrado', 'Corso non trovato', 'Curso não encontrado', 'Курс не найден',
    '未找到课程', 'コースが見つかりません', '강의를 찾을 수 없습니다', 'لم يتم العثور على الدورة', 'कोर्स नहीं मिला', 'Kursus tidak ditemukan'
  ],
  'Dersi zip olarak indirme': [
    'Download a course as a zip', 'Kurs als ZIP herunterladen', 'Téléchargement d’un cours en zip', 'Descargar un curso en zip', 'Download di un corso in zip',
    'Baixar um curso em zip', 'Скачивание курса в ZIP', '以 zip 下载课程', 'コースを zip でダウンロード', '강의를 zip으로 다운로드', 'تنزيل الدورة كملف zip',
    'कोर्स को zip में डाउनलोड करना', 'Unduh kursus sebagai zip'
  ],
  'Düzenleme kapalı': [
    'Editing is turned off', 'Bearbeitung ist deaktiviert', 'La modification est désactivée', 'La edición está desactivada', 'La modifica è disattivata',
    'A edição está desativada', 'Редактирование отключено', '编辑已关闭', '編集はオフになっています', '편집이 꺼져 있습니다', 'التحرير متوقف', 'संपादन बंद है',
    'Pengeditan dinonaktifkan'
  ],
  'E-posta veya parola geçersiz': [
    'Invalid email or password', 'Ungültige E-Mail-Adresse oder ungültiges Passwort', 'Adresse e-mail ou mot de passe non valide',
    'Correo o contraseña no válidos', 'Email o password non validi', 'E-mail ou senha inválidos', 'Неверный адрес почты или пароль', '邮箱或密码无效',
    'メールアドレスまたはパスワードが正しくありません', '이메일 또는 비밀번호가 올바르지 않습니다', 'البريد الإلكتروني أو كلمة المرور غير صالحة',
    'ईमेल या पासवर्ड अमान्य है', 'Email atau kata sandi tidak valid'
  ],
  'E-posta veya parola hatalı': [
    'Wrong email or password', 'E-Mail-Adresse oder Passwort ist falsch', 'Adresse e-mail ou mot de passe incorrect', 'Correo o contraseña incorrectos',
    'Email o password errati', 'E-mail ou senha incorretos', 'Неправильный адрес почты или пароль', '邮箱或密码错误', 'メールアドレスまたはパスワードが違います',
    '이메일 또는 비밀번호가 틀렸습니다', 'البريد الإلكتروني أو كلمة المرور غير صحيحة', 'ईमेल या पासवर्ड गलत है', 'Email atau kata sandi salah'
  ],
  'Edit token bu koda ait değil': [
    "This edit link doesn't belong to this snippet", 'Dieser Bearbeitungslink gehört nicht zu diesem Snippet', 'Ce lien de modification ne correspond pas à cet extrait',
    'Este enlace de edición no corresponde a este fragmento', 'Questo link di modifica non appartiene a questo snippet', 'Este link de edição não pertence a este trecho',
    'Эта ссылка для редактирования не относится к этому фрагменту', '此编辑链接不属于该代码片段', 'この編集リンクはこのスニペットのものではありません',
    '이 편집 링크는 이 스니펫의 것이 아닙니다', 'رابط التحرير هذا لا يخص هذا المقطع', 'यह संपादन लिंक इस स्निपेट का नहीं है', 'Tautan edit ini bukan untuk cuplikan ini'
  ],
  'Erişim yok': [
    'No access', 'Kein Zugriff', 'Accès refusé', 'Sin acceso', 'Accesso negato', 'Sem acesso', 'Нет доступа', '无访问权限', 'アクセスできません', '접근 권한 없음',
    'لا توجد صلاحية وصول', 'पहुँच नहीं है', 'Tidak ada akses'
  ],
  'Geri yükleme öncesi': [
    'Before restore', 'Vor der Wiederherstellung', 'Avant restauration', 'Antes de restaurar', 'Prima del ripristino', 'Antes de restaurar',
    'До восстановления', '恢复前', '復元前', '복원 전', 'قبل الاستعادة', 'पुनर्स्थापना से पहले', 'Sebelum pemulihan'
  ],
  'Geçerli bir e-posta girin': [
    'Enter a valid email address', 'Geben Sie eine gültige E-Mail-Adresse ein', 'Saisissez une adresse e-mail valide', 'Introduce un correo válido',
    'Inserisci un’email valida', 'Digite um e-mail válido', 'Введите корректный адрес почты', '请输入有效的邮箱地址', '有効なメールアドレスを入力してください',
    '올바른 이메일 주소를 입력하세요', 'أدخل بريدًا إلكترونيًا صالحًا', 'मान्य ईमेल पता दर्ज करें', 'Masukkan alamat email yang valid'
  ],
  'Geçersiz alanlar': [
    'Invalid fields', 'Ungültige Felder', 'Champs non valides', 'Campos no válidos', 'Campi non validi', 'Campos inválidos', 'Недопустимые поля', '字段无效',
    '入力内容が正しくありません', '입력값이 올바르지 않습니다', 'حقول غير صالحة', 'अमान्य फ़ील्ड', 'Isian tidak valid'
  ],
  'Geçersiz ayar': [
    'Invalid setting', 'Ungültige Einstellung', 'Paramètre non valide', 'Ajuste no válido', 'Impostazione non valida', 'Configuração inválida',
    'Недопустимая настройка', '设置无效', '設定が正しくありません', '설정이 올바르지 않습니다', 'إعداد غير صالح', 'अमान्य सेटिंग', 'Pengaturan tidak valid'
  ],
  'Geçersiz biçimlendirme isteği': [
    'Invalid formatting request', 'Ungültige Formatierungsanfrage', 'Demande de mise en forme non valide', 'Solicitud de formato no válida',
    'Richiesta di formattazione non valida', 'Solicitação de formatação inválida', 'Недопустимый запрос на форматирование', '格式化请求无效',
    '整形リクエストが正しくありません', '서식 지정 요청이 올바르지 않습니다', 'طلب تنسيق غير صالح', 'अमान्य फ़ॉर्मैटिंग अनुरोध', 'Permintaan pemformatan tidak valid'
  ],
  'Geçersiz etiket': [
    'Invalid label', 'Ungültige Bezeichnung', 'Libellé non valide', 'Etiqueta no válida', 'Etichetta non valida', 'Rótulo inválido', 'Недопустимая метка',
    '标签无效', 'ラベルが正しくありません', '레이블이 올바르지 않습니다', 'تسمية غير صالحة', 'अमान्य लेबल', 'Label tidak valid'
  ],
  'Geçersiz kayıt bilgisi': [
    'Invalid sign-up details', 'Ungültige Registrierungsangaben', 'Informations d’inscription non valides', 'Datos de registro no válidos',
    'Dati di registrazione non validi', 'Dados de cadastro inválidos', 'Недопустимые данные регистрации', '注册信息无效', '登録情報が正しくありません',
    '가입 정보가 올바르지 않습니다', 'بيانات التسجيل غير صالحة', 'अमान्य साइन-अप विवरण', 'Data pendaftaran tidak valid'
  ],
  'Geçersiz kod bilgisi': [
    'Invalid snippet details', 'Ungültige Snippet-Angaben', 'Informations d’extrait non valides', 'Datos del fragmento no válidos',
    'Dati dello snippet non validi', 'Dados do trecho inválidos', 'Недопустимые данные фрагмента', '代码片段信息无效', 'スニペットの情報が正しくありません',
    '스니펫 정보가 올바르지 않습니다', 'بيانات المقطع غير صالحة', 'अमान्य स्निपेट विवरण', 'Data cuplikan tidak valid'
  ],
  'Geçersiz kullanıcı bilgisi': [
    'Invalid user details', 'Ungültige Benutzerangaben', 'Informations utilisateur non valides', 'Datos de usuario no válidos', 'Dati utente non validi',
    'Dados de usuário inválidos', 'Недопустимые данные пользователя', '用户信息无效', 'ユーザー情報が正しくありません', '사용자 정보가 올바르지 않습니다',
    'بيانات المستخدم غير صالحة', 'अमान्य उपयोगकर्ता विवरण', 'Data pengguna tidak valid'
  ],
  'Geçersiz sürüm id': [
    'Invalid version ID', 'Ungültige Versions-ID', 'Identifiant de version non valide', 'ID de versión no válido', 'ID versione non valido',
    'ID de versão inválido', 'Недопустимый ID версии', '版本 ID 无效', 'バージョン ID が正しくありません', '버전 ID가 올바르지 않습니다', 'معرّف إصدار غير صالح',
    'अमान्य संस्करण ID', 'ID versi tidak valid'
  ],
  'Geçersiz sıralama isteği': [
    'Invalid reorder request', 'Ungültige Sortieranfrage', 'Demande de réorganisation non valide', 'Solicitud de reordenación no válida',
    'Richiesta di riordino non valida', 'Solicitação de reordenação inválida', 'Недопустимый запрос на сортировку', '排序请求无效', '並べ替えリクエストが正しくありません',
    '정렬 요청이 올바르지 않습니다', 'طلب ترتيب غير صالح', 'अमान्य क्रम अनुरोध', 'Permintaan pengurutan tidak valid'
  ],
  'Giriş yapmalı veya geçerli edit token sağlamalısınız': [
    'Log in or use a valid edit link', 'Melden Sie sich an oder verwenden Sie einen gültigen Bearbeitungslink',
    'Connectez-vous ou utilisez un lien de modification valide', 'Inicia sesión o usa un enlace de edición válido',
    'Accedi o usa un link di modifica valido', 'Entre ou use um link de edição válido', 'Войдите или используйте действующую ссылку для редактирования',
    '请登录或使用有效的编辑链接', 'ログインするか、有効な編集リンクを使ってください', '로그인하거나 유효한 편집 링크를 사용하세요',
    'سجّل الدخول أو استخدم رابط تحرير صالحًا', 'लॉग इन करें या मान्य संपादन लिंक का उपयोग करें', 'Masuk atau gunakan tautan edit yang valid'
  ],
  'Giriş yapmalısınız': [
    'You need to log in', 'Sie müssen sich anmelden', 'Vous devez vous connecter', 'Debes iniciar sesión', 'Devi accedere', 'Você precisa entrar',
    'Необходимо войти', '请先登录', 'ログインしてください', '로그인해야 합니다', 'يجب تسجيل الدخول', 'आपको लॉग इन करना होगा', 'Anda perlu masuk'
  ],
  'Go biçimlendirme hatası': [
    'Go formatting error', 'Go-Formatierungsfehler', 'Erreur de mise en forme Go', 'Error de formato de Go', 'Errore di formattazione Go',
    'Erro de formatação Go', 'Ошибка форматирования Go', 'Go 格式化错误', 'Go の整形エラー', 'Go 서식 지정 오류', 'خطأ في تنسيق Go', 'Go फ़ॉर्मैटिंग त्रुटि',
    'Kesalahan pemformatan Go'
  ],
  'Hesabınız askıya alınmış. Site yöneticisiyle iletişime geçin.': [
    'Your account has been suspended. Contact the site admin.', 'Ihr Konto wurde gesperrt. Wenden Sie sich an den Website-Administrator.',
    'Votre compte a été suspendu. Contactez l’administrateur du site.', 'Tu cuenta está suspendida. Contacta con el administrador del sitio.',
    'Il tuo account è stato sospeso. Contatta l’amministratore del sito.', 'Sua conta foi suspensa. Entre em contato com o administrador do site.',
    'Ваш аккаунт заблокирован. Обратитесь к администратору сайта.', '您的账户已被停用，请联系网站管理员。', 'アカウントが停止されています。サイト管理者に連絡してください。',
    '계정이 정지되었습니다. 사이트 관리자에게 문의하세요.', 'تم تعليق حسابك. تواصل مع مسؤول الموقع.', 'आपका खाता निलंबित है। साइट व्यवस्थापक से संपर्क करें।',
    'Akun Anda ditangguhkan. Hubungi admin situs.'
  ],
  'Kayıt tamamlanamadı': [
    "Couldn't complete sign-up", 'Registrierung nicht möglich', 'Impossible de finaliser l’inscription', 'No se pudo completar el registro',
    'Impossibile completare la registrazione', 'Não foi possível concluir o cadastro', 'Не удалось завершить регистрацию', '无法完成注册', '登録を完了できませんでした',
    '가입을 완료할 수 없습니다', 'تعذّر إكمال التسجيل', 'साइन-अप पूरा नहीं हो सका', 'Pendaftaran tidak dapat diselesaikan'
  ],
  'Kendi yönetici yetkinizi kaldıramaz veya kendinizi askıya alamazsınız': [
    "You can't remove your own admin role or suspend yourself", 'Sie können sich nicht selbst die Admin-Rolle entziehen oder sich sperren',
    'Vous ne pouvez pas retirer votre propre rôle d’administrateur ni vous suspendre', 'No puedes quitarte el rol de administrador ni suspenderte',
    'Non puoi rimuovere il tuo ruolo di amministratore né sospenderti', 'Você não pode remover sua própria função de administrador nem se suspender',
    'Нельзя снять с себя роль администратора или заблокировать себя', '不能移除自己的管理员角色或停用自己', '自分の管理者権限を外したり、自分を停止したりすることはできません',
    '자신의 관리자 역할을 해제하거나 자신을 정지할 수 없습니다', 'لا يمكنك إزالة دور المسؤول عن نفسك أو تعليق حسابك', 'आप अपनी व्यवस्थापक भूमिका नहीं हटा सकते या खुद को निलंबित नहीं कर सकते',
    'Anda tidak dapat menghapus peran admin sendiri atau menangguhkan diri sendiri'
  ],
  'Kendinizi silemezsiniz': [
    "You can't delete yourself", 'Sie können sich nicht selbst löschen', 'Vous ne pouvez pas vous supprimer', 'No puedes eliminarte a ti mismo',
    'Non puoi eliminare te stesso', 'Você não pode excluir a si mesmo', 'Нельзя удалить самого себя', '不能删除自己', '自分自身は削除できません',
    '자신을 삭제할 수 없습니다', 'لا يمكنك حذف نفسك', 'आप खुद को नहीं हटा सकते', 'Anda tidak dapat menghapus diri sendiri'
  ],
  'Kod 1 MB sınırını aşıyor': [
    'The code exceeds the 1 MB limit', 'Der Code überschreitet die Grenze von 1 MB', 'Le code dépasse la limite de 1 Mo', 'El código supera el límite de 1 MB',
    'Il codice supera il limite di 1 MB', 'O código excede o limite de 1 MB', 'Код превышает лимит 1 МБ', '代码超过 1 MB 限制', 'コードが 1 MB の上限を超えています',
    '코드가 1MB 제한을 초과합니다', 'يتجاوز الكود حد 1 ميغابايت', 'कोड 1 MB की सीमा से अधिक है', 'Kode melebihi batas 1 MB'
  ],
  'Kod biçimlendirme (✨ Biçimlendir)': [
    'Code formatting (✨ Format)', 'Code-Formatierung (✨ Formatieren)', 'Mise en forme du code (✨ Formater)', 'Formateo de código (✨ Formatear)',
    'Formattazione del codice (✨ Formatta)', 'Formatação de código (✨ Formatar)', 'Форматирование кода (✨ Форматировать)', '代码格式化（✨ 格式化）',
    'コード整形（✨ 整形）', '코드 서식(✨ 서식 지정)', 'تنسيق الكود (✨ تنسيق)', 'कोड फ़ॉर्मैटिंग (✨ फ़ॉर्मैट)', 'Pemformatan kode (✨ Format)'
  ],
  'Kod biçimlendirme bu planda yok.': [
    "Code formatting isn't included in this plan.", 'Code-Formatierung ist in diesem Tarif nicht enthalten.', 'La mise en forme du code n’est pas incluse dans cette offre.',
    'El formateo de código no está incluido en este plan.', 'La formattazione del codice non è inclusa in questo piano.',
    'A formatação de código não está incluída neste plano.', 'Форматирование кода не входит в этот тариф.', '此方案不包含代码格式化。',
    'このプランにはコード整形が含まれていません。', '이 플랜에는 코드 서식 지정이 포함되어 있지 않습니다.', 'تنسيق الكود غير متاح في هذه الخطة.',
    'इस प्लान में कोड फ़ॉर्मैटिंग शामिल नहीं है।', 'Pemformatan kode tidak termasuk dalam paket ini.'
  ],
  'Kod bulunamadı': [
    'Snippet not found', 'Snippet nicht gefunden', 'Extrait introuvable', 'Fragmento no encontrado', 'Snippet non trovato', 'Trecho não encontrado',
    'Фрагмент не найден', '未找到代码片段', 'スニペットが見つかりません', '스니펫을 찾을 수 없습니다', 'لم يتم العثور على المقطع', 'स्निपेट नहीं मिला',
    'Cuplikan tidak ditemukan'
  ],
  'Konu bulunamadı': [
    'Topic not found', 'Thema nicht gefunden', 'Thème introuvable', 'Tema no encontrado', 'Argomento non trovato', 'Tópico não encontrado', 'Тема не найдена',
    '未找到主题', 'トピックが見つかりません', '주제를 찾을 수 없습니다', 'لم يتم العثور على الموضوع', 'विषय नहीं मिला', 'Topik tidak ditemukan'
  ],
  'Konu ile ders uyuşmuyor': [
    "The topic doesn't belong to that course", 'Das Thema gehört nicht zu diesem Kurs', 'Ce thème n’appartient pas à ce cours', 'El tema no pertenece a ese curso',
    'L’argomento non appartiene a quel corso', 'O tópico não pertence a esse curso', 'Тема не относится к этому курсу', '该主题不属于此课程',
    'このトピックはそのコースに属していません', '이 주제는 해당 강의에 속하지 않습니다', 'الموضوع لا ينتمي إلى هذه الدورة', 'यह विषय उस कोर्स का नहीं है',
    'Topik tidak termasuk dalam kursus itu'
  ],
  'Kopyalama koruması': [
    'Copy protection', 'Kopierschutz', 'Protection contre la copie', 'Protección contra copia', 'Protezione dalla copia', 'Proteção contra cópia',
    'Защита от копирования', '防复制保护', 'コピー防止', '복사 방지', 'الحماية من النسخ', 'कॉपी सुरक्षा', 'Perlindungan salin'
  ],
  'Kullanıcı bulunamadı': [
    'User not found', 'Benutzer nicht gefunden', 'Utilisateur introuvable', 'Usuario no encontrado', 'Utente non trovato', 'Usuário não encontrado',
    'Пользователь не найден', '未找到用户', 'ユーザーが見つかりません', '사용자를 찾을 수 없습니다', 'لم يتم العثور على المستخدم', 'उपयोगकर्ता नहीं मिला',
    'Pengguna tidak ditemukan'
  ],
  'Kullanım koşullarını kabul etmelisiniz': [
    'You need to accept the terms of use', 'Sie müssen die Nutzungsbedingungen akzeptieren', 'Vous devez accepter les conditions d’utilisation',
    'Debes aceptar las condiciones de uso', 'Devi accettare le condizioni d’uso', 'Você precisa aceitar os termos de uso', 'Необходимо принять условия использования',
    '您需要接受使用条款', '利用規約に同意してください', '이용 약관에 동의해야 합니다', 'يجب الموافقة على شروط الاستخدام', 'आपको उपयोग की शर्तें स्वीकार करनी होंगी',
    'Anda perlu menyetujui ketentuan penggunaan'
  ],
  'Mevcut parola gerekli': [
    'Current password is required', 'Aktuelles Passwort ist erforderlich', 'Le mot de passe actuel est obligatoire', 'La contraseña actual es obligatoria',
    'La password attuale è obbligatoria', 'A senha atual é obrigatória', 'Введите текущий пароль', '请输入当前密码', '現在のパスワードを入力してください',
    '현재 비밀번호를 입력하세요', 'كلمة المرور الحالية مطلوبة', 'वर्तमान पासवर्ड आवश्यक है', 'Kata sandi saat ini wajib diisi'
  ],
  'Mevcut parola hatalı': [
    'Current password is wrong', 'Aktuelles Passwort ist falsch', 'Le mot de passe actuel est incorrect', 'La contraseña actual es incorrecta',
    'La password attuale è errata', 'A senha atual está incorreta', 'Текущий пароль неверен', '当前密码错误', '現在のパスワードが違います', '현재 비밀번호가 틀렸습니다',
    'كلمة المرور الحالية غير صحيحة', 'वर्तमान पासवर्ड गलत है', 'Kata sandi saat ini salah'
  ],
  'Pad bulunamadı': [
    'Snippet not found', 'Snippet nicht gefunden', 'Extrait introuvable', 'Fragmento no encontrado', 'Snippet non trovato', 'Trecho não encontrado',
    'Фрагмент не найден', '未找到代码片段', 'スニペットが見つかりません', '스니펫을 찾을 수 없습니다', 'لم يتم العثور على المقطع', 'स्निपेट नहीं मिला',
    'Cuplikan tidak ditemukan'
  ],
  'Parola en az 8 karakter olmalı': [
    'Password must be at least 8 characters', 'Das Passwort muss mindestens 8 Zeichen lang sein', 'Le mot de passe doit comporter au moins 8 caractères',
    'La contraseña debe tener al menos 8 caracteres', 'La password deve avere almeno 8 caratteri', 'A senha deve ter pelo menos 8 caracteres',
    'Пароль должен содержать не менее 8 символов', '密码至少需要 8 个字符', 'パスワードは 8 文字以上にしてください', '비밀번호는 8자 이상이어야 합니다',
    'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل', 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए', 'Kata sandi minimal 8 karakter'
  ],
  'Parola gerekli': [
    'Password is required', 'Passwort ist erforderlich', 'Le mot de passe est obligatoire', 'La contraseña es obligatoria', 'La password è obbligatoria',
    'A senha é obrigatória', 'Введите пароль', '请输入密码', 'パスワードを入力してください', '비밀번호를 입력하세요', 'كلمة المرور مطلوبة', 'पासवर्ड आवश्यक है',
    'Kata sandi wajib diisi'
  ],
  'Paylaşım bulunamadı': [
    'Share not found', 'Freigabe nicht gefunden', 'Partage introuvable', 'Enlace no encontrado', 'Condivisione non trovata', 'Compartilhamento não encontrado',
    'Ссылка не найдена', '未找到分享', '共有が見つかりません', '공유를 찾을 수 없습니다', 'لم يتم العثور على المشاركة', 'शेयर नहीं मिला', 'Berbagi tidak ditemukan'
  ],
  Pro: ['Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro', 'Pro'],
  'Python biçimlendirme hatası': [
    'Python formatting error', 'Python-Formatierungsfehler', 'Erreur de mise en forme Python', 'Error de formato de Python', 'Errore di formattazione Python',
    'Erro de formatação Python', 'Ошибка форматирования Python', 'Python 格式化错误', 'Python の整形エラー', 'Python 서식 지정 오류', 'خطأ في تنسيق Python',
    'Python फ़ॉर्मैटिंग त्रुटि', 'Kesalahan pemformatan Python'
  ],
  'SQL biçimlendirme hatası': [
    'SQL formatting error', 'SQL-Formatierungsfehler', 'Erreur de mise en forme SQL', 'Error de formato de SQL', 'Errore di formattazione SQL',
    'Erro de formatação SQL', 'Ошибка форматирования SQL', 'SQL 格式化错误', 'SQL の整形エラー', 'SQL 서식 지정 오류', 'خطأ في تنسيق SQL',
    'SQL फ़ॉर्मैटिंग त्रुटि', 'Kesalahan pemformatan SQL'
  ],
  'Son yönetici düşürülemez veya askıya alınamaz': [
    "The last admin can't be demoted or suspended", 'Der letzte Administrator kann nicht herabgestuft oder gesperrt werden',
    'Le dernier administrateur ne peut pas être rétrogradé ni suspendu', 'El último administrador no se puede degradar ni suspender',
    'L’ultimo amministratore non può essere declassato né sospeso', 'O último administrador não pode ser rebaixado nem suspenso',
    'Последнего администратора нельзя понизить или заблокировать', '不能降级或停用最后一位管理员', '最後の管理者は降格・停止できません',
    '마지막 관리자는 강등하거나 정지할 수 없습니다', 'لا يمكن خفض دور آخر مسؤول أو تعليقه', 'अंतिम व्यवस्थापक को हटाया या निलंबित नहीं किया जा सकता',
    'Admin terakhir tidak dapat diturunkan atau ditangguhkan'
  ],
  'Son yönetici silinemez': [
    "The last admin can't be deleted", 'Der letzte Administrator kann nicht gelöscht werden', 'Le dernier administrateur ne peut pas être supprimé',
    'El último administrador no se puede eliminar', 'L’ultimo amministratore non può essere eliminato', 'O último administrador não pode ser excluído',
    'Последнего администратора нельзя удалить', '不能删除最后一位管理员', '最後の管理者は削除できません', '마지막 관리자는 삭제할 수 없습니다',
    'لا يمكن حذف آخر مسؤول', 'अंतिम व्यवस्थापक को हटाया नहीं जा सकता', 'Admin terakhir tidak dapat dihapus'
  ],
  'Sunucu hatası': [
    'Server error', 'Serverfehler', 'Erreur du serveur', 'Error del servidor', 'Errore del server', 'Erro no servidor', 'Ошибка сервера', '服务器错误',
    'サーバーエラー', '서버 오류', 'خطأ في الخادم', 'सर्वर त्रुटि', 'Kesalahan server'
  ],
  'Sürüm bulunamadı': [
    'Version not found', 'Version nicht gefunden', 'Version introuvable', 'Versión no encontrada', 'Versione non trovata', 'Versão não encontrada',
    'Версия не найдена', '未找到版本', 'バージョンが見つかりません', '버전을 찾을 수 없습니다', 'لم يتم العثور على الإصدار', 'संस्करण नहीं मिला', 'Versi tidak ditemukan'
  ],
  'Sürüm geçmişi': [
    'Version history', 'Versionsverlauf', 'Historique des versions', 'Historial de versiones', 'Cronologia delle versioni', 'Histórico de versões',
    'История версий', '版本历史', 'バージョン履歴', '버전 기록', 'سجل الإصدارات', 'संस्करण इतिहास', 'Riwayat versi'
  ],
  'Sürüm geçmişi bu planda yok.': [
    "Version history isn't included in this plan.", 'Der Versionsverlauf ist in diesem Tarif nicht enthalten.', 'L’historique des versions n’est pas inclus dans cette offre.',
    'El historial de versiones no está incluido en este plan.', 'La cronologia delle versioni non è inclusa in questo piano.',
    'O histórico de versões não está incluído neste plano.', 'История версий не входит в этот тариф.', '此方案不包含版本历史。',
    'このプランにはバージョン履歴が含まれていません。', '이 플랜에는 버전 기록이 포함되어 있지 않습니다.', 'سجل الإصدارات غير متاح في هذه الخطة.',
    'इस प्लान में संस्करण इतिहास शामिल नहीं है।', 'Riwayat versi tidak termasuk dalam paket ini.'
  ],
  'Yedek oluşturulamadı': [
    "Couldn't create the backup", 'Sicherung konnte nicht erstellt werden', 'Impossible de créer la sauvegarde', 'No se pudo crear la copia de seguridad',
    'Impossibile creare il backup', 'Não foi possível criar o backup', 'Не удалось создать резервную копию', '无法创建备份', 'バックアップを作成できませんでした',
    '백업을 만들 수 없습니다', 'تعذّر إنشاء النسخة الاحتياطية', 'बैकअप नहीं बनाया जा सका', 'Cadangan tidak dapat dibuat'
  ],
  'Yeni kayıtlar şu anda kapalı.': [
    'New sign-ups are currently closed.', 'Neue Registrierungen sind derzeit geschlossen.', 'Les nouvelles inscriptions sont actuellement fermées.',
    'Los nuevos registros están cerrados por ahora.', 'Le nuove registrazioni sono attualmente chiuse.', 'Novos cadastros estão fechados no momento.',
    'Регистрация новых пользователей сейчас закрыта.', '目前暂停新用户注册。', '現在、新規登録は受け付けていません。', '현재 신규 가입이 닫혀 있습니다.',
    'التسجيلات الجديدة مغلقة حاليًا.', 'नए साइन-अप अभी बंद हैं।', 'Pendaftaran baru sedang ditutup.'
  ],
  'Yeni parola en az 8 karakter olmalı': [
    'The new password must be at least 8 characters', 'Das neue Passwort muss mindestens 8 Zeichen lang sein',
    'Le nouveau mot de passe doit comporter au moins 8 caractères', 'La nueva contraseña debe tener al menos 8 caracteres',
    'La nuova password deve avere almeno 8 caratteri', 'A nova senha deve ter pelo menos 8 caracteres', 'Новый пароль должен содержать не менее 8 символов',
    '新密码至少需要 8 个字符', '新しいパスワードは 8 文字以上にしてください', '새 비밀번호는 8자 이상이어야 합니다', 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل',
    'नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए', 'Kata sandi baru minimal 8 karakter'
  ],
  'Zamanlı paylaşım ve son geçerlilik': [
    'Scheduled sharing and expiry', 'Geplante Freigabe und Ablaufdatum', 'Partage programmé et expiration', 'Compartir programado y caducidad',
    'Condivisione programmata e scadenza', 'Compartilhamento agendado e expiração', 'Отложенная публикация и срок действия', '定时分享与过期时间',
    '予約公開と有効期限', '예약 공유 및 만료', 'المشاركة المجدولة وتاريخ الانتهاء', 'निर्धारित शेयरिंग और समाप्ति', 'Berbagi terjadwal dan kedaluwarsa'
  ],
  'which alanı edit|view|both olmalı': [
    'The "which" field must be edit, view or both', 'Das Feld „which“ muss edit, view oder both sein', 'Le champ « which » doit valoir edit, view ou both',
    'El campo «which» debe ser edit, view o both', 'Il campo «which» deve essere edit, view o both', 'O campo "which" deve ser edit, view ou both',
    'Поле «which» должно быть edit, view или both', '“which”字段必须为 edit、view 或 both', '「which」は edit、view、both のいずれかにしてください',
    '"which" 필드는 edit, view, both 중 하나여야 합니다', 'يجب أن يكون الحقل «which» إحدى القيم edit أو view أو both',
    '"which" फ़ील्ड edit, view या both होना चाहिए', 'Kolom "which" harus edit, view, atau both'
  ],
  '{plan} planında en fazla {max} ders oluşturabilirsiniz.': [
    'Course limit reached for the {plan} plan (maximum: {max}).',
    'Kurslimit des Tarifs „{plan}“ erreicht (Maximum: {max}).',
    'Limite de cours atteinte pour l’offre « {plan} » (maximum : {max}).',
    'Has alcanzado el límite de cursos del plan {plan} (máximo: {max}).',
    'Hai raggiunto il limite di corsi del piano {plan} (massimo: {max}).',
    'Você atingiu o limite de cursos do plano {plan} (máximo: {max}).',
    'Достигнут лимит курсов в тарифе «{plan}» (максимум: {max}).',
    '已达到“{plan}”方案的课程上限（最多 {max} 个）。',
    '「{plan}」プランのコース数の上限に達しました（上限：{max}）。',
    '{plan} 플랜의 강의 한도에 도달했습니다(최대 {max}개).',
    'وصلت إلى الحد الأقصى للدورات في خطة «{plan}» (الحد الأقصى: {max}).',
    '"{plan}" प्लान में कोर्स की सीमा पूरी हो गई है (अधिकतम: {max})।',
    'Batas kursus paket {plan} sudah tercapai (maksimum: {max}).'
  ],
  '{plan} planında en fazla {max} kod oluşturabilirsiniz.': [
    'Snippet limit reached for the {plan} plan (maximum: {max}).',
    'Snippet-Limit des Tarifs „{plan}“ erreicht (Maximum: {max}).',
    'Limite d’extraits atteinte pour l’offre « {plan} » (maximum : {max}).',
    'Has alcanzado el límite de fragmentos del plan {plan} (máximo: {max}).',
    'Hai raggiunto il limite di snippet del piano {plan} (massimo: {max}).',
    'Você atingiu o limite de trechos do plano {plan} (máximo: {max}).',
    'Достигнут лимит фрагментов в тарифе «{plan}» (максимум: {max}).',
    '已达到“{plan}”方案的代码片段上限（最多 {max} 个）。',
    '「{plan}」プランのスニペット数の上限に達しました（上限：{max}）。',
    '{plan} 플랜의 스니펫 한도에 도달했습니다(최대 {max}개).',
    'وصلت إلى الحد الأقصى للمقاطع في خطة «{plan}» (الحد الأقصى: {max}).',
    '"{plan}" प्लान में स्निपेट की सीमा पूरी हो गई है (अधिकतम: {max})।',
    'Batas cuplikan paket {plan} sudah tercapai (maksimum: {max}).'
  ],
  '{title} (kopya)': [
    '{title} (copy)', '{title} (Kopie)', '{title} (copie)', '{title} (copia)', '{title} (copia)', '{title} (cópia)', '{title} (копия)', '{title}（副本）',
    '{title}（コピー）', '{title} (사본)', '{title} (نسخة)', '{title} (कॉपी)', '{title} (salinan)'
  ],
  '{title} — sürüm {date}': [
    '{title} — version {date}', '{title} — Version {date}', '{title} — version du {date}', '{title} — versión {date}', '{title} — versione {date}',
    '{title} — versão {date}', '{title} — версия {date}', '{title} — {date} 版本', '{title} — {date} のバージョン', '{title} — {date} 버전',
    '{title} — إصدار {date}', '{title} — संस्करण {date}', '{title} — versi {date}'
  ],
  'Çok fazla deneme': [
    'Too many attempts', 'Zu viele Versuche', 'Trop de tentatives', 'Demasiados intentos', 'Troppi tentativi', 'Muitas tentativas', 'Слишком много попыток',
    '尝试次数过多', '試行回数が多すぎます', '시도 횟수가 너무 많습니다', 'محاولات كثيرة جدًا', 'बहुत अधिक प्रयास', 'Terlalu banyak percobaan'
  ],
  'Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.': [
    'Too many attempts. Please try again later.', 'Zu viele Versuche. Bitte versuchen Sie es später erneut.', 'Trop de tentatives. Réessayez plus tard.',
    'Demasiados intentos. Inténtalo más tarde.', 'Troppi tentativi. Riprova più tardi.', 'Muitas tentativas. Tente novamente mais tarde.',
    'Слишком много попыток. Повторите позже.', '尝试次数过多，请稍后再试。', '試行回数が多すぎます。しばらくしてからもう一度お試しください。',
    '시도 횟수가 너무 많습니다. 나중에 다시 시도하세요.', 'محاولات كثيرة جدًا. حاول مرة أخرى لاحقًا.', 'बहुत अधिक प्रयास। कृपया बाद में फिर कोशिश करें।',
    'Terlalu banyak percobaan. Coba lagi nanti.'
  ],
  'Çok sık biçimlendirme isteği': [
    'Too many formatting requests', 'Zu viele Formatierungsanfragen', 'Trop de demandes de mise en forme', 'Demasiadas solicitudes de formato',
    'Troppe richieste di formattazione', 'Muitas solicitações de formatação', 'Слишком много запросов на форматирование', '格式化请求过于频繁',
    '整形のリクエストが多すぎます', '서식 지정 요청이 너무 많습니다', 'طلبات تنسيق كثيرة جدًا', 'बहुत अधिक फ़ॉर्मैटिंग अनुरोध', 'Terlalu banyak permintaan pemformatan'
  ],
  'Öğrenci düzenleme linki': [
    'Student edit links', 'Bearbeitungslinks für Schüler', 'Liens de modification pour les élèves', 'Enlaces de edición para estudiantes',
    'Link di modifica per gli studenti', 'Links de edição para alunos', 'Ссылки для редактирования учениками', '学生编辑链接', '生徒用編集リンク',
    '학생 편집 링크', 'روابط التحرير للطلاب', 'छात्र संपादन लिंक', 'Tautan edit untuk siswa'
  ],
  Ücretsiz: [
    'Free', 'Kostenlos', 'Gratuit', 'Gratis', 'Gratuito', 'Gratuito', 'Бесплатный', '免费', '無料', '무료', 'مجاني', 'मुफ़्त', 'Gratis'
  ],
  'Şifre gerekli': [
    'Password required', 'Passwort erforderlich', 'Mot de passe requis', 'Se requiere contraseña', 'Password richiesta', 'Senha necessária',
    'Требуется пароль', '需要密码', 'パスワードが必要です', '비밀번호가 필요합니다', 'كلمة المرور مطلوبة', 'पासवर्ड आवश्यक है', 'Kata sandi diperlukan'
  ],
  'Şifre hatalı': [
    'Wrong password', 'Falsches Passwort', 'Mot de passe incorrect', 'Contraseña incorrecta', 'Password errata', 'Senha incorreta', 'Неверный пароль', '密码错误',
    'パスワードが違います', '비밀번호가 틀렸습니다', 'كلمة المرور غير صحيحة', 'पासवर्ड गलत है', 'Kata sandi salah'
  ],
  'Şifreli paylaşım': [
    'Password-protected sharing', 'Passwortgeschützte Freigabe', 'Partage protégé par mot de passe', 'Compartir con contraseña', 'Condivisione protetta da password',
    'Compartilhamento com senha', 'Доступ по паролю', '密码保护分享', 'パスワード付き共有', '비밀번호 보호 공유', 'المشاركة المحمية بكلمة مرور',
    'पासवर्ड-सुरक्षित शेयरिंग', 'Berbagi dengan kata sandi'
  ]
};

export type Catalog = Partial<Record<LocaleCode, Record<string, string>>> & { en: Record<string, string> };

export const CATALOG: Catalog = (() => {
  const out: Partial<Record<LocaleCode, Record<string, string>>> = {};
  LANG_ORDER.forEach((code, i) => {
    const m: Record<string, string> = {};
    for (const [src, row] of Object.entries(TABLE)) m[src] = row[i];
    out[code] = m;
  });
  return out;
})() as Catalog;
