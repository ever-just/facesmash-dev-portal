'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Lock,
  Trash2,
  Loader2,
  ScanFace,
  CheckCircle,
  AlertTriangle,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useActionState, useState, useRef, useCallback, useEffect } from 'react';
import { updatePassword, deleteAccount } from '@/app/(login)/actions';
import useSWR from 'swr';

// Dynamic import to avoid SSR issues
let FaceSmashClient: any = null;
if (typeof window !== 'undefined') {
  import('@facesmash/sdk').then(module => {
    FaceSmashClient = module.FaceSmashClient;
  });
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

export default function SecurityPage() {
  const [passwordState, passwordAction, isPasswordPending] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});

  const [deleteState, deleteAction, isDeletePending] = useActionState<
    DeleteState,
    FormData
  >(deleteAccount, {});

  // FaceCard state
  const { data: faceCardData, mutate: mutateFaceCard } = useSWR(
    '/api/auth/facecard/register',
    fetcher
  );
  const [showFaceRegister, setShowFaceRegister] = useState(false);
  const [faceStatus, setFaceStatus] = useState<
    'idle' | 'initializing' | 'searching' | 'detected' | 'registering' | 'success' | 'error'
  >('idle');
  const [faceError, setFaceError] = useState('');
  const [scanPulse, setScanPulse] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const registerAttemptedRef = useRef(false);
  const sdkRef = useRef<any>(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    registerAttemptedRef.current = false;
  }, []);

  // Auto-detect face via pixel analysis in center region
  const autoDetectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    if (registerAttemptedRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) return;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const sampleSize = 60;
    const imageData = ctx.getImageData(
      centerX - sampleSize / 2,
      centerY - sampleSize / 2,
      sampleSize,
      sampleSize
    );
    const pixels = imageData.data;
    let skinTonePixels = 0;
    let totalBrightness = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      totalBrightness += (r + g + b) / 3;
      if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
        skinTonePixels++;
      }
    }
    const avgBrightness = totalBrightness / (pixels.length / 4);
    const skinRatio = skinTonePixels / (pixels.length / 4);

    if (avgBrightness > 40 && skinRatio > 0.15) {
      setScanPulse((prev) => Math.min(prev + 20, 100));
    } else {
      setScanPulse((prev) => Math.max(prev - 10, 0));
    }
  }, []);

  // When pulse hits 100, auto-register
  useEffect(() => {
    if (scanPulse >= 100 && faceStatus === 'searching' && !registerAttemptedRef.current) {
      registerAttemptedRef.current = true;
      setFaceStatus('detected');

      setTimeout(async () => {
        setFaceStatus('registering');

        if (!videoRef.current || !canvasRef.current || !sdkRef.current) {
          setFaceStatus('error');
          setFaceError('Camera not ready. Please try again.');
          stopCamera();
          return;
        }

        try {
          // Capture face image
          const video = videoRef.current;
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas context not available');
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.95);

          // Analyze face with SDK
          const analysis = await sdkRef.current.analyzeFace(imageData);
          if (!analysis || analysis.rejectionReason) {
            setFaceStatus('error');
            setFaceError(analysis?.rejectionReason || 'Face quality too low. Please try again.');
            stopCamera();
            return;
          }

          // Send descriptor to API
          const res = await fetch('/api/auth/facecard/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profileId: 'new',
              descriptor: Array.from(analysis.descriptor),
              qualityScore: analysis.qualityScore,
            }),
          });

          const data = await res.json();
          console.log('FaceCard register response:', data);

          if (data.success) {
            setFaceStatus('success');
            stopCamera();
            mutateFaceCard();
          } else {
            setFaceStatus('error');
            setFaceError(data.error || 'Failed to register FaceCard.');
            stopCamera();
          }
        } catch (err) {
          console.error('FaceCard register error:', err);
          setFaceStatus('error');
          setFaceError('Connection error. Please try again.');
          stopCamera();
        }
      }, 600);
    }
  }, [scanPulse, faceStatus, stopCamera, mutateFaceCard]);

  const startCamera = useCallback(async () => {
    setFaceStatus('initializing');
    setFaceError('');
    setScanPulse(0);
    registerAttemptedRef.current = false;
    try {
      // Initialize SDK
      if (!sdkRef.current) {
        sdkRef.current = new FaceSmashClient({
          apiUrl: 'https://api.facesmash.app',
          appId: 'devportal',
        });
        await sdkRef.current.init();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setTimeout(() => {
        setFaceStatus('searching');
        scanIntervalRef.current = setInterval(autoDetectFace, 400);
      }, 800);
    } catch (err) {
      console.error('Camera start error:', err);
      setFaceStatus('error');
      setFaceError('Camera access denied. Please allow camera permissions.');
    }
  }, [autoDetectFace]);

  const closeFaceRegister = useCallback(() => {
    setShowFaceRegister(false);
    setFaceStatus('idle');
    setFaceError('');
    setScanPulse(0);
    stopCamera();
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium bold text-gray-900 mb-6">
        Security Settings
      </h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={passwordAction}>
            <div>
              <Label htmlFor="current-password" className="mb-2">
                Current Password
              </Label>
              <Input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.currentPassword}
              />
            </div>
            <div>
              <Label htmlFor="new-password" className="mb-2">
                New Password
              </Label>
              <Input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.newPassword}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="mb-2">
                Confirm New Password
              </Label>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={passwordState.confirmPassword}
              />
            </div>
            {passwordState.error && (
              <p className="text-red-500 text-sm">{passwordState.error}</p>
            )}
            {passwordState.success && (
              <p className="text-green-500 text-sm">{passwordState.success}</p>
            )}
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isPasswordPending}
            >
              {isPasswordPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* FaceCard Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-emerald-500" />
            FaceCard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faceCardData?.hasCard ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <ShieldCheck className="h-8 w-8 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-emerald-900">FaceCard Linked</p>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    Your face is registered as an alternative sign-in method. You can use it to sign in without a password.
                  </p>
                  <p className="text-xs text-emerald-600/60 mt-1">
                    Linked since {new Date(faceCardData.created).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={async () => {
                  if (!confirm('Remove your FaceCard? You will no longer be able to sign in with your face.')) return;
                  try {
                    const res = await fetch('/api/auth/facecard/register', {
                      method: 'DELETE',
                    });
                    if (res.ok) mutateFaceCard();
                  } catch {}
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove FaceCard
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Register a FaceCard to sign in with your face instead of a password. Your face data is processed on-device and never stored in plain form.
              </p>

              {!showFaceRegister ? (
                <Button
                  onClick={() => {
                    setShowFaceRegister(true);
                    startCamera();
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <ScanFace className="mr-2 h-4 w-4" />
                  Register FaceCard
                </Button>
              ) : (
                <div className="max-w-md mx-auto rounded-2xl border border-gray-200 overflow-hidden">
                  {/* Camera viewport with scan ring */}
                  <div className="relative aspect-video bg-black">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Animated scan ring */}
                    {(faceStatus === 'searching' || faceStatus === 'initializing') && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-44 h-44">
                          <div
                            className="absolute inset-0 rounded-full transition-all duration-500"
                            style={{
                              boxShadow: `0 0 ${20 + scanPulse * 0.4}px ${scanPulse * 0.15}px rgba(16, 185, 129, ${0.1 + scanPulse * 0.004})`,
                            }}
                          />
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                            <circle cx="88" cy="88" r="84" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                            <circle
                              cx="88" cy="88" r="84"
                              fill="none"
                              stroke={scanPulse > 60 ? 'rgba(16,185,129,0.8)' : 'rgba(16,185,129,0.35)'}
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray={`${(scanPulse / 100) * 528} 528`}
                              className="transition-all duration-300"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ScanFace
                              className="h-7 w-7 transition-colors duration-300"
                              style={{
                                color: scanPulse > 60 ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.25)',
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Detected flash */}
                    {faceStatus === 'detected' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-44 h-44">
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                            <circle cx="88" cy="88" r="84" fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="3" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ScanFace className="h-7 w-7 text-emerald-400 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Registering */}
                    {faceStatus === 'registering' && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
                        <p className="text-white/60 text-xs mt-3 font-medium tracking-wide">CREATING FACECARD...</p>
                      </div>
                    )}

                    {/* Success */}
                    {faceStatus === 'success' && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle className="h-8 w-8 text-emerald-400" />
                        </div>
                        <p className="text-emerald-400 text-sm mt-3 font-medium">FaceCard registered!</p>
                      </div>
                    )}

                    {/* Error */}
                    {faceStatus === 'error' && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center px-6">
                        <AlertTriangle className="h-7 w-7 text-amber-400" />
                        <p className="text-white/60 text-xs mt-3 text-center leading-relaxed">{faceError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setFaceError('');
                            setScanPulse(0);
                            startCamera();
                          }}
                          className="mt-4 px-4 py-2 text-xs font-medium text-white/70 bg-white/[0.1] hover:bg-white/[0.15] rounded-lg transition-colors"
                        >
                          Try again
                        </button>
                      </div>
                    )}

                    {/* Close button */}
                    {faceStatus !== 'success' && faceStatus !== 'registering' && (
                      <button
                        type="button"
                        onClick={closeFaceRegister}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-white/60" />
                      </button>
                    )}
                  </div>

                  {/* Status text */}
                  <div className="px-4 py-3 bg-gray-50 border-t text-center">
                    {faceStatus === 'initializing' && (
                      <p className="text-xs text-gray-400">Starting camera...</p>
                    )}
                    {faceStatus === 'searching' && (
                      <p className="text-xs text-gray-400">Position your face in the ring — we&apos;ll register automatically</p>
                    )}
                    {faceStatus === 'detected' && (
                      <p className="text-xs text-emerald-600 font-medium">Face detected</p>
                    )}
                    {faceStatus === 'success' && (
                      <Button
                        type="button"
                        onClick={closeFaceRegister}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        size="sm"
                      >
                        Done
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Delete Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Account deletion is non-reversable. Please proceed with caution.
          </p>
          <form action={deleteAction} className="space-y-4">
            <div>
              <Label htmlFor="delete-password" className="mb-2">
                Confirm Password
              </Label>
              <Input
                id="delete-password"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={100}
                defaultValue={deleteState.password}
              />
            </div>
            {deleteState.error && (
              <p className="text-red-500 text-sm">{deleteState.error}</p>
            )}
            <Button
              type="submit"
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
