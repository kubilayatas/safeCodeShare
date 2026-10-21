import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/base.css';
import './styles/themes.css';

// Render ücretsiz planı, 15 dakika boyunca gelen istek olmazsa sunucuyu uyutur ve
// uyuyan sunucunun diskindeki veriler silinir. Öğrencilerin canlı izleme akışı (SSE)
// "gelen istek" sayılmayabilir. Bu yüzden sayfa açık ve görünürken 4 dakikada bir küçük
// bir sağlık isteği gönderiyoruz. Sayfa kapalıyken veya arka plandayken gönderilmez.
const KEEPALIVE_MS = 4 * 60 * 1000;
window.setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  fetch('/api/health', { cache: 'no-store' }).catch(() => {
    /* sunucu uyanıyor olabilir; sessizce geç */
  });
}, KEEPALIVE_MS);

const root = document.getElementById('root');
if (!root) throw new Error('root elementi bulunamadı');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);