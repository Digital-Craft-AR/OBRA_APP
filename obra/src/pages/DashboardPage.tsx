import { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Globe, LayoutTemplate, LogOut, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyProjectsState } from '../components/dashboard/EmptyProjectsState';
import { type Project, ProjectCard, type ProjectStatus } from '../components/dashboard/ProjectCard';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';

interface StatCardProps {
  label: string;
  value: number;
  loading: boolean;
}

function StatCard({ label, value, loading }: StatCardProps): React.JSX.Element {
  return (
    <div className="rounded-card border border-obra-neutral-200 bg-white px-5 py-4">
      {loading ? (
        <div className="mb-1 h-7 w-10 animate-pulse rounded bg-obra-neutral-200" />
      ) : (
        <p
          className="text-2xl font-normal text-obra-blue-950"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
        </p>
      )}
      <p className="mt-1 text-sm text-obra-neutral-600">{label}</p>
    </div>
  );
}

function SkeletonCard(): React.JSX.Element {
  return (
    <div className="animate-pulse overflow-hidden rounded-card border border-obra-neutral-200 bg-white">
      <div className="p-5">
        <div className="mb-3 h-5 w-20 rounded-pill bg-obra-blue-100" />
        <div className="mb-2 h-4 w-3/4 rounded bg-obra-blue-50" />
        <div className="mb-5 h-4 w-1/2 rounded bg-obra-blue-50" />
        <div className="h-1 w-full rounded-pill bg-obra-neutral-200" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-3">
            <div className="h-4 w-4 rounded bg-obra-blue-50" />
            <div className="h-4 w-4 rounded bg-obra-blue-50" />
            <div className="h-4 w-4 rounded bg-obra-blue-50" />
          </div>
          <div className="h-8 w-24 rounded-pill bg-obra-blue-100" />
        </div>
      </div>
    </div>
  );
}

export function DashboardPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const statusLabels = useMemo<Record<ProjectStatus, string>>(
    () => ({
      draft: t('dashboard.status.draft'),
      in_progress: t('dashboard.status.inProgress'),
      complete: t('dashboard.status.complete'),
    }),
    [t],
  );

  const stats = useMemo(
    () => ({
      total: projects.length,
      ebooks: projects.filter((p) => p.status !== 'draft').length,
      ready: projects.filter((p) => p.status === 'complete').length,
    }),
    [projects],
  );

  useEffect(() => {
    const loadProjects = async (): Promise<void> => {
      if (!user) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, language, status, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        toast.error(error.message || t('auth.errors.default'));
      } else {
        setProjects((data ?? []) as Project[]);
      }
      setIsLoading(false);
    };
    void loadProjects();
  }, [t, user]);

  const handleDelete = async (id: string): Promise<void> => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast.error(error.message || t('auth.errors.default'));
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSignOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || t('auth.errors.default'));
    }
  };

  const rawName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'creadora';
  const firstName = rawName.split(' ')[0] ?? rawName;
  const initials = rawName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-obra-blue-900" style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Sidebar ── */}
      <aside
        className="fixed inset-y-0 left-0 hidden w-sidebar flex-col border-r border-white/5 bg-obra-blue-900 px-5 py-6 md:flex"
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-pill bg-obra-green-400" />
          <span
            className="text-2xl font-normal leading-tight tracking-tight text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('appName')}
          </span>
        </div>

        <div className="my-4 border-t border-white/8" />

        {/* Nav */}
        <nav className="flex flex-col gap-1">
          {/* Active: Proyectos */}
          <button
            type="button"
            className="flex cursor-pointer items-center gap-3 rounded-r-md border-l-4 border-obra-green-400 bg-white/8 py-2.5 pl-3 pr-3 text-left text-sm font-medium text-white transition-colors duration-150"
          >
            <FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
            {t('dashboard.navigation.projects')}
          </button>

          {/* Disabled: Plantillas */}
          <div className="flex cursor-not-allowed items-center gap-3 border-l-4 border-transparent py-2.5 pl-3 pr-3 text-sm font-medium text-white/30">
            <LayoutTemplate className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">Plantillas</span>
            <Badge className="bg-white/8 text-white/40 text-xs">Próximamente</Badge>
          </div>
        </nav>

        {/* Language selector */}
        <div className="mt-auto">
          <div className="mb-4 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
            {(['es', 'en', 'pt'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => void i18n.changeLanguage(lang)}
                className={`cursor-pointer text-xs uppercase tracking-wide transition-colors duration-150 ${
                  i18n.language === lang
                    ? 'font-semibold text-white'
                    : 'text-white/35 hover:text-white/65'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom: user + sign out */}
        <div>
          <div className="border-t border-white/8 pt-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-obra-green-400 text-xs font-bold text-obra-blue-950">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{firstName}</p>
                <p className="truncate text-xs text-white/40">{user?.email}</p>
              </div>
            </div>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-white/50 transition-colors duration-150 hover:bg-white/5 hover:text-white/80"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="h-4 w-4 shrink-0" aria-hidden />
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="min-h-screen bg-white md:ml-sidebar">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-10 md:py-12">

          {/* Header */}
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                className="text-4xl font-normal leading-tight text-obra-blue-950"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Hola, {firstName}
              </h2>
              <p className="mt-2 text-sm text-obra-neutral-600">
                Estos son tus proyectos activos.
              </p>
            </div>
            <Button
              variant="cta"
              size="lg"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => navigate('/projects/new/wizard')}
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden />
              Nuevo proyecto
            </Button>
          </header>

          {/* Stats row */}
          <section className="mb-8 grid grid-cols-3 gap-4" aria-label="Estadísticas">
            <StatCard label="Proyectos totales" value={stats.total} loading={isLoading} />
            <StatCard label="Ebooks generados" value={stats.ebooks} loading={isLoading} />
            <StatCard label="Listos para exportar" value={stats.ready} loading={isLoading} />
          </section>

          {/* Project grid */}
          {isLoading ? (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </section>
          ) : projects.length === 0 ? (
            <EmptyProjectsState
              title={t('dashboard.empty.title')}
              ctaLabel={t('dashboard.empty.cta')}
              onCreate={() => navigate('/projects/new/wizard')}
            />
          ) : (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  badgeLabel={statusLabels[project.status]}
                  onDelete={(id) => void handleDelete(id)}
                  onClick={() => {
                    if (project.status === 'complete') {
                      navigate(`/projects/${project.id}/editor`);
                      return;
                    }
                    navigate(`/projects/${project.id}/wizard`);
                  }}
                />
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
