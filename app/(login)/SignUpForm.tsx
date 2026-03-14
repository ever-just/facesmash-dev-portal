'use client';

import { useActionState, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signUp } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from 'A/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ActionState } from '@/lib/auth/middleware';

interface SignUpFormProps {
  redirect?: string | null;
  priceId?: string | null;
  inviteId?: string | null;
}

export default function SignUpForm({ redirect, priceId, inviteId }: SignUpFormProps) {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'personal' | 'company'>('personal');
  
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    signUp,
    { error: '' }
  (®
  Account Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-white/70">Account Type</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('personal')}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                    accountType === 'personal'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'border-white/[0.08] text-white/60 hover:border-white/[0.12]'
                  }`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('company')}
                  className={`flex-1 py-2 px-3 rounded-lg border transition-all text-sm font-medium ${
                    accountType === 'company'
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'border-white/[0.08] text-white/60 hover:border-white/[0.12]'
                  }`}
                >
                  Company
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-white/70">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                maxLength={100}
                className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-white/70">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                placeholder="you@company.com"
              />
            </div>

            {/* Company Fields - Only show for company accounts */}
            {accountType === 'company' && (
              <>
                <div>
                  <Label htmlFor="companyName" className="text-sm font-medium text-white/70">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    type="text"
                    maxLength={100}
                    className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <Label htmlFor="companyWebsite" className="text-sm font-medium text-white/70">Website</Label>
                  <Input
                    id="companyWebsite"
                    name="companyWebsite"
                    type="url"
                    maxLength={255}
                    className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="companySize" className="text-sm font-medium text-white/70">Company Size</Label>
                  <select
                    id="companySize"
                    name="companySize"
                    className="w-full h-11 bg-white/[0.04] border border-white/[0.08] text-white rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20 px-3 py-2 appearance-none"
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
              </>
            )}

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-white/70">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
                className="mt-1.5 h-11 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
                placeholder="Min 8 characters"
              />
            </div>

            {/* Error Message */}
            {state?.error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-xl transition-colors"
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Creating account...
                </>
              ) : (
                'Sign up'
              )}
            </Button>
          </form>

          {/* Sign In Link */}
          <p className="mt-6 text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link href="/signin" className="text-emerald-400 hover:text-emerald-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  (®

