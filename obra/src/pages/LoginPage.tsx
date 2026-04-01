import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { supabase } from '../lib/supabase';

function GoogleIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.8-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3 14.6 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 9.1-4.8 9.1-7.2 0-.5 0-.8-.1-1.2H12Z" />
      <path fill="#34A853" d="M3.7 7.4 7 9.8c.9-2.2 2.7-3.8 5-3.8 1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3 14.6 2 12 2 8.3 2 5.1 4.1 3.7 7.4Z" />
      <path fill="#4A90E2" d="M12 20.4c2.5 0 4.7-.8 6.3-2.4l-2.9-2.4c-.8.5-1.9.9-3.4.9-3.9 0-5.2-2.6-5.4-3.8l-3.2 2.5c1.4 3.4 4.7 5.2 8.6 5.2Z" />
      <path fill="#FBBC05" d="M3.4 15.2 6.6 12.7c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5L3.4 7.2C2.9 8.4 2.6 9.8 2.6 11.2s.3 2.8.8 4Z" />
    </svg>
  );
}

export function LoginPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!email || !password) {
      toast.error(t('auth.errors.missingFields'));
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message || t('auth.errors.default'));
      return;
    }
    navigate('/dashboard', { replace: true });
  };

  const handleGoogleLogin = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(error.message || t('auth.errors.default'));
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardHeader className="px-10 pb-3 pt-10">
          <CardTitle style={{ fontFamily: 'var(--font-display)' }}>
            {t('auth.loginTitle')}
          </CardTitle>
          <CardDescription>{t('auth.loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="px-10 pb-10 pt-2">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="tu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Iniciando sesión...' : t('auth.loginButton')}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-obra-neutral-200" />
            </div>
            <p className="relative mx-auto w-fit bg-white px-3 text-xs uppercase tracking-wide text-obra-neutral-600">
              {t('auth.continueWith')}
            </p>
          </div>

          {/* Google — ghost + border override (social button special case) */}
          <Button
            variant="ghost"
            className="w-full border border-obra-neutral-200 text-obra-neutral-900 hover:bg-obra-blue-50"
            onClick={() => void handleGoogleLogin()}
          >
            <GoogleIcon />
            {t('auth.loginWithGoogle')}
          </Button>

          <p className="mt-6 text-center text-sm text-obra-neutral-600">
            {t('auth.noAccount')}{' '}
            <Link
              to="/register"
              className="font-semibold text-obra-blue-700 underline decoration-obra-blue-700/30 underline-offset-2 hover:text-obra-blue-900"
            >
              {t('auth.goToRegister')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
