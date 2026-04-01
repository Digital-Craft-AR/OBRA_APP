import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-obra-blue-900 px-4 py-10">

      {/* max-w-auth-card = 420px exact via @theme --spacing-auth-card */}
      <div className="w-full max-w-auth-card">

        {/* Brand mark */}
        <div className="mb-8 text-center">
          {/* AI-powered badge */}
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-pill border border-obra-green-400/30 bg-obra-green-400/8 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5 text-obra-green-400" aria-hidden />
            {/* text-xs = 12px ⚑ acceptable: short all-caps decorative label in dark section */}
            <span className="text-xs font-semibold uppercase tracking-widest text-obra-green-400">
              AI-Powered
            </span>
          </div>

          {/* text-obra-display = 52px exact via @theme --text-obra-display */}
          <h1
            className="text-obra-display font-normal leading-none tracking-tight text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('appName')}
          </h1>
          {/* text-sm = 14px ⚑ rounded down from 15px (-1px) */}
          <p className="mt-3 text-sm leading-relaxed text-white/50">
            {t('auth.tagline')}
          </p>
        </div>

        {/* Card wrapper — flat border, no gradient */}
        <div className="rounded-2xl border border-white/10 shadow-auth-ring">
          {children}
        </div>
      </div>
    </div>
  );
}
