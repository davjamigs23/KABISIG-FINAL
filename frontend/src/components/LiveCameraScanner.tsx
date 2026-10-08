import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, QrCode, ShieldAlert, CheckCircle2, SwitchCamera, Sparkles } from 'lucide-react';

interface LiveCameraScannerProps {
  onScan: (decodedText: string) => void;
  onClose?: () => void;
  selectedProgId?: string;
}

export const LiveCameraScanner: React.FC<LiveCameraScannerProps> = ({
  onScan,
  onClose,
  selectedProgId
}) => {
  const [isStarted, setIsStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCamId, setSelectedCamId] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanSuccessAnim, setScanSuccessAnim] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const scannerContainerId = 'html5-live-qr-reader';

  // Crisp single audio chime player (G5 -> C6 dual tone)
  const playCrispChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      // Note 1: 784Hz (G5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(784, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2: 1046.5Hz (C6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08);
      gain2.gain.setValueAtTime(0.18, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.3);
    } catch (e) {
      // ignore browser audio policy restrictions
    }
  };

  // Stop camera function
  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      const scanner = html5QrcodeRef.current;
      html5QrcodeRef.current = null;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err: any) {
        // Suppress expected play/stop DOM interruption warnings during unmount or restart
        console.debug('Camera stop cleanup:', err?.message || err);
      }
    }
    if (mountedRef.current) {
      setIsStarted(false);
      setIsInitializing(false);
    }
  };

  // Start camera function with camera ID / facingMode fallback
  const startCamera = async (camId?: string, mode: 'environment' | 'user' = facingMode, forceFacingMode = false) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    if (mountedRef.current) {
      setIsInitializing(true);
      setErrorMsg(null);
    }

    try {
      // Clean up previous instance if running
      await stopCamera();

      if (!mountedRef.current) return;

      const container = document.getElementById(scannerContainerId);
      if (!container) {
        throw new Error('Scanner container element not found.');
      }

      // Query cameras first to get labels and devices
      let devices: Array<{ id: string; label: string }> = [];
      try {
        devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0 && mountedRef.current) {
          setAvailableCameras(devices);
        }
      } catch (camErr) {
        console.warn('Could not enumerate cameras:', camErr);
      }

      const qrScanner = new Html5Qrcode(scannerContainerId);
      html5QrcodeRef.current = qrScanner;

      // Determine best camera config with fallback logic
      let cameraConfig: any = camId;

      if (!cameraConfig) {
        if (forceFacingMode) {
          cameraConfig = { facingMode: mode };
        } else if (selectedCamId && devices.some(d => d.id === selectedCamId)) {
          cameraConfig = selectedCamId;
        } else if (devices.length > 0) {
          // If cameras are listed, find matching label or pick first available camera
          const matchedCam = devices.find(d => 
            mode === 'environment' 
              ? d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('environment')
              : d.label.toLowerCase().includes('front') || d.label.toLowerCase().includes('user') || d.label.toLowerCase().includes('webcam')
          );
          cameraConfig = matchedCam ? matchedCam.id : devices[0].id;
        } else {
          cameraConfig = { facingMode: mode };
        }
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.floor(minDim * 0.7);
          return { width: Math.max(boxSize, 180), height: Math.max(boxSize, 180) };
        },
        aspectRatio: 1.0
      };

      const handleSuccess = (decodedText: string) => {
        const now = Date.now();
        // Debounce: ignore same code scanned within 2.5 seconds, or any scan within 1 second
        if (
          decodedText === lastScannedCodeRef.current &&
          now - lastScanTimeRef.current < 2500
        ) {
          return;
        }
        if (now - lastScanTimeRef.current < 1000) {
          return;
        }

        lastScanTimeRef.current = now;
        lastScannedCodeRef.current = decodedText;

        // Play single crisp chime tone
        playCrispChime();

        if (mountedRef.current) {
          setLastScanned(decodedText);
          setScanSuccessAnim(true);
          setTimeout(() => {
            if (mountedRef.current) setScanSuccessAnim(false);
          }, 2000);
        }
        
        onScan(decodedText);
      };

      const handleError = () => {
        // ignore frame decode error
      };

      // Attempt start with primary camera config
      try {
        await qrScanner.start(cameraConfig, config, handleSuccess, handleError);
      } catch (firstErr: any) {
        console.warn('Primary camera configuration failed, trying fallback device:', firstErr);
        // Fallback: If device not found or facingMode failed, try first available camera or user facingMode
        if (devices.length > 0) {
          const fallbackId = devices[0].id;
          if (cameraConfig !== fallbackId) {
            await qrScanner.start(fallbackId, config, handleSuccess, handleError);
            if (mountedRef.current) setSelectedCamId(fallbackId);
          } else {
            throw firstErr;
          }
        } else if (mode === 'environment') {
          // Fallback to default user camera facingMode
          await qrScanner.start({ facingMode: 'user' }, config, handleSuccess, handleError);
        } else {
          throw firstErr;
        }
      }

      if (mountedRef.current) {
        setIsStarted(true);
      }
    } catch (err: any) {
      const errStr = err?.message || String(err);
      const isNoCameraError = err?.name === 'NotFoundError' || errStr.includes('Requested device not found') || errStr.includes('NotFound');
      if (!isNoCameraError) {
        console.error('Error starting html5-qrcode scanner:', err);
      }
      let message = 'Unable to access device camera.';
      if (err?.name === 'NotAllowedError' || errStr.includes('Permission denied')) {
        message = 'Camera access was denied by your browser permissions. Please allow camera access in browser settings.';
      } else if (err?.name === 'NotFoundError' || errStr.includes('Requested device not found') || errStr.includes('NotFound')) {
        message = 'No camera hardware found matching the selected mode. You can use the Quick Simulation or manual code input below.';
      } else if (err?.name === 'NotReadableError' || errStr.includes('Could not start video source') || errStr.includes('in use')) {
        message = 'Camera is currently in use by another application or tab.';
      } else if (typeof err === 'string') {
        message = err;
      } else if (err?.message) {
        message = err.message;
      }
      
      if (mountedRef.current) {
        setErrorMsg(message);
        setIsStarted(false);
      }
      await stopCamera();
    } finally {
      isStartingRef.current = false;
      if (mountedRef.current) {
        setIsInitializing(false);
      }
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSelectedCamId('');
    if (isStarted) {
      startCamera(undefined, nextMode, true);
    }
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCamId(newId);
    if (isStarted) {
      startCamera(newId);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg space-y-0">
<style>{"#html5-live-qr-reader { position: relative !important; } #html5-live-qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; position: absolute !important; top: 0 !important; left: 0 !important; z-index: 2 !important; } #html5-live-qr-reader #qr-shaded-region { display: none !important; } #html5-live-qr-reader canvas { display: none !important; } #html5-live-qr-reader > div > div > span { display: none !important; } #html5-live-qr-reader > div > div > p { display: none !important; }"}</style>
      <style>{
        "#qr-reader video, #qr-shaded-region { width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; } #qr-reader { width: 100% !important; height: 100% !important; }"
      }</style>
      
      {/* SCANNER CONTROL BAR */}
      <div className="bg-[#091d64] text-white p-4 flex flex-wrap justify-between items-center gap-3 border-b border-blue-950">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-white/10 text-amber-400 rounded-xl border border-white/15">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-sans font-extrabold text-white text-sm flex items-center gap-2">
              QR Attendance Scanner
              {isStarted && (
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Camera Active
                </span>
              )}
            </h4>
            <p className="text-[11px] text-blue-200/80 font-medium">Sangguniang Kabataan Verification Desk</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isStarted ? (
            <button
              onClick={() => startCamera()}
              disabled={isInitializing}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-950/40"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              <span>{isInitializing ? 'Connecting Camera...' : 'Start Camera Scanner'}</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <X className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* CAMERA VIEWFINDER STAGE */}
      <div className="bg-slate-950 relative min-h-[300px] sm:min-h-[340px] flex flex-col items-center justify-center p-4">
        
        {/* HTML5 QR READER CONTAINER */}
        <div 
          id={scannerContainerId} 
          className={`w-full max-w-md aspect-square min-h-[280px] sm:min-h-[320px] rounded-xl overflow-hidden border-2 transition-all ${
            scanSuccessAnim ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)]' : 'border-slate-800'
          } ${!isStarted ? 'hidden' : 'block'}`}
        />
        {/* QR TARGETING GUIDE — visible while camera is active */}
        {isStarted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
            <div className="relative w-[70%] max-w-[280px] aspect-square">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg"></div>
              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 opacity-60">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-amber-400"></div>
                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-amber-400"></div>
              </div>
            </div>
          </div>
        )}


        {/* SCANNER INITIAL STATE PLACEHOLDER (No duplicate button) */}
        {!isStarted && !errorMsg && (
          <div className="text-center p-8 max-w-sm space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
              <QrCode className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h5 className="text-white font-bold text-sm">Camera Inactive</h5>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click <span className="text-amber-400 font-bold">"Start Camera Scanner"</span> in the top bar above to begin scanning constituent ID passes.
              </p>
            </div>
          </div>
        )}

        {/* INITIALIZING SPINNER */}
        {isInitializing && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center z-20 text-white space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-bold text-slate-300">Requesting Web Camera Permissions...</p>
          </div>
        )}

        {/* ERROR STATE ALERT */}
        {errorMsg && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-6 rounded-2xl max-w-md text-center space-y-3 shadow-xl my-4">
            <div className="w-10 h-10 rounded-full bg-rose-900/60 border border-rose-700 text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-white">Camera Access Notice</h5>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">{errorMsg}</p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => startCamera()}
                className="flex-1 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Retry Camera Access
              </button>
            </div>
          </div>
        )}

        {/* SCAN SUCCESS NOTIFICATION BADGE */}
        {scanSuccessAnim && (
          <div className="absolute top-4 inset-x-4 bg-emerald-500 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 z-30 animate-in fade-in slide-in-from-top-4 duration-200">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs tracking-wide">QR Code Verified: {lastScanned}</span>
          </div>
        )}

      </div>

      {/* FOOTER TOOLBAR: CAMERA SWITCHER */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3 text-xs">
        {/* Camera Selector Dropdown */}
        <div className="flex items-center gap-2">
          {availableCameras.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <SwitchCamera className="w-4 h-4 text-slate-500" />
              <select
                value={selectedCamId}
                onChange={handleCameraChange}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <button
              onClick={toggleFacingMode}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-[#091d64]" />
              <span>Flip ({facingMode === 'environment' ? 'Back' : 'Front'})</span>
            </button>
          )}
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          Align QR code within camera frame
        </span>
      </div>

    </div>
  );
};

export default LiveCameraScanner;