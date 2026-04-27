import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeScannerProps {
  onResult: (barcode: string) => void;
  onError?: (err: string) => void;
}

class ScannerErrorBoundary extends Component<{ children: ReactNode }, { msg: string | null }> {
  state = { msg: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { msg: err instanceof Error ? `${err.name}: ${err.message}` : String(err) };
  }
  componentDidCatch(err: unknown) {
    console.error('[BarcodeScanner crash]', err);
  }
  render() {
    if (this.state.msg) {
      return (
        <div className="p-4 border border-red/40 bg-red/10 rounded-md text-sm text-red whitespace-pre-wrap">
          Scanner crashed: {this.state.msg}
        </div>
      );
    }
    return this.props.children;
  }
}

function safeStop(scanner: Html5Qrcode) {
  try {
    const p = scanner.stop();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  } catch {
    // scanner wasn't running
  }
}

function classifyCamera(label: string): 'iphone' | 'mac' {
  const l = label.toLowerCase();
  if (l.includes('iphone') || l.includes('continuity') || l.includes('isight') || l.includes('ipad')) return 'iphone';
  return 'mac';
}

export default function BarcodeScanner(props: BarcodeScannerProps) {
  return (
    <ScannerErrorBoundary>
      <BarcodeScannerInner {...props} />
    </ScannerErrorBoundary>
  );
}

function BarcodeScannerInner({ onResult, onError }: BarcodeScannerProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const scannerRef    = useRef<Html5Qrcode | null>(null);
  const scannedRef    = useRef(false);

  const [cameras, setCameras]             = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [scanning, setScanning]           = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices.length) {
          setCameras(devices);
          const saved = localStorage.getItem('barcode:lastCamera');
          const preferred = (saved && devices.find(d => d.id === saved))
            ?? devices.find(d => classifyCamera(d.label) === 'mac')
            ?? devices[0];
          setSelectedCamera(preferred.id);
        } else {
          setError('No cameras found');
        }
      })
      .catch(() => setError('Camera access denied'));
  }, []);

  useEffect(() => {
    if (!selectedCamera || !containerRef.current) return;

    let cancelled = false;
    let started = false;

    const scanner = new Html5Qrcode('barcode-reader', {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ],
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });
    scannerRef.current = scanner;
    scannedRef.current = false;

    scanner
      .start(
        selectedCamera,
        { fps: 10, qrbox: { width: 300, height: 200 } },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          safeStop(scanner);
          setScanning(false);
          onResult(decodedText);
        },
        () => {}
      )
      .then(() => {
        started = true;
        if (cancelled) { safeStop(scanner); return; }
        setScanning(true);
      })
      .catch(err => {
        console.error('[BarcodeScanner] start failed:', err);
        if (cancelled) return;
        setError(typeof err === 'string' ? err : 'Failed to start camera');
        onError?.(String(err));
      });

    return () => {
      cancelled = true;
      if (started) safeStop(scanner);
    };
  }, [selectedCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  const macCameras     = cameras.filter(c => classifyCamera(c.label) === 'mac');
  const iphoneCameras  = cameras.filter(c => classifyCamera(c.label) === 'iphone');

  return (
    <div className="flex flex-col gap-3">
      {/* Camera source buttons */}
      {cameras.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {macCameras.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedCamera(c.id); localStorage.setItem('barcode:lastCamera', c.id); }}
              className={[
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-colors',
                selectedCamera === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-sec hover:border-accent/50',
              ].join(' ')}
            >
              💻 {macCameras.length > 1 ? c.label : 'Mac camera'}
            </button>
          ))}
          {iphoneCameras.map(c => (
            <button
              key={c.id}
              onClick={() => { setSelectedCamera(c.id); localStorage.setItem('barcode:lastCamera', c.id); }}
              className={[
                'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-colors',
                selectedCamera === c.id
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-sec hover:border-accent/50',
              ].join(' ')}
            >
              📱 iPhone camera
            </button>
          ))}
        </div>
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
