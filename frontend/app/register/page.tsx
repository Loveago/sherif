import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="relative grid min-h-screen place-items-center px-4 py-12">
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="relative w-full max-w-2xl">
        <RegisterForm />
      </div>
    </div>
  );
}
