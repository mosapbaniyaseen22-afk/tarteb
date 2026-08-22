'use client';

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatJournalStamp, journalWordCount, noteMoodMeta, notePaperTheme } from './journal';
import type { Note } from './supabase';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileName(note: Note) {
  const safe = (note.title || 'مذكرة').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'مذكرة';
  return `مذكرة ${safe}.pdf`;
}

function buildTemplate(note: Note) {
  const theme = notePaperTheme(note.paper);
  const mood = noteMoodMeta(note.mood);
  const font = getComputedStyle(document.body).fontFamily || 'Cairo, sans-serif';
  const words = journalWordCount(note.content);
  const dateLabel = new Date(note.updated_at || note.created_at || Date.now()).toLocaleDateString('ar-JO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const body = escapeHtml(note.content.trim() || 'صفحة فاضية من دفتر لبيب.');
  const moodChip = mood
    ? `<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(0,0,0,0.06);border-radius:999px;padding:4px 10px;font-size:12px">${mood.emoji} ${escapeHtml(mood.label)}</span>`
    : '';

  return `
    <div style="width:794px;min-height:1123px;background:${theme.bg};color:${theme.ink};font-family:${font};direction:rtl;text-align:right">
      <div style="display:flex;min-height:1123px">
        <div style="width:22px;flex-shrink:0;background:linear-gradient(180deg,#44403C,#78350F 45%,#1C1917);position:relative">
          <div style="position:absolute;top:18%;left:50%;transform:translateX(-50%);width:10px;height:10px;border-radius:999px;background:#D6D3D1"></div>
          <div style="position:absolute;top:42%;left:50%;transform:translateX(-50%);width:10px;height:10px;border-radius:999px;background:#D6D3D1"></div>
          <div style="position:absolute;top:66%;left:50%;transform:translateX(-50%);width:10px;height:10px;border-radius:999px;background:#D6D3D1"></div>
        </div>
        <div style="position:relative;flex:1;min-width:0;background-image:repeating-linear-gradient(to bottom, transparent 0, transparent 31px, ${theme.line} 31px, ${theme.line} 32px)">
          <div style="position:absolute;top:0;bottom:0;right:56px;width:1px;background:rgba(244,63,94,0.42)"></div>
          <div style="padding:36px 72px 28px 36px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px">
              <div style="display:inline-block;background:linear-gradient(135deg,#B45309,#D97706);color:#FFF7ED;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:800">لبيب · مذكراتي</div>
              <div style="font-size:12px;color:${theme.muted}">${escapeHtml(dateLabel)}</div>
            </div>
            <h1 style="margin:0 0 12px;font-size:30px;line-height:1.35;font-weight:900">${escapeHtml(note.title || 'بدون عنوان')}</h1>
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:22px">
              ${moodChip}
              <span style="font-size:12px;color:${theme.muted}">${theme.label} · ${words} كلمة</span>
            </div>
            <div style="white-space:pre-wrap;font-size:18px;line-height:32px;font-weight:500">${body}</div>
            <div style="margin-top:40px;padding-top:14px;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:${theme.muted}">
              <span>${escapeHtml(formatJournalStamp(note.updated_at))}</span>
              <span>لبيب · دفتر الطالب</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

export async function downloadJournalNotePdf(note: Note) {
  const theme = notePaperTheme(note.paper);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.pointerEvents = 'none';
  host.innerHTML = buildTemplate(note);
  document.body.appendChild(host);

  const sheet = host.firstElementChild as HTMLElement | null;
  if (!sheet) {
    host.remove();
    throw new Error('تعذر تجهيز قالب المذكرة');
  }

  try {
    const canvas = await html2canvas(sheet, {
      scale: 2,
      backgroundColor: theme.bg,
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
    pdf.save(fileName(note));
  } finally {
    host.remove();
  }
}
