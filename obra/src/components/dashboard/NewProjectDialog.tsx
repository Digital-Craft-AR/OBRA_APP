import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, language: 'es' | 'pt') => Promise<void>;
}

export function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: NewProjectDialogProps): React.JSX.Element {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'es' | 'pt'>('es');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    await onCreate(name, language);
    setIsSubmitting(false);
    setName('');
    setLanguage('es');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dashboard.modal.title')}</DialogTitle>
          <DialogDescription>{t('dashboard.modal.description')}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="project-name" variant="light">
              {t('dashboard.modal.nameLabel')}
            </Label>
            <Input
              id="project-name"
              variant="light"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('dashboard.modal.namePlaceholder')}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-language" variant="light">
              {t('dashboard.modal.languageLabel')}
            </Label>
            <Select value={language} onValueChange={(value: 'es' | 'pt') => setLanguage(value)}>
              <SelectTrigger id="project-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">{t('dashboard.languages.es')}</SelectItem>
                <SelectItem value="pt">{t('dashboard.languages.pt')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {t('dashboard.modal.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
