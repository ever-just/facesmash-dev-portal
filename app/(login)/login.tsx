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
import { Loader2, ScanFace, CheckCircle, AlertTriangle, X, User, Building2, ArrowRight, Globe, Users, ArrowLeft } from 'lucide-react';
import { ActionState } from '@/lib/auth/middleware';

// Dynamic import to avoid SSR issues
let FaceSmashClient: any = null;
if (typeof window !== 'undefined') {
  import('@facesmash/sdk').then(module => {
    FaceSmashClient = module.FaceSmashClient;
  });
}

const COMPANY_SIZES = [
  { value: '1-5', label: '1–5' },
  { value: '6-20', label: '6–20' },
  { value: '21-100', label: '21–100' },
  { value: '101-500', label: '101–500' },
  { value: '500+', label: '500+' },
];

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

  // Multi-step sign-up state
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<'personal' | 'company'>('personal');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companySize, setCompanySize] = useState('');

  // FaceCard login state
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  const [faceStatus, setFaceStatus] = useState<
    'idle' | 'initializing' | 'searching' | 'detected' | 'authenticating' | 'success' | 'error'
  >('idle');
  const [faceError, setFaceError] = useState('');
  const [scanPulse, setScanPulse] = useState(0); // 0-100 for ring animation
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const authAttemptedRef = useRef(false);
  const sdkRef = useRef<any>(null);

  const totalSteps = mode === 'signup' ? (accountType === 'company' ? 3 : 2) : 1;

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

  // Auto-detect: capture frame and try to authenticate
  const autoDetectAndAuth = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (authAttemptedRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) return; // not enough data

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Simulate face detection via pixel brightness check in center region
    // (In production, this uses the SDK's face-api detection)
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
    let totalBrightness = 0;
    let skinTonePixels = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      totalBrightness += (r + g + b) / 3;
      // Basic skin-tone heuristic
      if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
        skinTonePixels++;
      }
    }
    const avgBrightness = totalBrightness / (pixels.length / 4);
    const skinRatio = skinTonePixels / (pixels.length / 4);

    // If we detect something face-like, ramp up the pulse
    if (avgBrightness > 40 && skinRatio > 0.15) {
      setScanPulse((prev) => Math.min(prev + 25, 100));
    } else {
      setScanPulse((prev) => Math.max(prev - 10, 0));
    }
  }, []);

  // When pulse hits 100, auto-authenticate
  useEffect(() => {
    if (scanPulse >= 100 && faceStatus === 'searching' && !authAttemptedRef.current) {
      authAttemptedRef.current = true;
      setFaceStatus('detected');

      // Brief pause to show "detected" state, then authenticate
      setTimeout(async () => {
        setFaceStatus('authenticating');

        if (!videoRef.current || !canvasRef.current || !sdkRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        try {
          const imageData = canvas.toDataURL('image/jpeg', 0.95);

          // Analyze face with SDK
          const analysis = await sdkRef.current.analyzeFace(imageData);
          if (!analysis || analysis.rejectionReason) {
            setFaceStatus('error');
            setFaceError(analysis?.rejectionReason || 'Face quality too low. Please try again.');
            stopCamera();
            return;
          }

          // Send descriptor to API for verification
          const res = await fetch('/api/auth/facecard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              descriptor: Array.from(analysis.descriptor),
            }),
          });

          const data = await res.json();
          console.log('FaceCard login response:', data);

          if (data.success) {
            setFaceStatus('success');
            stopCamera();
            setTimeout(() => {
              router.push(redirect || '/dashboard');
            }, 1200);
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
      }, 600);
    }
  }, [scanPulse, faceStatus, redirect, router, stopCamera]);

  const startCamera = useCallback(async () => {
    setFaceStatus('initializing');
    setFaceError('');
    setScanPulse(0);
    authAttemptedRef.current = false;
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
      // Start auto-scanning after a brief warm-up
      setTimeout(() => {
        setFaceStatus('searching');
        scanIntervalRef.current = setInterval(autoDetectAndAuth, 400);
      }, 800);
    } catch (err) {
      console.error('Camera start error:', err);
      setFaceStatus('error');
      setFaceError('Camera access denied. Please allow camera permissions.');
    }
  }, [autoDetectAndAuth]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#07080A] relative overflow-hidden">
      {/* Background ambient */}
      <div className="absolute top-[-30%] left-[20%] w-[500px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/[0.02] blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Image
            src="/facesmash-logo.png"
            alt="FaceSmash"
            width={40}
            height={40}
            className="rounded-lg shadow-lg shadow-emerald-500/20"
          />
          <span className="text-xl font-semibold tracking-tight text-white">FaceSmash</span>
        </div>

        <h2 className="text-center text-2xl font-bold text-white">
          {mode === 'signin'
            ? 'Welcome back'
            : step === 1
              ? 'Create your account'
              : step === 2 && accountType === 'company'
                ? 'Company details'
                : 'Set your credentials'}
        </h2>
        <p className="mt-2 text-center text-sm text-white/40">
          {mode === 'signin'
            ? 'Sign in to the Developer Portal'
            : step === 1
              ? 'Choose your account type to get started'
              : step === 2 && accountType === 'company'
                ? 'Tell us about your organization'
                : 'Almost there — secure your account'}
        </p>

        {/* Step indicator for sign-up */}
        {mode === 'signup' && (
          <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i + 1 <= step
                    ? 'w-8 bg-emerald-500'
                    : 'w-4 bg-white/10'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm">

          {/* ============ SIGN IN ============ */}
          {mode === 'signin' && (
            <>
              {!showFaceLogin && (
                <form className="space-y-5" action={formAction}>
                  <input type="hidden" name="redirect" value={redirect || ''} />
                  <input type="hidden" name="priceId" value={priceId || ''} />
                  <input type="hidden" name="inviteId" value={inviteId || ''} />

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-white/70">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      defaultValue={state.email}
                      required
                      maxLength={50}
                      className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                      placeholder="you@company.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-medium text-white/70">
                      Password
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      defaultValue={state.password}
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
                      startCamera();
                    }}
                    className="mt-4 w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-white/60 hover:text-white text-sm font-medium transition-all group cursor-pointer"
                  >
                    <ScanFace className="size-4 text-emerald-400 group-hover:text-emerald-300" />
                    Sign in with FaceCard
                  </button>
                ) : (
                  <div className="mt-4 max-w-md mx-auto rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                    {/* Camera viewport with scan ring overlay */}
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
                            {/* Outer glow */}
                            <div
                              className="absolute inset-0 rounded-full transition-all duration-500"
                              style={{
                                boxShadow: `0 0 ${20 + scanPulse * 0.4}px ${scanPulse * 0.15}px rgba(16, 185, 129, ${0.1 + scanPulse * 0.004})`,
                              }}
                            />
                            {/* Progress ring via conic gradient */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                              <circle
                                cx="88" cy="88" r="84"
                                fill="none"
                                stroke="rgba(255,255,255,0.06)"
                                strokeWidth="3"
                              />
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
                            {/* Center icon */}
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

                      {/* Detected flash */}
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

                      {/* Authenticating */}
                      {faceStatus === 'authenticating' && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                          <Loader2 className="size-8 text-emerald-400 animate-spin" />
                          <p className="text-white/60 text-xs mt-3 font-medium tracking-wide">VERIFYING...</p>
                        </div>
                      )}

                      {/* Success */}
                      {faceStatus === 'success' && (
                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <CheckCircle className="size-8 text-emerald-400" />
                          </div>
                          <p className="text-emerald-400 text-sm mt-3 font-medium">Welcome back</p>
                        </div>
                      )}

                      {/* Error */}
                      {faceStatus === 'error' && (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center px-6">
                          <AlertTriangle className="size-7 text-amber-400" />
                          <p className="text-white/60 text-xs mt-3 text-center leading-relaxed">{faceError}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setFaceError('');
                              setScanPulse(0);
                              startCamera();
                            }}
                            className="mt-4 px-4 py-2 text-xs font-medium text-white/70 bg-white/[0.08] hover:bg-white/[0.12] rounded-lg transition-colors"
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {/* Close button */}
                      {faceStatus !== 'success' && faceStatus !== 'authenticating' && (
                        <button
                          type="button"
                          onClick={closeFaceLogin}
                          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center transition-colors"
                        >
                          <X className="size-3.5 text-white/60" />
                        </button>
                      )}
                    </div>

                    {/* Status text */}
                    <div className="px-4 py-3 text-center">
                      {(faceStatus === 'initializing' || faceStatus === 'searching') && (
                        <p className="text-[11px] text-white/30 leading-relaxed">
                          {faceStatus === 'initializing' ? 'Starting camera...' : 'Look at the camera — we\'ll recognize you automatically'}
                        </p>
                      )}
                      {faceStatus === 'detected' && (
                        <p className="text-[11px] text-emerald-400/70 font-medium">Face detected</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <span className="text-sm text-white/30">New to FaceSmash? </span>
                <Link
                  href={`/sign-up${redirect ? `?redirect=${redirect}` : ''}${priceId ? `&priceId=${priceId}` : ''}`}
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Create an account
                </Link>
              </div>
            </>
          )}

          {/* ============ SIGN UP — STEP 1: Account Type ============ */}
          {mode === 'signup' && step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('personal')}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                    accountType === 'personal'
                      ? 'border-emerald-500/50 bg-emerald-500/[0.06] ring-1 ring-emerald-500/20'
                      : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'
                  }`}
                >
                  <div className={`size-10 rounded-xl flex items-center justify-center ${
                    accountType === 'personal'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.06] text-white/40'
                  }`}>
                    <User className="size-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      accountType === 'personal' ? 'text-white' : 'text-white/60'
                    }`}>Personal</p>
                    <p className="text-xs text-white/30 mt-0.5">Individual use</p>
                  </div>
                  {accountType === 'personal' && (
                    <div className="absolute top-2.5 right-2.5 size-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAccountType('company')}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border transition-all ${
                    accountType === 'company'
                      ? 'border-emerald-500/50 bg-emerald-500/[0.06] ring-1 ring-emerald-500/20'
                      : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]'
                  }`}
                >
                  <div className={`size-10 rounded-xl flex items-center justify-center ${
                    accountType === 'company'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.06] text-white/40'
                  }`}>
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      accountType === 'company' ? 'text-white' : 'text-white/60'
                    }`}>Company</p>
                    <p className="text-xs text-white/30 mt-0.5">Team & org</p>
                  </div>
                  {accountType === 'company' && (
                    <div className="absolute top-2.5 right-2.5 size-2 rounded-full bg-emerald-400" />
                  )}
                </button>
              </div>

              {/* Name field */}
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-white/70">
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  placeholder="John Doe"
                />
              </div>

              <Button
                type="button"
                onClick={() => {
                  if (!name.trim()) return;
                  setStep(accountType === 'company' ? 2 : totalSteps);
                }}
                disabled={!name.trim()}
                className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl transition-colors disabled:opacity-40"
              >
                Continue
                <ArrowRight className="ml-2 size-4" />
              </Button>

              <div className="text-center">
                <span className="text-sm text-white/30">Already have an account? </span>
                <Link
                  href={`/sign-in${redirect ? `?redirect=${redirect}` : ''}${priceId ? `&priceId=${priceId}` : ''}`}
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </div>
          )}

          {/* ============ SIGN UP — STEP 2: Company Details (company only) ============ */}
          {mode === 'signup' && step === 2 && accountType === 'company' && (
            <div className="space-y-5">
              <div>
                <Label htmlFor="companyName" className="text-sm font-medium text-white/70">
                  Company name
                </Label>
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/25" />
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    maxLength={200}
                    className="h-11 pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="companyWebsite" className="text-sm font-medium text-white/70">
                  Website <span className="text-white/20">(optional)</span>
                </Label>
                <div className="relative mt-1.5">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/25" />
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    maxLength={500}
                    className="h-11 pl-10 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    placeholder="https://acme.com"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-white/70 mb-3 block">
                  <Users className="inline size-3.5 mr-1.5 -mt-0.5" />
                  Company size
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {COMPANY_SIZES.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      onClick={() => setCompanySize(size.value)}
                      className={`py-2 px-2 text-xs font-medium rounded-lg border transition-all ${
                        companySize === size.value
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/[0.08] text-white/40 hover:text-white/60 hover:border-white/[0.12]'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="h-11 px-4 text-white/40 hover:text-white hover:bg-white/[0.04] rounded-xl"
                >
                  <ArrowLeft className="mr-1.5 size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!companyName.trim()) return;
                    setStep(3);
                  }}
                  disabled={!companyName.trim()}
                  className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl transition-colors disabled:opacity-40"
                >
                  Continue
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============ SIGN UP — FINAL STEP: Credentials ============ */}
          {mode === 'signup' && step === totalSteps && step > 1 && (
            <form className="space-y-5" action={formAction}>
              <input type="hidden" name="redirect" value={redirect || ''} />
              <input type="hidden" name="priceId" value={priceId || ''} />
              <input type="hidden" name="inviteId" value={inviteId || ''} />
              <input type="hidden" name="name" value={name} />
              <input type="hidden" name="accountType" value={accountType} />
              {accountType === 'company' && (
                <>
                  <input type="hidden" name="companyName" value={companyName} />
                  <input type="hidden" name="companyWebsite" value={companyWebsite} />
                  <input type="hidden" name="companySize" value={companySize} />
                </>
              )}

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-white/70">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={255}
                  className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium text-white/70">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={100}
                  className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                  placeholder="Min. 8 characters"
                />
                <p className="mt-1.5 text-xs text-white/20">Must be at least 8 characters</p>
              </div>

              {state?.error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {state.error}
                </div>
              )}

              {/* Summary badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/30">
                {accountType === 'company' ? (
                  <Building2 className="size-3.5 text-emerald-400/60" />
                ) : (
                  <User className="size-3.5 text-emerald-400/60" />
                )}
                <span className="text-white/50 font-medium">{name}</span>
                {accountType === 'company' && companyName && (
                  <>
                    <span className="text-white/15">·</span>
                    <span>{companyName}</span>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(accountType === 'company' ? 2 : 1)}
                  className="h-11 px-4 text-white/40 hover:text-white hover:bg-white/[0.04] rounded-xl"
                >
                  <ArrowLeft className="mr-1.5 size-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  className="flex-1 h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl transition-colors"
                >
                  {pending ? (
                    <>
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </div>

              {/* FaceCard hint */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04]">
                <ScanFace className="size-5 text-emerald-400 flex-shrink-0" />
                <p className="text-[13px] text-white/40 leading-snug">
                  After creating your account, you can <span className="text-emerald-400/80">register a FaceCard</span> in Security Settings to sign in with your face.
                </p>
              </div>

              <div className="text-center">
                <span className="text-sm text-white/30">Already have an account? </span>
                <Link
                  href={`/sign-in${redirect ? `?redirect=${redirect}` : ''}${priceId ? `&priceId=${priceId}` : ''}`}
                  className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-white/15">
          By continuing, you agree to our{' '}
          <a href="https://facesmash.app/terms" className="text-white/25 hover:text-white/40 underline" target="_blank" rel="noopener noreferrer">Terms</a>
          {' '}and{' '}
          <a href="https://facesmash.app/privacy" className="text-white/25 hover:text-white/40 underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
