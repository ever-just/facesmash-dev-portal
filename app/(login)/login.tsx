'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, signUp } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ScanFace, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { ActionState } from '@/lib/auth/middleware';
import dynamic from 'next/dynamic';

const SignUpForm = dynamic(() => import('./SignUpForm'), {
  loading: () => <div className="h-96" />,
  ssr: false,
});

// Pinned model URL
const FACE_API_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';

// Tracking constants
const TRACKING_INTERVAL_MS = 200;
const DESCRIPTOR_START_FRAME = 5;
const DESCRIPTOR_EVERY_N_FRAMES = 3;

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');
  
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );

  // FaceCard login state
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [faceStatus, setFaceStatus] = useState<
    'idle' | 'initializing' | 'searching' | 'detected' | 'authenticating' | 'success' | 'error'
  >('idle');
  const [faceError, setFaceError] = useState('');
  const [scanPulse, setScanPulse] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const authAttemptedRef = useRef(false);
  const sdkRef = useRef<any>(null);
  const sdkModuleRef = useRef<any>(null);
  const livenessRef = useRef<any>(null);
  const frameCountRef = useRef(0);

  type DescriptorEntry = { descriptor: Float32Array; qualityScore: number };
  const bestDescriptorRef = useRef<DescriptorEntry | null>(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    authAttemptedRef.current = false;
  }, []);

  const closeFaceLogin = useCallback(() => {
    setShowFaceLogin(false);
    setFaceStatus('idle');
    setFaceError('');
    setScanPulse(0);
    stopCamera();
  }, [stopCamera]);

  const authenticateWithDescriptor = useCallback(async (descriptor: Float32Array) => {
    if (authAttemptedRef.current) return;
    authAttemptedRef.current = true;
    setFaceStatus('detected');

    setTimeout(async () => {
      setFaceStatus('authenticating');
      try {
        const res = await fetch('/api/auth/facecard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptor: Array.from(descriptor) }),
        });

        const data = await res.json();
        if (data.success) {
          setFaceStatus('success');
          stopCamera();
          setTimeout(() => router.push(redirect || '/dashboard'), 1200);
        } else if (data.action === 'create_account') {
          setFaceStatus('error');
          setFaceError('Face verified, but no account found. Sign up first.');
          stopCamera();
        } else {
          setFaceStatus('error');
          setFaceError(data.error || 'Authentication failed.');
          stopCamera();
        }
      } catch (err) {
        console.error('FaceCard login error:', err);
        setFaceStatus('error');
        setFaceError('Connection error. Please try again.');
        stopCamera();
      }
    }, 400);
  }, [redirect, router, stopCamera]);

  const trackFace = useCallback(async () => {
    if (!videoRef.current || authAttemptedRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    const sdk = sdkModuleRef.current;
    if (!sdk) return;

    frameCountRef.current++;
    const frameNum = frameCountRef.current;

    const tinyResult = await sdk.detectFaceTiny(video);
    if (!tinyResult) {
      setScanPulse((prev: number) => Math.max(prev - 5, 0));
      return;
    }

    const box = tinyResult.detection.box;
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const sizeCheck = sdk.validateFaceSize(box, videoWidth, videoHeight);

    if (!sizeCheck.isValid) {
      setScanPulse((prev: number) => Math.max(prev - 3, 0));
      return;
    }

    const { avgEAR } = sdk.getEyeAspectRatios(tinyResult.landmarks);
    const headPose = sdk.estimateHeadPose(tinyResult.landmarks, box);

    livenessRef.current = sdk.updateLivenessState(livenessRef.current, avgEAR, headPose);
    const liveness = livenessRef.current;

    setScanPulse(Math.round(liveness.confidence * 100));

    if (
      frameNum >= DESCRIPTOR_START_FRAME &&
      frameNum % DESCRIPTOR_EVERY_N_FRAMES === 0 &&
      !bestDescriptorRef.current
    ) {
      const ssdResult = await sdk.detectFaceSsd(video, 0.3);
      if (ssdResult) {
        let qualityScore = Math.min(ssdResult.detection.score, 1.0);
        const faceArea = ssdResult.detection.box.width * ssdResult.detection.box.height;
        const imageArea = videoWidth * videoHeight;
        const sizeRatio = Math.min(faceArea / imageArea, 0.3) / 0.3;
        qualityScore *= (0.8 + sizeRatio * 0.2);

        const ssdPose = sdk.estimateHeadPose(ssdResult.landmarks, ssdResult.detection.box);
        if (!ssdPose.isFrontal) {
          qualityScore *= Math.max(0.5, 1 - (Math.abs(ssdPose.yaw) + Math.abs(ssdPose.pitch)) * 0.3);
        }

        const shouldUpdate = bestDescriptorRef.current === null || qualityScore > (bestDescriptorRef.current as DescriptorEntry).qualityScore;
        if (shouldUpdate) {
          bestDescriptorRef.current = { descriptor: ssdResult.descriptor, qualityScore };
        }
      }
    }

    if (liveness.isLive && bestDescriptorRef.current) {
      authenticateWithDescriptor(bestDescriptorRef.current.descriptor);
      return;
    }

    if (liveness.isLive && !bestDescriptorRef.current) {
      const ssdResult = await sdk.detectFaceSsd(video, 0.3);
      if (ssdResult) {
        bestDescriptorRef.current = { descriptor: ssdResult.descriptor, qualityScore: ssdResult.detection.score };
        authenticateWithDescriptor(ssdResult.descriptor);
      }
    }
  }, [authenticateWithDescriptor]);

  const startCamera = useCallback(async () => {
    setFaceStatus('initializing');
    setFaceError('');
    setScanPulse(0);
    authAttemptedRef.current = false;
    frameCountRef.current = 0;
    bestDescriptorRef.current = null;

    try {
      // Lazy load SDK only when user initiates FaceCard login
      if (!sdkRef.current) {
        const sdkModule = await import('@facesmash/sdk');
        sdkModuleRef.current = sdkModule;
        sdkRef.current = new sdkModule.FaceSmashClient({
          apiUrl: 'https://api.facesmash.app',
          modelUrl: FACE_API_MODEL_URL,
        });
        await sdkRef.current.init();
      }

      livenessRef.current = sdkModuleRef.current.createLivenessState();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      setTimeout(() => {
        setFaceStatus('searching');
        scanIntervalRef.current = setInterval(trackFace, TRACKING_INTERVAL_MS);
      }, 800);
    } catch (err) {
      console.error('Camera start error:', err);
      setFaceStatus('error');
      setFaceError('Camera access denied. Please allow camera permissions.');
    }
  }, [trackFace]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Show signup form if mode is signup
  if (mode === 'signup') {
    return <SignUpForm redirect={redirect} priceId={priceId} inviteId={inviteId} />;
  }

  // Sign-in form only
  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#07080A] relative overflow-hidden">
      <div className="absolute top-[-30%] left-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/[0.02] blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Image
            src="/facesmash-logo.png"
            alt="FaceSmash"
            width={40}
            height={40}
            className="rounded-lg shadow-lg shadow-emerald-500/20"
            priority
          />
          <span className="text-xl font-semibold tracking-tight text-white">FaceSmash</span>
        </div>

        <h2 className="text-center text-2xl font-bold text-white">Welcome back</h2>
        <p className="mt-2 text-center text-sm text-white/40">Sign in to the Developer Portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm">
          {!showFaceLogin && (
            <form className="space-y-5" action={formAction}>
              <input type="hidden" name="redirect" value={redirect || ''} />
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-white/70">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={50}
                  className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-white/70">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={100}
                  className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  placeholder="Enter your password"
                />
              </div>

              {state?.error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {state.error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl transition-colors"
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          )}

          {/* FaceCard sign-in option */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.06]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-[#0c0d10] text-white/30">or</span>
              </div>
            </div>

            {!showFaceLogin ? (
              <button
                type="button"
                onClick={() => {
                  setShowFaceLogin(true);
                  // SDK import happens when camera starts, not here
                  startCamera();
                }}
                className="mt-4 w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-white/60 hover:text-white text-sm font-medium transition-all group cursor-pointer"
              >
                <ScanFace className="size-4 text-emerald-400 group-hover:text-emerald-300" />
                Sign in with FaceCard
              </button>
            ) : (
              <div className="mt-4 max-w-md mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <div className="relative aspect-video bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />

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
                          <circle cx="88" cy="88" r="84" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
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
                            className="size-7 transition-colors duration-300"
                            style={{
                              color: scanPulse > 60 ? 'rgba(16,185,129,0.9)' : 'rgba(255,255,255,0.25)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {faceStatus === 'detected' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative w-44 h-44">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                          <circle cx="88" cy="88" r="84" fill="none" stroke="rgba(16,185,129,0.9)" strokeWidth="3" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ScanFace className="size-7 text-emerald-400 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  )}

                  {faceStatus === 'authenticating' && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                      <Loader2 className="size-8 text-emerald-400 animate-spin" />
                      <p className="text-white/60 text-xs mt-3 font-medium tracking-wide">VERIFYING...</p>
                    </div>
                  )}

                  {faceStatus === 'success' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="text-center">
                        <CheckCircle className="size-12 text-emerald-400 mx-auto mb-3" />
                        <p className="text-white font-semibold">Sign in successful!</p>
                      </div>
                    </div>
                  )}

                  {faceStatus === 'error' && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                      <AlertTriangle className="size-10 text-red-400 mb-2" />
                      <p className="text-white/80 text-center text-sm">{faceError}</p>
                      <Button
                        onClick={closeFaceLogin}
                        variant="outline"
                        size="sm"
                        className="mt-4 text-white border-white/20 hover:bg-white/10"
                      >
                        Try again
                      </Button>
                    </div>
                  )}
                </div>

                <button
                  onClick={closeFaceLogin}
                  className="w-full px-4 py-3 text-center text-white/40 hover:text-white/60 text-sm transition-colors border-t border-white/[0.06]"
                >
                  <X className="h-4 w-4 mx-auto" />
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-white/40">
          Don't have an account?{' '}
          <Link href="/signup" className="text-emerald-400 hover:text-emerald-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
