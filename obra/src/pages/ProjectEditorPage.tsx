import { BookOpen, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

export function ProjectEditorPage(): React.JSX.Element {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-obra-blue-900" style={{ fontFamily: 'var(--font-body)' }}>
      {/* Top bar */}
      <header className="border-b border-white/6 bg-obra-sidebar px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex cursor-pointer items-center gap-1.5 text-sm text-white/45 transition-colors duration-150 hover:text-white"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Dashboard
          </button>
          <span className="text-white/15" aria-hidden>/</span>
          <span className="truncate text-sm text-white/65">
            {t('editor.title')}
          </span>
        </div>
      </header>

      {/* Centered placeholder */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-obra-green-400/10 ring-1 ring-obra-green-400/20">
            <BookOpen className="h-8 w-8 text-obra-green-400" aria-hidden />
          </div>
          {/* text-3xl = 30px ⚑ rounded up from 28px (+2px) */}
          <h1
            className="text-3xl font-normal text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('editor.title')}
          </h1>
          {/* text-sm ⚑ rounded up from 14px (exact match) */}
          <p className="mt-2 text-sm text-white/40">
            {t('editor.projectId', { id: projectId ?? '-' })}
          </p>
          {/* text-sm ⚑ rounded up from 13px (+1px) */}
          <p className="mt-1 text-sm text-white/20">Próximamente</p>
        </div>
      </div>
    </div>
  );
}
