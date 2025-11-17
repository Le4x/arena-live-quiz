import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface QRCodeGeneratorProps {
  sessionCode: string;
  sessionName: string;
  brandingColor?: string;
}

export function QRCodeGenerator({ sessionCode, sessionName, brandingColor = '#3b82f6' }: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate the join URL
  const joinUrl = `${window.location.origin}/join/${sessionCode}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        joinUrl,
        {
          width: 300,
          margin: 2,
          color: {
            dark: brandingColor,
            light: '#FFFFFF',
          },
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );

      // Also generate data URL for download
      QRCode.toDataURL(
        joinUrl,
        {
          width: 600,
          margin: 2,
          color: {
            dark: brandingColor,
            light: '#FFFFFF',
          },
        },
        (error, url) => {
          if (error) {
            console.error('Error generating QR data URL:', error);
          } else {
            setQrDataUrl(url);
          }
        }
      );
    }
  }, [sessionCode, brandingColor, joinUrl]);

  const downloadQRCode = () => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.download = `QR-${sessionCode}-${sessionName.replace(/\s+/g, '_')}.png`;
      link.href = qrDataUrl;
      link.click();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-1">QR Code Session</h3>
        <p className="text-sm text-muted-foreground">{sessionName}</p>
      </div>

      <canvas ref={canvasRef} className="border-2 border-gray-200 rounded-lg" />

      <div className="text-center space-y-2">
        <p className="text-sm font-medium">Code d'accès: {sessionCode}</p>
        <p className="text-xs text-muted-foreground break-all max-w-[300px]">{joinUrl}</p>
      </div>

      <Button onClick={downloadQRCode} variant="outline" className="gap-2">
        <Download className="h-4 w-4" />
        Télécharger QR Code
      </Button>
    </div>
  );
}
