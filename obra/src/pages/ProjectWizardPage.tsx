import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, File, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { type ContentMode, useProjectStore } from '../store/projectStore';

/**
 * Textarea uses the same token values as Input (single input style).
 * bg-obra-neutral-100 border-obra-neutral-200 focus:border-obra-blue-700
 */
const textareaClass =
  'min-h-36 w-full resize-none rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-4 py-3 pb-8 text-sm leading-relaxed text-obra-neutral-900 outline-none placeholder:text-obra-neutral-400 transition-all duration-150 focus:border-obra-blue-700 focus:bg-white focus:ring-2 focus:ring-obra-blue-700/20';

const TOPIC_CHIPS = [
  { label: 'Velas aromáticas 🕯️', value: 'Cómo crear y vender velas aromáticas artesanales desde casa.' },
  { label: 'Repostería gourmet 🍰', value: 'Recetas y técnicas de repostería gourmet para emprender online.' },
  { label: 'Fitness en casa 💪', value: 'Rutinas de fitness efectivas para hacer en casa sin equipamiento.' },
];

const AVATAR_CHIPS = [
  { label: 'Emprendedoras desde casa', value: 'Mujeres de 25 a 45 años que quieren emprender desde casa con ingresos extras sin inversión alta.' },
  { label: 'Profesionales en transición', value: 'Profesionales de 30 a 50 años buscando reconvertirse y monetizar su conocimiento online.' },
  { label: 'Jóvenes creativos', value: 'Jóvenes de 18 a 30 años con habilidades creativas que quieren vivir de su pasión.' },
];

const PAGE_ESTIMATES: Record<5 | 7 | 10 | 12, string> = {
  5:  '35–40',
  7:  '50–60',
  10: '75–90',
  12: '90–110',
};

const CONTENT_OPTIONS: Array<{
  value: ContentMode;
  icon: string;
  title: string;
  subtitle: string;
  recommended?: boolean;
}> = [
  {
    value: 'ai',
    icon: '✨',
    title: 'Generá todo con IA',
    subtitle: 'La IA escribe el ebook completo basándose en tu tema',
    recommended: true,
  },
  {
    value: 'paste',
    icon: '📋',
    title: 'Yo tengo el contenido',
    subtitle: 'Pegá tu texto y la IA lo estructura y mejora',
  },
  {
    value: 'upload',
    icon: '📄',
    title: 'Subir un archivo',
    subtitle: 'Subí un PDF, Word o TXT y la IA lo transforma',
  },
];

const CONTENT_MODE_LABELS: Record<ContentMode, string> = {
  ai:     'Generar todo con IA',
  paste:  'Pegar contenido propio',
  upload: 'Subir un archivo',
};

const TONE_LABELS: Record<string, string> = {
  professional: 'Profesional',
  friendly:     'Cercano',
  inspiring:    'Inspirador',
};

const LANGUAGE_LABELS: Record<string, string> = {
  es: 'Español',
  pt: 'Portugués',
};

/** Toggle pill group — selected = primary, unselected = ghost + border */
function PillGroup<T extends string | number>({
  values,
  selected,
  onSelect,
}: {
  values: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((item) => (
        <button
          key={String(item.value)}
          type="button"
          className={
            selected === item.value
              ? 'cursor-pointer rounded-pill bg-obra-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-150'
              : 'cursor-pointer rounded-pill border border-obra-neutral-200 bg-white px-4 py-2 text-sm text-obra-neutral-900 transition-colors duration-150 hover:border-obra-blue-700 hover:bg-obra-blue-50 hover:text-obra-blue-700'
          }
          onClick={() => onSelect(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function generateSuggestedTitle(topic: string, avatar: string): string {
  const topicClean = topic.replace(/^cómo\s+/i, '').split('.')[0]?.trim() ?? topic;
  const avatarClean = avatar.split(/[,.]/, 1)[0]?.trim().toLowerCase() ?? avatar;
  return `Cómo ${topicClean}: Guía completa para ${avatarClean}`;
}

export function ProjectWizardPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();
  const {
    step,
    wizard,
    nextStep,
    previousStep,
    setStep,
    setProjectContext,
    updateWizard,
    resetWizard,
  } = useProjectStore();
  const [isImproving, setIsImproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStep(1);
    setProjectContext(projectId ?? null);

    const loadExisting = async (): Promise<void> => {
      if (!projectId) return;
      const { data, error } = await supabase
        .from('projects')
        .select('topic, avatar, problem, product_type, chapters_count, language, tone, status')
        .eq('id', projectId)
        .single();
      if (error) return;
      updateWizard({
        topic:         (data.topic as string | null) ?? '',
        avatar:        (data.avatar as string | null) ?? '',
        problem:       (data.problem as string | null) ?? '',
        productType:   ((data.product_type as 'ebook' | 'guide' | 'manual' | null) ?? 'ebook'),
        chaptersCount: ((data.chapters_count as 5 | 7 | 10 | 12 | null) ?? 5),
        language:      ((data.language as 'es' | 'pt' | null) ?? 'es'),
        tone:          ((data.tone as 'professional' | 'friendly' | 'inspiring' | null) ?? 'professional'),
      });
      setProjectContext(projectId, (data.status as 'draft' | 'in_progress' | 'complete' | null) ?? 'draft');
    };
    void loadExisting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const canContinue = useMemo(() => {
    if (step === 1) return wizard.topic.trim().length > 0;
    if (step === 2) return wizard.avatar.trim().length > 0;
    if (step === 3) return wizard.problem.trim().length > 0;
    if (step === 4) return wizard.contentMode !== null;
    return true;
  }, [step, wizard.topic, wizard.avatar, wizard.problem, wizard.contentMode]);

  const improveText = async (): Promise<void> => {
    setIsImproving(true);
    await new Promise<void>((resolve) => { window.setTimeout(() => resolve(), 1500); });
    if (step === 1) updateWizard({ topic: 'Cómo crear velas aromáticas artesanales en casa y convertirlas en un negocio online rentable.' });
    if (step === 2) updateWizard({ avatar: 'Mujeres de 25 a 45 años que quieren emprender desde casa con productos artesanales y generar ingresos extra sin inversión alta.' });
    setIsImproving(false);
  };

  const submitWizard = async (): Promise<void> => {
    if (!user) { toast.error(t('auth.errors.default')); return; }
    setIsSubmitting(true);
    const { topic, avatar, problem, productType, chaptersCount, language, tone } = wizard;
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name: topic.trim(), status: 'draft', language })
      .select('id')
      .single();
    if (projectError || !projectData?.id) { setIsSubmitting(false); toast.error(t('wizard.submitError')); return; }
    const { error: ebookError } = await supabase.from('ebooks').insert({
      project_id: projectData.id as string,
      type: 'main',
      target_avatar: { description: avatar },
    });
    setIsSubmitting(false);
    if (ebookError) { toast.error(t('wizard.submitError')); return; }
    void { topic, avatar, problem, productType, chaptersCount, language, tone };
    resetWizard();
    navigate('/dashboard', { replace: true });
  };

  const handleCancel = (): void => { resetWizard(); navigate('/dashboard'); };

  const pageEstimate = PAGE_ESTIMATES[wizard.chaptersCount];
  const suggestedTitle = generateSuggestedTitle(wizard.topic, wizard.avatar);
  const isSummary = step === 6;

  return (
    <div className="min-h-screen bg-obra-canvas" style={{ fontFamily: 'var(--font-body)' }}>

      {/* Sticky navbar — dark structural */}
      <header className="sticky top-0 z-20 border-b border-white/5 bg-obra-sidebar shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 md:px-6">
          <button
            type="button"
            onClick={handleCancel}
            className="flex cursor-pointer items-center gap-1.5 text-sm text-white/50 transition-colors duration-150 hover:text-white"
            aria-label="Volver al dashboard"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span style={{ fontFamily: 'var(--font-display)' }}>{t('appName')}</span>
          </button>
          <span className="rounded-pill bg-obra-green-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-obra-green-400">
            {t('wizard.step', { step, total: 6 })}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">

        {/* Progress bar — 6 segments */}
        <div className="mb-8 flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={6}>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-pill transition-all duration-500"
              style={{
                backgroundColor: s <= step ? 'var(--color-obra-green-400)' : 'var(--color-obra-neutral-200)',
                boxShadow: s <= step ? '0 0 8px rgba(246,216,96,0.6), 0 0 16px rgba(246,216,96,0.25)' : 'none',
              }}
            />
          ))}
        </div>

        {/* White card */}
        <Card className="shadow-card-hover">
          <CardHeader className="pb-2 pt-8">
            <CardTitle
              className="text-2xl font-normal leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {t(`wizard.steps.${step}.title`)}
            </CardTitle>
            {isSummary && (
              <p className="mt-1 text-sm text-obra-neutral-600">
                Revisá los detalles antes de crear.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6 px-6 pb-8">

            {/* ── Step 1 — Tema ── */}
            {step === 1 && (
              <div className="space-y-3">
                <Label htmlFor="topic">{t('wizard.topic.label')}</Label>
                <div className="relative">
                  <textarea
                    id="topic"
                    className={textareaClass}
                    style={{ fontFamily: 'var(--font-body)' }}
                    value={wizard.topic}
                    onChange={(e) => updateWizard({ topic: e.target.value })}
                    placeholder="Describe el tema de tu infoproducto... ¿Qué transformación vas a ofrecer a tu audiencia?"
                    maxLength={400}
                  />
                  <Sparkles className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-obra-blue-700/25" aria-hidden />
                  <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-obra-neutral-400">
                    {wizard.topic.length}/400
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      className="cursor-pointer rounded-pill border border-obra-neutral-200 bg-white px-3 py-1.5 text-sm text-obra-neutral-600 transition-all duration-150 hover:border-obra-blue-700 hover:bg-obra-blue-50 hover:text-obra-blue-700"
                      onClick={() => updateWizard({ topic: chip.value })}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                {wizard.topic.trim().length > 0 && (
                  <Button variant="ghost" className="border border-obra-neutral-200" onClick={() => void improveText()} disabled={isImproving}>
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                    {isImproving ? t('wizard.improving') : t('wizard.optimize')}
                  </Button>
                )}
              </div>
            )}

            {/* ── Step 2 — Avatar ── */}
            {step === 2 && (
              <div className="space-y-3">
                <Label htmlFor="avatar">{t('wizard.avatar.label')}</Label>
                <div className="relative">
                  <textarea
                    id="avatar"
                    className={textareaClass}
                    style={{ fontFamily: 'var(--font-body)' }}
                    value={wizard.avatar}
                    onChange={(e) => updateWizard({ avatar: e.target.value })}
                    placeholder="¿Quién es tu cliente ideal? Describe su edad, situación, deseos y frustraciones..."
                    maxLength={400}
                  />
                  <Sparkles className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-obra-blue-700/25" aria-hidden />
                  <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-obra-neutral-400">
                    {wizard.avatar.length}/400
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      className="cursor-pointer rounded-pill border border-obra-neutral-200 bg-white px-3 py-1.5 text-sm text-obra-neutral-600 transition-all duration-150 hover:border-obra-blue-700 hover:bg-obra-blue-50 hover:text-obra-blue-700"
                      onClick={() => updateWizard({ avatar: chip.value })}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                {wizard.avatar.trim().length > 0 && (
                  <Button variant="ghost" className="border border-obra-neutral-200" onClick={() => void improveText()} disabled={isImproving}>
                    <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                    {isImproving ? t('wizard.improving') : t('wizard.optimize')}
                  </Button>
                )}
              </div>
            )}

            {/* ── Step 3 — Estructura ── */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="problem">{t('wizard.structure.problemLabel')}</Label>
                  <div className="relative">
                    <textarea
                      id="problem"
                      className={`${textareaClass} min-h-28`}
                      style={{ fontFamily: 'var(--font-body)' }}
                      value={wizard.problem}
                      onChange={(e) => updateWizard({ problem: e.target.value })}
                    />
                    <Sparkles className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-obra-blue-700/25" aria-hidden />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>{t('wizard.structure.chaptersLabel')}</Label>
                  <PillGroup
                    values={[
                      { value: 5,  label: '5' },
                      { value: 7,  label: '7' },
                      { value: 10, label: '10' },
                      { value: 12, label: '12' },
                    ]}
                    selected={wizard.chaptersCount}
                    onSelect={(v) => updateWizard({ chaptersCount: v })}
                  />
                  {/* Real-time page estimate pill */}
                  <div className="flex items-center gap-2 transition-all duration-200">
                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-obra-neutral-200 bg-obra-blue-50 px-3 py-1.5 text-sm text-obra-blue-700 transition-all duration-200">
                      <File className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Estimado: ~{pageEstimate} páginas
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4 — Contenido ── */}
            {step === 4 && (
              <div className="space-y-3">
                <p className="text-sm text-obra-neutral-600">
                  Elegí cómo querés crear el contenido de tu ebook.
                </p>
                <div className="space-y-3">
                  {CONTENT_OPTIONS.map((option) => {
                    const isSelected = wizard.contentMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={[
                          'flex w-full cursor-pointer items-start gap-4 rounded-card border-2 p-4 text-left transition-all duration-150',
                          isSelected
                            ? 'border-obra-blue-700 bg-obra-blue-50'
                            : 'border-obra-neutral-200 bg-white hover:border-obra-blue-700/40 hover:bg-obra-blue-50/50',
                        ].join(' ')}
                        onClick={() => updateWizard({ contentMode: option.value })}
                      >
                        <span className="mt-0.5 text-xl leading-none" aria-hidden>{option.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-obra-blue-950">
                              {option.title}
                            </span>
                            {option.recommended && (
                              <Badge className="text-xs">Recomendado</Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-obra-neutral-600">{option.subtitle}</p>
                        </div>
                        {/* Selection indicator */}
                        <div
                          className={[
                            'mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-all duration-150',
                            isSelected
                              ? 'border-obra-blue-700 bg-obra-blue-700'
                              : 'border-obra-neutral-200 bg-white',
                          ].join(' ')}
                          aria-hidden
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 5 — Estilo ── */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>{t('wizard.style.languageLabel')}</Label>
                  <PillGroup
                    values={[
                      { value: 'es', label: t('wizard.style.languages.es') },
                      { value: 'pt', label: t('wizard.style.languages.pt') },
                    ]}
                    selected={wizard.language}
                    onSelect={(v) => updateWizard({ language: v })}
                  />
                </div>
                <div className="space-y-3">
                  <Label>{t('wizard.style.toneLabel')}</Label>
                  <PillGroup
                    values={[
                      { value: 'professional', label: t('wizard.style.tones.professional') },
                      { value: 'friendly',     label: t('wizard.style.tones.friendly') },
                      { value: 'inspiring',    label: t('wizard.style.tones.inspiring') },
                    ]}
                    selected={wizard.tone}
                    onSelect={(v) => updateWizard({ tone: v })}
                  />
                </div>
              </div>
            )}

            {/* ── Step 6 — Resumen ── */}
            {step === 6 && (
              <div className="space-y-5">

                {/* Summary card */}
                <div className="space-y-3 rounded-card border border-obra-neutral-200 bg-obra-blue-50/60 p-5">
                  {[
                    { icon: '📌', label: 'Tema',       value: wizard.topic },
                    { icon: '👤', label: 'Avatar',     value: wizard.avatar },
                    { icon: '📚', label: 'Estructura', value: `${wizard.chaptersCount} capítulos · ~${pageEstimate} páginas estimadas` },
                    { icon: '✍️', label: 'Contenido',  value: wizard.contentMode ? CONTENT_MODE_LABELS[wizard.contentMode] : '—' },
                    { icon: '🌎', label: 'Idioma',     value: LANGUAGE_LABELS[wizard.language] ?? wizard.language },
                    { icon: '🎨', label: 'Tono',       value: TONE_LABELS[wizard.tone] ?? wizard.tone },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="mt-0.5 text-base leading-none" aria-hidden>{icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-obra-neutral-600">{label}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm font-medium text-obra-blue-950">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Suggested title */}
                <div className="rounded-card border border-obra-green-400/30 bg-obra-green-400/8 p-4">
                  <p className="text-xs font-medium text-obra-neutral-600">💡 Título sugerido</p>
                  <p className="mt-1 text-sm font-semibold text-obra-blue-950">{suggestedTitle}</p>
                </div>

                {/* Page estimate prominent */}
                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-pill border border-obra-neutral-200 bg-white px-5 py-2 text-sm font-medium text-obra-blue-950">
                    <File className="h-4 w-4 shrink-0 text-obra-blue-700" aria-hidden />
                    ~{pageEstimate} páginas · {wizard.chaptersCount} capítulos
                  </span>
                </div>

                {/* Full-width CTA */}
                <Button
                  variant="cta"
                  size="lg"
                  className="w-full"
                  onClick={() => void submitWizard()}
                  disabled={isSubmitting}
                >
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                  {t('wizard.generate')}
                </Button>

                {/* AI tagline */}
                <p className="text-center text-xs text-obra-neutral-400">
                  ⚡ La IA generará tu ebook completo en segundos
                </p>
              </div>
            )}

            {/* ── Navigation footer ── */}
            {!isSummary && (
              <>
                <div className="flex items-center justify-between border-t border-obra-neutral-200 pt-6">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      className="text-obra-neutral-400 hover:text-obra-neutral-600"
                    >
                      {t('wizard.cancel')}
                    </Button>
                    {step > 1 && (
                      <Button variant="ghost" className="border border-obra-neutral-200" onClick={previousStep}>
                        {t('wizard.previous')}
                      </Button>
                    )}
                  </div>
                  <Button variant="cta" onClick={nextStep} disabled={!canContinue}>
                    {t('wizard.next')}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-1.5 border-t border-obra-neutral-200 pt-4">
                  <Sparkles className="h-3 w-3 shrink-0 text-obra-green-400" aria-hidden />
                  <span className="text-xs text-obra-neutral-400">
                    La IA generará tu proyecto completo en segundos
                  </span>
                </div>
              </>
            )}

            {/* Back button on summary */}
            {isSummary && (
              <div className="flex items-center gap-3 border-t border-obra-neutral-200 pt-4">
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  className="text-obra-neutral-400 hover:text-obra-neutral-600"
                >
                  {t('wizard.cancel')}
                </Button>
                <Button variant="ghost" className="border border-obra-neutral-200" onClick={previousStep}>
                  {t('wizard.previous')}
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
