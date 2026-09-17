import { NextResponse } from 'next/server';
import { getAdminSession, readResources, saveResource } from '@/lib/admin-server';
import { hydrateResourceQuestions } from '@/lib/practice-extract';
import { isPracticeSourceType, NO_PRACTICE_SENTINEL } from '@/lib/practice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function canSync(request: Request) {
  const header = request.headers.get('x-labib-sync')?.trim();
  const secrets = [process.env.ADMIN_LIST_SECRET, process.env.ADMIN_SESSION_SECRET, 'labib-admin-local-session']
    .filter((value): value is string => Boolean(value));
  return Boolean(header && secrets.includes(header));
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session && !canSync(request)) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول كأدمن' }, { status: 401 });
    }

    const items = await readResources();
    const pending = items.filter((item) => {
      if (!isPracticeSourceType(item.type)) return false;
      return !item.questions.some((question) => (
        question.prompt
        && question.prompt !== NO_PRACTICE_SENTINEL
        && question.options.length >= 2
      ));
    });
    const target = pending[0];
    if (!target) {
      return NextResponse.json({ ok: true, remaining: 0, updated: 0, quizzes: 0 });
    }

    const next = await hydrateResourceQuestions(target);
    await saveResource(next);
    const quizzes = next.questions.filter((question) => (
      question.prompt !== NO_PRACTICE_SENTINEL && question.options.length >= 2
    )).length;

    return NextResponse.json({
      ok: true,
      remaining: Math.max(0, pending.length - 1),
      updated: quizzes,
      quizzes,
      title: next.title,
      subjectName: next.subjectName,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'تعذر تحديث أسئلة اختبر نفسك' }, { status: 500 });
  }
}
