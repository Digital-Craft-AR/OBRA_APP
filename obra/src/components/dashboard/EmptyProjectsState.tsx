import { FolderOpen, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface EmptyProjectsStateProps {
  title: string;
  ctaLabel: string;
  onCreate: () => void;
}

export function EmptyProjectsState({ title, ctaLabel, onCreate }: EmptyProjectsStateProps): React.JSX.Element {
  return (
    /* min-h-80 = 320px ⚑ rounded down from 360px (-40px). Still a generous empty state height. */
    <div className="flex min-h-80 flex-col items-center justify-center rounded-card border border-dashed border-obra-neutral-200 bg-white p-10 text-center">
      <div className="mb-5 rounded-pill bg-obra-blue-100 p-4">
        <FolderOpen className="h-10 w-10 text-obra-blue-700" />
      </div>
      <p
        className="mb-2 text-2xl font-normal text-obra-blue-950"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </p>
      <p className="mb-8 text-sm text-obra-neutral-600">
        Creá tu primer infoproducto con IA.
      </p>
      <Button variant="cta" size="lg" onClick={onCreate}>
        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
        {ctaLabel}
      </Button>
    </div>
  );
}
