import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export type AdBannerProps = {
  /** AdSense Reklam Birimi ID'si (Örn: "1234567890") */
  slot?: string;
  /** Reklam formatı: auto, horizontal, rectangle, vertical */
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical';
  /** Tam genişlik responsive uyumu */
  responsive?: boolean;
  /** Özel stil nesnesi */
  style?: React.CSSProperties;
  /** Özel CSS sınıfı */
  className?: string;
  /** Client ID tanımlı değilse alanı tamamen gizle */
  hideIfEmpty?: boolean;
};

export default function AdBanner({
  slot,
  format = 'auto',
  responsive = true,
  style,
  className = '',
  hideIfEmpty = false
}: AdBannerProps): JSX.Element | null {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  // Vite ortam değişkeninden AdSense Yayıncı ID'si (ca-pub-XXXXXXXXXXXXXXXX)
  const clientId = (import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined)?.trim();

  // 1. Script'i bir kez head'e dinamik olarak enjekte et
  useEffect(() => {
    if (!clientId) return;
    const scriptId = 'google-adsense-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      document.head.appendChild(script);
    }
  }, [clientId]);

  // 2. Reklam birimini AdSense kütüphanesine bildir
  useEffect(() => {
    if (!clientId || !adRef.current || pushedRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch (err) {
      console.warn('[AdSense] Reklam yüklenirken uyarı:', err);
    }
  }, [clientId, slot]);

  // Eğer AdSense ID tanımlı değilse
  if (!clientId) {
    if (hideIfEmpty) return null;

    return (
      <div className={`ad-placeholder-box ${className}`} style={style} title="Google AdSense Reklam Alanı">
        <span className="ad-badge">REKLAM ALANI</span>
        <span className="ad-placeholder-text">
          Google AdSense Alanı {slot ? `(Slot: ${slot})` : ''} — <code>.env</code> dosyasına <code>VITE_ADSENSE_CLIENT_ID</code> eklediğinizde otomatik bağlanır.
        </span>
      </div>
    );
  }

  return (
    <div className={`ad-container ${className}`} style={style}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '60px', ...(style ?? {}) }}
        data-ad-client={clientId}
        data-ad-slot={slot || undefined}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}
