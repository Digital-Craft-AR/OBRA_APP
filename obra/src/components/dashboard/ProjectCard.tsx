import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';

export type ProjectStatus = 'draft' | 'in_progress' | 'complete';

export interface Project {
  id: string;
  name: string;
  language: 'es' | 'pt';
  status: ProjectStatus;
  updated_at: string;
}

interface ProjectCardProps {
  project: Project;
  badgeLabel: string;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

const statusProgress: Record<ProjectStatus, number> = {
  draft: 15,
  in_progress: 55,
  complete: 100,
};

const statusBadgeClass: Record<ProjectStatus, string> = {
  draft:       'bg-obra-blue-100 text-obra-blue-700',
  in_progress: 'bg-yellow-50 text-yellow-700',
  complete:    'bg-obra-blue-100 text-obra-blue-700',
};

export function ProjectCard({ project, badgeLabel, onClick, onDelete }: ProjectCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const progress = statusProgress[project.status];
  const isComplete = project.status === 'complete';

  const handleConfirmDelete = (): void => {
    onDelete?.(project.id);
    setDeleteOpen(false);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-card border border-obra-neutral-200 bg-white shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:border-obra-blue-700 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700/40"
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick?.();
          }
        }}
      >
        <div className="flex flex-1 flex-col p-5">

          {/* Status badge */}
          <div className="mb-3">
            <Badge className={statusBadgeClass[project.status]}>{badgeLabel}</Badge>
          </div>

          {/* Title */}
          <p
            className="line-clamp-2 flex-1 text-lg font-normal leading-snug text-obra-blue-950"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {project.name}
          </p>

          {/* Date */}
          <p className="mt-2 text-xs text-obra-neutral-600">{formatDate(project.updated_at)}</p>

          {/* Progress bar — 4px pill */}
          <div className="mt-4 h-1 overflow-hidden rounded-pill bg-obra-neutral-200">
            <div
              className="h-full rounded-pill bg-obra-green-400 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Delete button + action button */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              aria-label={t('dashboard.delete.action')}
              className="flex cursor-pointer items-center justify-center rounded-md p-1.5 text-obra-neutral-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>

            {isComplete ? (
              <Button
                variant="ghost"
                size="default"
                className="h-8 px-4 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                Abrir
              </Button>
            ) : (
              <Button
                variant="cta"
                size="default"
                className="h-8 px-4 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                Continuar →
              </Button>
            )}
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('dashboard.delete.confirm')}</DialogTitle>
            <DialogDescription className="mt-1">{t('dashboard.delete.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5">
            <Button
              variant="ghost"
              className="border border-obra-neutral-200"
              onClick={() => setDeleteOpen(false)}
            >
              {t('dashboard.delete.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('dashboard.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
