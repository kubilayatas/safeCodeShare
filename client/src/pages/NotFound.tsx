import { Link } from 'react-router-dom';

export default function NotFound(): JSX.Element {
  return (
    <div className="nf">
      <h1 style={{ margin: 0 }}>404</h1>
      <p className="muted">Aradığınız sayfa bulunamadı.</p>
      <Link className="btn" to="/">
        Ana sayfaya dön
      </Link>
    </div>
  );
}