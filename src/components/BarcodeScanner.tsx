import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onResult: (barcode: string) => void;
  onError?: (err: string) => void;
}

export default function BarcodeScanner({ onResult, onError }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannedRef = useRef(false);

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices.length) {
          setCameras(devices);
          setSelectedCamera(devices[0].id);
        } else {
          setError('No cameras found');
        }
      })
      .catch(() => setError('Camera access denied'));
  }, []);

  useEffect(() => {
    if (!selectedCamera || !containerRef.current) return;

    const scannerId = 'barcode-reader';
    const scanner = new Html5Qrcode(scannerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
      verbose: false,
    });
    scannerRef.current = scanner;
    scannedRef.current = false;

    scanner
      .start(
        selectedCamera,
        { fps: 10, qrbox: { width: 240, height: 160 } },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          scanner.stop().catch(() => {});
          setScanning(false);
          onResult(decodedText);
        },
        () => { /* scan misses — ignore */ }
      )
      .then(() => setScanning(true))
      .catch(err => {
        setError(typeof err === 'string' ? err : 'Failed to start camera');
        onError?.(String(err));
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [selectedCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3">
      {cameras.length > 1 && (
        <select
          value={selectedCamera}
          onChange={e => setSelectedCamera(e.target.value)}
          className="bg-card border border-border rounded px-2 py-1 text-sm text-text outline-none focus:border-accent"
        >
          {cameras.map(c => (
            <option key={c.id} value={c.id}>{c.label || c.id}</option>
          ))}
        </select>
      )}
      <div
        id="barcode-reader"
        ref={containerRef}
        className="w-full rounded-md overflow-hidden"
        style={{ minHeight: 220 }}
      />
      {error && <p className="text-red text-sm">{error}</p>}
      {scanning && !error && (
        <p className="text-text-sec text-xs text-center">Point camera at a barcode…</p>
      )}
    </div>
  );
}
