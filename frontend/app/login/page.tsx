import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="relative w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
