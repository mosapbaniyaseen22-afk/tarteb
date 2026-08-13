'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { REGIONS, STUDY_FIELDS, FIELD_SUBJECTS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Check, User, GraduationCap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { LabibLogo } from '@/components/labib-logo';


const FIRST_YEAR_SUBJECTS = ['الرياضيات', 'اللغة العربية', 'التربية الإسلامية', 'تاريخ الأردن'];

export default function OnboardingPage() {
  const { user, loading, saveProfile, saveSubjects } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(2);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [region, setRegion] = useState('');
  const [stage, setStage] = useState('');
  const [studyField, setStudyField] = useState('');
  const [selectedElective, setSelectedElective] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setFullName(user?.full_name || '');
  }, [user]);

  const totalSteps = 3;

  const canProceed = () => {
    switch (step) {
      case 1: return fullName.trim().length > 0 && region.length > 0;
      case 2: return stage.length > 0;
      case 3: return stage === 'tawjihi_first' ? true : (studyField.length > 0 && selectedElective.length > 0);
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleSave();
    } else {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const handleBack = () => {
    if (step <= 2) {
      router.push('/');
      return;
    }
    setStep((s) => s - 1);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nextProfile = {
        id: user.id,
        full_name: fullName.trim() || user.full_name || 'طالب',
        region: region || null,
        stage,
        tawjihi_year: null,
        study_field: studyField || null,
        avatar_url: user.avatar_url,
        onboarding_complete: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await saveProfile(nextProfile);

      const subjectsToSave =
        stage === 'tawjihi_first'
          ? FIRST_YEAR_SUBJECTS
          : stage === 'tawjihi_second' && studyField
          ? [...(FIELD_SUBJECTS[studyField]?.core || []), selectedElective]
          : [];

      if (subjectsToSave.length > 0) {
        await saveSubjects(subjectsToSave, stage, studyField || null);
      }

      toast.success('تم حفظ بياناتك بنجاح!');
      router.push('/dashboard');
    } catch (err) {
      toast.error('حدث خطأ أثناء الحفظ، حاول مرة أخرى');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh gradient-hero flex items-center justify-center p-4 md:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <LabibLogo size="lg" />
          <span className="text-2xl font-bold">لبيب</span>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i + 1 <= step ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-soft md:p-10">
          <AnimatePresence mode="wait">

            {/* Step 1: Name + Region */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <User className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold">مرحباً! أخبرنا عنك</h2>
                  <p className="mt-2 text-muted-foreground">نحتاج بعض المعلومات لتفعيل حسابك</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">الاسم الكامل</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: أحمد محمد"
                      className="h-12 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block">المحافظة</Label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {REGIONS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setRegion(r)}
                          className={`rounded-xl px-3 py-3 text-sm font-medium transition-all ${
                            region === r
                              ? 'gradient-primary text-white shadow-glow'
                              : 'glass-card hover:scale-105'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Stage - خيارين فقط */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold">ما هي مرحلتك الدراسية؟</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { id: 'tawjihi_first', label: 'توجيهي سنة أولى', desc: 'الصف الحادي عشر' },
                    { id: 'tawjihi_second', label: 'توجيهي سنة ثانية', desc: 'الصف الثاني عشر' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStage(s.id)}
                      className={`rounded-2xl p-5 text-right transition-all ${
                        stage === s.id
                          ? 'gradient-primary text-white shadow-glow'
                          : 'glass-card hover:scale-[1.02]'
                      }`}
                    >
                      <div className="text-lg font-semibold">{s.label}</div>
                      <div className={`text-sm ${stage === s.id ? 'text-white/80' : 'text-muted-foreground'}`}>{s.desc}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: توجيهي سنة أولى - عرض المواد تلقائياً */}
            {step === 3 && stage === 'tawjihi_first' && (
              <motion.div
                key="step4-first"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold">موادك الدراسية</h2>
                  <p className="mt-2 text-muted-foreground">تم تعيين مواد توجيهي سنة أولى تلقائياً</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FIRST_YEAR_SUBJECTS.map((subject) => (
                    <div key={subject} className="flex items-center gap-3 rounded-2xl glass-card p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="font-medium">{subject}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: توجيهي سنة ثانية - اختيار الفرع والمواد */}
            {step === 3 && stage === 'tawjihi_second' && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-bold">اختر فرعك الدراسي</h2>
                  <p className="mt-2 text-muted-foreground">اختر الفرع ثم المادة الاختيارية</p>
                </div>

                {/* اختيار الفرع */}
                <div className="grid grid-cols-2 gap-3">
                  {STUDY_FIELDS.map((field) => (
                    <button
                      key={field.id}
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
                      <div className="font-semibold text-sm">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.description}</div>
                    </button>
                  ))}
                </div>

                {/* المواد الأساسية والاختيارية */}
                {studyField && (() => {
                  const { core, electives } = FIELD_SUBJECTS[studyField] || { core: [], electives: [] };
                  return (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4"
                    >
                      {/* المواد الأساسية */}
                      <div>
                        <Label className="mb-2 block text-sm font-semibold">المواد الأساسية</Label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {core.map((subject) => (
                            <div key={subject} className="flex items-center gap-2 rounded-xl glass-card p-3">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                                <Check className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-medium">{subject}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* المادة الاختيارية */}
                      <div>
                        <Label className="mb-2 block text-sm font-semibold">
                          المادة الاختيارية <span className="text-destructive">*</span>
                        </Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {electives.map((subject) => (
                            <button
                              key={subject}
                              onClick={() => setSelectedElective(subject)}
                              className={`flex items-center gap-3 rounded-xl p-3 text-right transition-all ${
                                selectedElective === subject
                                  ? 'gradient-primary text-white shadow-glow'
                                  : 'glass-card hover:scale-[1.01]'
                              }`}
                            >
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                selectedElective === subject ? 'border-white' : 'border-muted-foreground'
                              }`}>
                                {selectedElective === subject && <div className="h-2 w-2 rounded-full bg-white" />}
                              </div>
                              <span className="text-sm font-medium">{subject}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  );
                })()}
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button variant="ghost" onClick={handleBack} className="rounded-xl">
                <ChevronRight className="h-4 w-4" />
                رجوع
              </Button>
            ) : <div />}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="h-12 rounded-xl gradient-primary px-8 font-semibold shadow-glow"
            >
              {saving ? '...جاري الحفظ' : step === 3 ? 'حفظ وبدء' : 'التالي'}
              {!saving && step < 3 && <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
