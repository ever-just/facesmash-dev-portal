'use client';

import Image from 'next/image';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SignUpForm from '../SignUpForm';

function SignUpView() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const priceId = searchParams.get('priceId');
  const inviteId = searchParams.get('inviteId');

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

        <h1 className="text-center text-2xl font-bold text-white">Create your account</h1>
        <p className="mt-2 text-center text-sm text-white/40">Get started with the Developer Portal</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 backdrop-blur-sm">
          <SignUpForm redirect={redirect} priceId={priceId} inviteId={inviteId} />
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#07080A]" />}>
      <SignUpView />
    </Suspense>
  );
}
