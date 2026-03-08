import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, ScanFace, KeyRound, BarChart3, Code2, Shield, Zap, BookOpen, ExternalLink, Github, Package } from 'lucide-react';

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
                Face Authentication
                <span className="block text-emerald-500">For Your Apps</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Add face login, registration, and verification to any app
                with a simple API call. No ML expertise required.
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0 flex flex-wrap gap-3">
                <Link href="/sign-up">
                  <Button
                    size="lg"
                    className="text-lg rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Get API Key
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="https://docs.facesmash.app" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="text-lg rounded-full">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Read Docs
                  </Button>
                </a>
              </div>
              <div className="mt-4 flex items-center gap-2 sm:justify-center lg:justify-start">
                <pre className="bg-gray-100 text-gray-600 rounded-lg px-4 py-2 text-sm font-mono">
                  npm install @facesmash/sdk
                </pre>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <div className="w-full bg-gray-900 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-gray-500 text-xs">api-example.ts</span>
                </div>
                <pre className="text-sm text-gray-300 font-mono leading-relaxed overflow-x-auto">
{`import { FaceSmashClient } from '@facesmash/sdk';

const facesmash = new FaceSmashClient({
  apiKey: process.env.FACESMASH_API_KEY,
});

// Detect faces in an image
const detection = await facesmash.detect({
  image: base64Image,
});

// Register a user's face
await facesmash.register({
  userId: 'user_123',
  descriptors: detection.descriptors,
});

// Authenticate with face
const login = await facesmash.login({
  descriptor: faceDescriptor,
});
// => { matched: true, userId: 'user_123' }`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div>
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white">
                <ScanFace className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  Face Detection & Recognition
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  Detect faces, extract descriptors, and match identities
                  with a single API call. Powered by state-of-the-art ML models.
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  Secure by Default
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  API keys are one-way hashed. Rate limiting, audit logs, and
                  IP whitelisting keep your integration safe.
                </p>
              </div>
            </div>

            <div className="mt-10 lg:mt-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-emerald-500 text-white">
                <Code2 className="h-6 w-6" />
              </div>
              <div className="mt-5">
                <h2 className="text-lg font-medium text-gray-900">
                  SDK & REST API
                </h2>
                <p className="mt-2 text-base text-gray-500">
                  Use our TypeScript SDK with React hooks, or call the REST API
                  directly from any language or framework.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Video */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">See It in Action</h2>
          <p className="text-gray-500 text-center mb-8">Watch how FaceSmash works — from registration to login</p>
          <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-black aspect-video">
            <video
              src="https://facesmash.app/landing-promo.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-center text-gray-400 text-xs mt-3">
            FaceSmash demo — passwordless login in under 2 seconds
          </p>
        </div>
      </section>

      {/* Ecosystem cross-links */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">The FaceSmash Ecosystem</h2>
          <p className="text-gray-500 text-center mb-10 max-w-2xl mx-auto">
            Everything you need to build, integrate, and ship face authentication.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <a href="https://facesmash.app" target="_blank" rel="noopener noreferrer" className="group block p-6 rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center mb-4">
                <Image src="/facesmash-logo.png" alt="FaceSmash" width={24} height={24} className="rounded" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">FaceSmash App</h3>
              <p className="text-sm text-gray-500">End-user face login & registration. Try the live demo.</p>
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600 mt-3 group-hover:gap-1.5 transition-all">
                Visit app <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            <a href="https://docs.facesmash.app" target="_blank" rel="noopener noreferrer" className="group block p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center mb-4">
                <BookOpen className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Documentation</h3>
              <p className="text-sm text-gray-500">Guides, SDK reference, API docs, security architecture.</p>
              <span className="inline-flex items-center gap-1 text-sm text-purple-600 mt-3 group-hover:gap-1.5 transition-all">
                Read docs <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            <a href="https://www.npmjs.com/package/@facesmash/sdk" target="_blank" rel="noopener noreferrer" className="group block p-6 rounded-xl border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-teal-50 flex items-center justify-center mb-4">
                <Package className="h-5 w-5 text-teal-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">SDK on npm</h3>
              <p className="text-sm text-gray-500">@facesmash/sdk — React components, hooks, vanilla JS client.</p>
              <span className="inline-flex items-center gap-1 text-sm text-teal-600 mt-3 group-hover:gap-1.5 transition-all">
                View package <ExternalLink className="h-3 w-3" />
              </span>
            </a>

            <a href="https://github.com/ever-just/facesmash.app" target="_blank" rel="noopener noreferrer" className="group block p-6 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center mb-4">
                <Github className="h-5 w-5 text-gray-700" />
              </div>
              <h3 className="font-medium text-gray-900 mb-1">Open Source</h3>
              <p className="text-sm text-gray-500">Fork it, extend it, self-host it. Full source code on GitHub.</p>
              <span className="inline-flex items-center gap-1 text-sm text-gray-600 mt-3 group-hover:gap-1.5 transition-all">
                View source <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                Ready to add face auth?
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-gray-500">
                Get started with 1,000 free API calls per month. No credit card
                required. Upgrade as you grow.
              </p>
            </div>
            <div className="mt-8 lg:mt-0 flex flex-wrap justify-center lg:justify-end gap-3">
              <Link href="/sign-up">
                <Button
                  size="lg"
                  className="text-lg rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <a href="https://docs.facesmash.app/docs/quickstart" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="text-lg rounded-full">
                  <Zap className="mr-2 h-4 w-4" />
                  Quickstart Guide
                </Button>
              </a>
              <a href="https://docs.facesmash.app" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="text-lg rounded-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Full Docs
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image src="/facesmash-logo.png" alt="FaceSmash" width={20} height={20} className="rounded" />
              <span className="text-sm text-gray-500">© 2026 EVERJUST COMPANY</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="https://facesmash.app" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">App</a>
              <a href="https://docs.facesmash.app" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Docs</a>
              <a href="https://facesmash.app/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Privacy</a>
              <a href="https://facesmash.app/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">Terms</a>
              <a href="https://github.com/ever-just/facesmash.app" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
