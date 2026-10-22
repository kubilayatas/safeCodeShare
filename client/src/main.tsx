import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
// Yazı tipleri uygulamayla birlikte sunulur (Google Fonts'a istek gitmez).
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
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
if (!root) throw new Error('#root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);