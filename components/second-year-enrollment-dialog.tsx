'use client';

import { useState } from 'react';
import { Check, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FIELD_SUBJECTS, STUDY_FIELDS } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SecondYearEnrollmentDialog({ open, onOpenChange }: Props) {
  const { profile, saveProfile, saveSubjects, switchStage } = useAuth();
  const [studyField, setStudyField] = useState(profile?.study_field ?? '');
  const [selectedElective, setSelectedElective] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = studyField.length > 0 && selectedElective.length > 0;
  const pack = FIELD_SUBJECTS[studyField] ?? { core: [], electives: [] };

  const handleSave = async () => {
    if (!profile || !canSave) return;
    setSaving(true);
    try {
      const names = [...pack.core, selectedElective];
      await saveSubjects(names, 'tawjihi_second', studyField);
      await saveProfile({
        ...profile,
        stage: 'tawjihi_second',
        study_field: studyField,
        updated_at: new Date().toISOString(),
      });
      await switchStage('tawjihi_second');
      toast.success('تم تفعيل حساب السنة الثانية');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('تعذر حفظ مواد السنة الثانية');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            مواد توجيهي سنة ثانية
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            اختاري الفرع والمادة الاختيارية. حساب السنة الأولى يبقى محفوظاً وتقدري تبدّلي بينهم.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {STUDY_FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => {
                  setStudyField(field.id);
                  setSelectedElective('');
                }}
                className={`rounded-2xl p-4 text-right transition-all ${
                  studyField === field.id
                    ? 'glass-card ring-2 ring-primary shadow-glow'
                    : 'glass-card hover:scale-[1.02]'
                }`}
              >
                <div className="mb-1 text-2xl">{field.icon}</div>
                <div className="text-sm font-semibold">{field.label}</div>
                <div className="text-xs text-muted-foreground">{field.description}</div>
              </button>
            ))}
          </div>

          {studyField ? (
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block text-sm font-semibold">المواد الأساسية</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {pack.core.map((subject) => (
                    <div key={subject} className="flex items-center gap-2 rounded-xl glass-card p-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                        <Check className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{subject}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block text-sm font-semibold">
                  المادة الاختيارية <span className="text-destructive">*</span>
                </Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pack.electives.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => setSelectedElective(subject)}
                      className={`flex items-center gap-3 rounded-xl p-3 text-right transition-all ${
                        selectedElective === subject
                          ? 'gradient-primary text-white shadow-glow'
                          : 'glass-card hover:scale-[1.01]'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          selectedElective === subject ? 'border-white' : 'border-muted-foreground'
                        }`}
                      >
                        {selectedElective === subject && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <span className="text-sm font-medium">{subject}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <Button
            onClick={() => void handleSave()}
            disabled={!canSave || saving}
            className="h-12 w-full rounded-xl gradient-primary font-semibold shadow-glow"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ وتفعيل السنة الثانية'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
