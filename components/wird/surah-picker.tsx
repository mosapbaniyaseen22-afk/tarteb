'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SURAH_LIST, getSurah, normalizeArabicSearch, revelationLabel } from '@/lib/wird-surahs';

type Props = {
  selected: number;
  onSelect: (number: number) => void;
};

export function SurahPicker({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const surah = getSurah(selected);

  const filtered = useMemo(() => {
    const needle = normalizeArabicSearch(query);
    if (!needle) return SURAH_LIST;
    return SURAH_LIST.filter(
      (item) =>
        normalizeArabicSearch(item.name).includes(needle) || String(item.number) === query.trim(),
    );
  }, [query]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl glass-card px-4 py-3 text-right transition-all hover:scale-[1.01]"
      >
        <div>
          <div className="text-xs text-muted-foreground">اختر السورة</div>
          <div className="font-amiri text-xl">{surah ? `سورة ${surah.name}` : 'قائمة السور'}</div>
        </div>
        <ChevronDown className="h-5 w-5 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-hidden rounded-3xl p-0 sm:max-w-md">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>سور القرآن</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث باسم السورة أو رقمها"
                className="h-11 rounded-2xl pr-10"
              />
            </div>
          </div>
          <div className="max-h-[55dvh] overflow-y-auto px-3 pb-4">
            {filtered.map((item) => {
              const active = item.number === selected;
              return (
                <button
                  key={item.number}
                  type="button"
                  onClick={() => {
                    onSelect(item.number);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`mb-1 flex w-full items-center justify-between rounded-2xl px-3 py-3 text-right transition-all ${
                    active ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                        active ? 'bg-white/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      {item.number}
                    </span>
                    <span className="font-amiri text-lg">سورة {item.name}</span>
                  </div>
                  <span className={`text-[11px] ${active ? 'text-white/75' : 'text-muted-foreground'}`}>
                    {item.ayahs} آية · {revelationLabel(item.revelation)}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
