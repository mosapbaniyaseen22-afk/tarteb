'use client';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { StudyPlan } from './study-plan';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileName(plan: StudyPlan) {
  const safe = plan.studentName.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'طالب';
  return `خطة ${safe} لمعدل ${plan.targetAverage}.pdf`;
}

function buildTemplate(plan: StudyPlan) {
  const font = getComputedStyle(document.body).fontFamily || 'Cairo, sans-serif';
  const dateLabel = new Date(plan.createdAt || Date.now()).toLocaleDateString('ar-JO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const totalMinutes = plan.subjectMinutes.reduce((sum, item) => sum + item.minutesPerDay, 0) || 1;
  const focus = plan.focusSubjects?.length ? plan.focusSubjects.join(' و ') : '';
  const subjects = plan.subjectMinutes.map((item) => {
    const share = Math.round((item.minutesPerDay / totalMinutes) * 100);
    return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #E2E8F0">
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:13px">
            <span style="font-weight:700;color:#0F172A">${escapeHtml(item.name)}${item.focused ? ' <span style="color:#2563EB">تركيز</span>' : ''}</span>
            <span style="color:#64748B">${item.minutesPerDay} د · ${share}%</span>
          </div>
          <div style="margin-top:6px;height:7px;background:#E2E8F0;border-radius:999px;overflow:hidden">
            <div style="width:${Math.max(8, share)}%;height:100%;border-radius:999px;background:${item.focused ? 'linear-gradient(90deg,#2563EB,#14B8A6)' : '#14B8A6'}"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  const days = plan.weekDays.map((day) => `
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:12px 14px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <div style="font-weight:800;color:#0F172A">${escapeHtml(day.label)}</div>
        <div style="font-size:12px;color:#2563EB;font-weight:700">${Math.round((day.minutes / 60) * 10) / 10} ساعة</div>
      </div>
      <div style="margin-top:6px;font-size:12px;color:#475569;line-height:1.6">${escapeHtml(day.note)}</div>
    </div>`).join('');

  const rules = plan.rules.map((rule, index) => `
    <div style="display:flex;gap:10px;padding:8px 0">
      <div style="width:22px;height:22px;border-radius:999px;background:#EFF6FF;color:#2563EB;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${index + 1}</div>
      <div style="font-size:12.5px;color:#334155;line-height:1.7">${escapeHtml(rule)}</div>
    </div>`).join('');

  return `
    <div style="width:794px;background:#F8FAFC;color:#0F172A;font-family:${font};direction:rtl;text-align:right">
      <div style="height:8px;background:linear-gradient(90deg,#2563EB,#14B8A6)"></div>
      <div style="padding:36px 40px 28px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
          <div>
            <div style="display:inline-block;background:linear-gradient(135deg,#2563EB,#14B8A6);color:#fff;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:800;letter-spacing:.02em">لبيب · خطة دراسية</div>
            <h1 style="margin:12px 0 8px;font-size:26px;line-height:1.35;font-weight:900">${escapeHtml(plan.title)}</h1>
            <p style="margin:0;color:#475569;font-size:14px">الهدف: ${escapeHtml(plan.goal)} · جدول أسبوعي متكرر</p>
          </div>
          <div style="background:#fff;border:1px solid #E2E8F0;border-radius:18px;padding:12px 16px;text-align:center;min-width:110px">
            <div style="font-size:11px;color:#64748B">المعدل المطلوب</div>
            <div style="font-size:28px;font-weight:900;color:#2563EB;line-height:1.1">${plan.targetAverage}</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:22px">
          <div style="background:#fff;border-radius:18px;padding:16px;border:1px solid #E2E8F0">
            <div style="font-size:11px;color:#64748B">ساعات اليوم</div>
            <div style="font-size:22px;font-weight:800">${plan.hoursPerDay} س</div>
          </div>
          <div style="background:#fff;border-radius:18px;padding:16px;border:1px solid #E2E8F0">
            <div style="font-size:11px;color:#64748B">ساعات الأسبوع</div>
            <div style="font-size:22px;font-weight:800">${plan.weeklyHours} س</div>
          </div>
          <div style="background:#fff;border-radius:18px;padding:16px;border:1px solid #E2E8F0">
            <div style="font-size:11px;color:#64748B">مواد كل يوم</div>
            <div style="font-size:22px;font-weight:800">${plan.subjects.length}</div>
          </div>
        </div>

        ${focus ? `<div style="margin-top:16px;background:linear-gradient(135deg,#EFF6FF,#F0FDFA);border:1px solid #BFDBFE;border-radius:18px;padding:14px 16px;font-size:13px;color:#1E3A8A">تركيز أعلى على <strong>${escapeHtml(focus)}</strong></div>` : ''}
        ${plan.warning ? `<div style="margin-top:12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:18px;padding:14px 16px;font-size:13px;color:#92400E">${escapeHtml(plan.warning)}</div>` : ''}

        <div style="margin-top:22px;background:#fff;border:1px solid #E2E8F0;border-radius:22px;padding:18px 20px">
          <div style="font-size:15px;font-weight:800;margin-bottom:6px">توزيع المواد كل يوم</div>
          <div style="font-size:12px;color:#64748B;margin-bottom:8px">كل المواد تُدرس يومياً، والجدول يتكرر إلا إذا عدّلت يوم</div>
          ${subjects}
        </div>

        <div style="margin-top:22px">
          <div style="font-size:15px;font-weight:800;margin-bottom:10px">أيام الأسبوع</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${days}</div>
        </div>

        <div style="margin-top:22px;background:#fff;border:1px solid #E2E8F0;border-radius:22px;padding:18px 20px">
          <div style="font-size:15px;font-weight:800;margin-bottom:8px">قواعد الالتزام</div>
          ${rules}
        </div>

        <div style="margin-top:28px;display:flex;justify-content:space-between;align-items:center;color:#64748B;font-size:11px">
          <span>${escapeHtml(dateLabel)}</span>
          <span>لبيب · منصة طلاب التوجيهي</span>
        </div>
      </div>
    </div>`;
}

export async function downloadStudyPlanPdf(plan: StudyPlan) {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.innerHTML = buildTemplate(plan);
  document.body.appendChild(host);

  const sheet = host.firstElementChild as HTMLElement | null;
  if (!sheet) {
    host.remove();
    throw new Error('تعذر تجهيز قالب الخطة');
  }

  try {
    const canvas = await html2canvas(sheet, {
      scale: 2,
      backgroundColor: '#F8FAFC',
      useCORS: true,
      logging: false,
      width: 794,
      windowWidth: 794,
      foreignObjectRendering: false,
    });
    const image = canvas.toDataURL('image/png', 1);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    let remaining = imageHeight;
    let offset = 0;

    pdf.addImage(image, 'PNG', 0, offset, pageWidth, imageHeight);
    remaining -= pageHeight;
    while (remaining > 0) {
      offset -= pageHeight;
      pdf.addPage();
      pdf.addImage(image, 'PNG', 0, offset, pageWidth, imageHeight);
      remaining -= pageHeight;
    }
    pdf.save(fileName(plan));
  } finally {
    host.remove();
  }
}
