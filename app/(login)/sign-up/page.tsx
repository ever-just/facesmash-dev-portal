import { Suspense } from 'react';
import { Login } from '../(login)/login';

export default function SignUpPage() {
  return (
    <Suspense>
      <Login mode="signup" />
    </Suspense>
  );
}
