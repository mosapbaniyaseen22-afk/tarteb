'use client';

import { useEffect, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FIELD_SUBJECTS, STUDY_FIELDS, normalizeTawjihiStage, subjectNamesMatch } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import type { UserSubject } from '@/lib/supabase';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function electiveFromSubjects(rows: UserSubject[], field: string): string {
  const pack = FIELD_SUBJECTS[field];
  if (!pack) return '';
  const names = rows
    .filter((row) => normalizeTawjihiStage(row.stage) === 'tawjihi_second')
    .map((row) => row.subjects?.name_ar)
    .filter((name): name is string => Boolean(name));
  return pack.electives.find((item) => names.some((name) => subjectNamesMatch(name, item))) ?? '';
}

export function EditStudyFieldDialog({ open, onOpenChange }: Props) {
  const { profile, saveProfile, saveSubjects, enrolledStages, allUserSubjects } = useAuth();
  const [studyField, setStudyField] = useState('');
  const [selectedElective, setSelectedElective] = useState('');
  const [saving, setSaving] = useState(false);

  const hasSecondYear = enrolledStages.includes('tawjihi_second');
  const pack = FIELD_SUBJECTS[studyField] ?? { core: [], electives: [] };
  const canSave = studyField.length > 0 && (!hasSecondYear || selectedElective.length > 0);

  useEffect(() => {
    if (!open) return;
    const field = profile?.study_field ?? '';
    setStudyField(field);
    setSelectedElective(electiveFromSubjects(allUserSubjects, field));
  }, [open, profile?.study_field, allUserSubjects]);

  const handleSave = async () => {
    if (!profile || !canSave) return;
    setSaving(true);
    try {
      if (hasSecondYear) {
        const names = [...pack.core, selectedElective];
        await saveSubjects(names, 'tawjihi_second', studyField);
      }
      await saveProfile({
        ...profile,
        study_field: studyField,
        updated_at: new Date().toISOString(),
      });
      toast.success('تم تحديث الحقل');
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('تعذر تحديث الحقل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            تعديل الحقل
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {hasSecondYear
              ? 'غيّر الفرع والمادة الاختيارية. مواد السنة الثانية تتحدث حسب اختيارك، ومواد السنة الأولى تبقى كما هي.'
              : 'اختر الفرع الدراسي. تقدر تغيّره لاحقاً عند التسجيل في السنة الثانية.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {STUDY_FIELDS.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => {
                  setStudyField(field.id);
                  setSelectedElective(electiveFromSubjects(allUserSubjects, field.id));
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

          {hasSecondYear && studyField ? (
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
            {saving ? 'جاري الحفظ...' : 'حفظ الحقل'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
