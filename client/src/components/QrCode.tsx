import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

type Props = {
  value: string;
  size?: number;
  className?: string;
};

// QR kod üretir (canvas). `value` değişince yeniden çizer.
export default function QrCode({ value, size = 320, className }: Props): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (!value) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    void QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' }
    });
  }, [value, size]);

  return <canvas ref={ref} className={className} aria-label="QR kod" />;
}