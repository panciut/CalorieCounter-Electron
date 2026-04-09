// ── Barcode Camera Scanner ───────────────────────────────────────────────────

let _barcodeScanner = null;
let _barcodeScanTarget = null;
let _cameras = [];

async function openBarcodeScanner(targetInputId) {
  _barcodeScanTarget = targetInputId;
  const dialog = document.getElementById('barcode-scanner-dialog');
  const statusEl = document.getElementById('barcode-scanner-status');
  const pickerEl = document.getElementById('barcode-camera-picker');
  statusEl.textContent = t('barcode.selectCamera');
  document.getElementById('barcode-scanner-view').innerHTML = '';

  // List available cameras
  try {
    _cameras = await Html5Qrcode.getCameras();
    pickerEl.innerHTML = '';
    if (!_cameras.length) {
      statusEl.textContent = t('barcode.cameraError');
      dialog.showModal();
      return;
    }

    // Find Mac webcam and iPhone
    const macCam = _cameras.find(c => /facetime|built-in|isight|webcam/i.test(c.label));
    const iphoneCam = _cameras.find(c => /iphone/i.test(c.label));

    // Mac button
    if (macCam) {
      const btn = document.createElement('button');
      btn.className = 'cam-pick-btn';
      btn.innerHTML = `<span class="cam-pick-icon">💻</span><span>Mac</span>`;
      btn.addEventListener('click', () => _startScannerWithCamera(macCam.id, pickerEl));
      pickerEl.appendChild(btn);
    }

    // iPhone button
    if (iphoneCam) {
      const btn = document.createElement('button');
      btn.className = 'cam-pick-btn';
      btn.innerHTML = `<span class="cam-pick-icon">📱</span><span>iPhone</span>`;
      btn.addEventListener('click', () => _startScannerWithCamera(iphoneCam.id, pickerEl));
      pickerEl.appendChild(btn);
    }

    // If neither matched by name, show all as generic buttons
    if (!macCam && !iphoneCam) {
      for (const cam of _cameras) {
        const btn = document.createElement('button');
        btn.className = 'cam-pick-btn';
        const label = cam.label || `Camera ${cam.id.slice(0, 8)}`;
        btn.innerHTML = `<span class="cam-pick-icon">📷</span><span>${label}</span>`;
        btn.addEventListener('click', () => _startScannerWithCamera(cam.id, pickerEl));
        pickerEl.appendChild(btn);
      }
    } else {
      // Also add any other cameras not matched
      for (const cam of _cameras) {
        if (cam === macCam || cam === iphoneCam) continue;
        const btn = document.createElement('button');
        btn.className = 'cam-pick-btn';
        const label = cam.label || `Camera ${cam.id.slice(0, 8)}`;
        btn.innerHTML = `<span class="cam-pick-icon">📷</span><span>${label}</span>`;
        btn.addEventListener('click', () => _startScannerWithCamera(cam.id, pickerEl));
        pickerEl.appendChild(btn);
      }
    }

  } catch (err) {
    console.error('Camera list error:', err);
    statusEl.textContent = t('barcode.cameraError');
  }

  dialog.showModal();
}

async function _startScannerWithCamera(cameraId, pickerEl) {
  const viewId = 'barcode-scanner-view';
  const statusEl = document.getElementById('barcode-scanner-status');

  // Highlight active button
  pickerEl.querySelectorAll('.cam-pick-btn').forEach(b => b.classList.remove('cam-pick-active'));
  // Find the clicked button by matching camera id stored nowhere — just highlight via event
  // Instead, use a data attribute approach: mark all buttons
  // Actually simpler: just re-highlight after start

  if (_barcodeScanner) {
    try { await _barcodeScanner.stop(); } catch (_) {}
    try { await _barcodeScanner.clear(); } catch (_) {}
    _barcodeScanner = null;
  }

  document.getElementById(viewId).innerHTML = '';
  _barcodeScanner = new Html5Qrcode(viewId);
  statusEl.textContent = t('barcode.pointCamera');

  try {
    await _barcodeScanner.start(
      cameraId,
      {
        fps: 10,
        qrbox: { width: 300, height: 150 },
        aspectRatio: 1.5,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
      },
      (decodedText) => _onBarcodeDetected(decodedText),
      () => {}
    );
  } catch (err) {
    console.error('Camera start error:', err);
    statusEl.textContent = t('barcode.cameraError');
  }
}

async function _onBarcodeDetected(barcode) {
  if (_barcodeScanner) {
    try { await _barcodeScanner.stop(); } catch (_) {}
  }
  document.getElementById('barcode-scanner-dialog').close();

  if (_barcodeScanTarget) {
    const input = document.getElementById(_barcodeScanTarget);
    if (input) {
      input.value = barcode;
      const btn = document.getElementById(_barcodeScanTarget + '-btn');
      if (btn) btn.click();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dialog = document.getElementById('barcode-scanner-dialog');

  dialog.addEventListener('close', async () => {
    if (_barcodeScanner) {
      try { await _barcodeScanner.stop(); } catch (_) {}
      try { await _barcodeScanner.clear(); } catch (_) {}
      _barcodeScanner = null;
    }
  });

  // Inline camera buttons (💻 / 📱) — skip picker, go straight to scanning
  document.querySelectorAll('.barcode-inline-cam').forEach(btn => {
    btn.addEventListener('click', async () => {
      _barcodeScanTarget = btn.dataset.target;
      const camType = btn.dataset.cam; // 'mac' or 'iphone'
      const dialog = document.getElementById('barcode-scanner-dialog');
      const statusEl = document.getElementById('barcode-scanner-status');
      const pickerEl = document.getElementById('barcode-camera-picker');
      pickerEl.innerHTML = '';
      document.getElementById('barcode-scanner-view').innerHTML = '';
      statusEl.textContent = t('barcode.pointCamera');
      dialog.showModal();

      try {
        const cameras = await Html5Qrcode.getCameras();
        let cam;
        if (camType === 'iphone') {
          cam = cameras.find(c => /iphone/i.test(c.label));
        } else {
          cam = cameras.find(c => /facetime|built-in|isight|webcam/i.test(c.label));
        }
        if (!cam) cam = cameras[0]; // fallback
        if (cam) {
          _startScannerWithCamera(cam.id, pickerEl);
        } else {
          statusEl.textContent = t('barcode.cameraError');
        }
      } catch (err) {
        statusEl.textContent = t('barcode.cameraError');
      }
    });
  });
});
