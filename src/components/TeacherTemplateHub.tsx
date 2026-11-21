"use client";

import React, { useState } from "react";
import {
  CopyPlus,
  Globe,
  Lock,
  Plus,
  Trash2,
  Play,
  Volume2,
  VolumeX,
  Users,
  Home,
  Sparkles,
  Check,
  ShieldCheck,
  Ban,
  CheckCircle2,
  Square,
  Copy,
} from "lucide-react";
import {
  ClassroomSessionMode,
  useBitlynnStore,
} from "@/store/useBitlynnStore";
import { triggerTapFeedback } from "@/lib/feedback";

export const TeacherTemplateHub: React.FC = () => {
  const {
    templates,
    activeTemplateId,
    roomPin,
    noiseLevelDb,
    funBlitzList,
    classroomSession,
    setNoiseLevelDb,
    selectTemplate,
    addWordToTemplate,
    removeWordFromTemplate,
    updateTemplateMeta,
    forkTemplate,
    moderateFunBlitz,
    startClassroomSession,
    stopClassroomSession,
    assignActiveTemplateAsHomework,
    setActiveTab,
    openSanctumSection,
  } = useBitlynnStore();

  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) ?? templates[0];

  const [newWord, setNewWord] = useState("");
  const [newClue, setNewClue] = useState("");
  const [newRadarKeyword, setNewRadarKeyword] = useState("");
  const [newRadarFact, setNewRadarFact] = useState("");
  const [copiedPin, setCopiedPin] = useState(false);
  const [sessionMode, setSessionMode] =
    useState<ClassroomSessionMode>("cyber-crew");
  const [hwMessage, setHwMessage] = useState<string | null>(null);

  const isNoisy = noiseLevelDb >= 65;

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newClue.trim()) return;

    addWordToTemplate(activeTemplate.id, {
      word: newWord.trim().toUpperCase(),
      clue: newClue.trim(),
      radarKeyword: newRadarKeyword.trim() || "термін",
      radarFact:
        newRadarFact.trim() ||
        "Підказка від вчителя для самостійного пошуку в Пошуковому Радарі.",
    });

    setNewWord("");
    setNewClue("");
    setNewRadarKeyword("");
    setNewRadarFact("");
  };

  const handleFillMegabytePreset = () => {
    setNewWord("МЕГАБАЙТ");
    setNewClue(
      "Одиниця вимірювання інформації, що дорівнює 1024 кілобайтам."
    );
    setNewRadarKeyword("мільйон");
    setNewRadarFact(
      "Приблизно стільки важить одна якісна фотографія зі смартфона або невелика електронна книга."
    );
  };

  const handleCopyPin = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(roomPin).catch(() => {});
    }
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Clean Flat Page Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
          Хаб вчителя
        </h1>
        <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
          Запуск 15-хвилинного раунду, контроль тиші, шаблони слів і модерація
          тестів.
        </p>
      </div>

      {/* =========================================================
          ROW 1: CLASSROOM PIN & 15-MIN SESSION + NOISE METER
      ========================================================= */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Room PIN & 15-Minute Session */}
        <section className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Кімната класу{" "}
                <span className="font-mono text-cyan-300">#{roomPin}</span>
              </h2>
              <p className="text-xs text-slate-400">
                Учні вводять 4 цифри PIN і миттєво приєднуються до уроку.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyPin}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/75 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white"
            >
              {copiedPin ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                  Скопійовано
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  Копіювати PIN
                </>
              )}
            </button>
          </div>

          {/* 3-Mode Selector for 15-Min Round */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl border border-white/[0.07] bg-abyss-950/60 p-1">
            {(
              [
                { id: "play-hangman", label: "Шибениця" },
                { id: "play-mutator", label: "Бліц" },
                { id: "cyber-crew", label: "Екіпаж 15–18" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  setSessionMode(m.id);
                }}
                className={`min-h-[44px] rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  sessionMode === m.id
                    ? "bg-white/[0.11] text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {!classroomSession.active ? (
              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("success");
                  startClassroomSession(sessionMode, 900);
                  setHwMessage(null);
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500/30 sm:w-auto sm:flex-1"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Запустити 15-хв раунд
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  triggerTapFeedback("tap");
                  stopClassroomSession();
                }}
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-400/45 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500/30 sm:w-auto sm:flex-1"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Зупинити раунд (
                {String(
                  Math.floor(classroomSession.remainingSeconds / 60)
                ).padStart(2, "0")}
                :{String(classroomSession.remainingSeconds % 60).padStart(2, "0")}
                )
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                triggerTapFeedback("success");
                assignActiveTemplateAsHomework();
                setHwMessage(
                  `Шаблон «${activeTemplate.title}» видано як домашнє завдання.`
                );
              }}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/75 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/25 hover:text-white sm:flex-none"
            >
              <Home className="h-3.5 w-3.5 text-slate-400" />
              Видати як ДЗ
            </button>

            <button
              type="button"
              onClick={() => setActiveTab(sessionMode)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/75 px-3.5 py-2 text-xs font-medium text-cyan-200 transition-colors hover:border-white/25 sm:flex-none"
            >
              Перейти в гру →
            </button>
          </div>

          {(hwMessage || classroomSession.assignedAsHomework) && (
            <p className="text-xs text-emerald-300">
              {hwMessage ??
                `Шаблон «${activeTemplate.title}» призначено як домашнє завдання.`}
            </p>
          )}
        </section>

        {/* Classroom Noise Meter */}
        <section
          className={`lg:col-span-5 rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
            isNoisy
              ? "border-rose-400/40 bg-rose-500/[0.06]"
              : "border-white/[0.08] bg-abyss-900/75"
          }`}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 font-display text-base font-semibold text-white">
                {isNoisy ? (
                  <Volume2 className="h-4 w-4 text-rose-300" />
                ) : (
                  <VolumeX className="h-4 w-4 text-emerald-300" />
                )}
                Шумомір класу
              </h2>

              <span
                className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${
                  isNoisy
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
                    : "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {noiseLevelDb} дБ · {isNoisy ? "Шумно" : "Тиша x1.5"}
              </span>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              Коли шум перевищує <strong className="text-slate-200">65 дБ</strong>
              , командний бонус <strong className="text-slate-200">x1.5</strong>{" "}
              тимчасово вимикається.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
              <span>35 дБ</span>
              <span className="text-amber-300">Поріг 65 дБ</span>
              <span>85 дБ</span>
            </div>
            <input
              type="range"
              min={35}
              max={85}
              value={noiseLevelDb}
              onChange={(e) => setNoiseLevelDb(Number(e.target.value))}
              aria-label="Симулятор шуму в класі в децибелах"
              className="w-full cursor-pointer accent-cyan-400"
            />
          </div>
        </section>
      </div>

      {/* =========================================================
          ROW 2: TEMPLATE LIBRARY + ACTIVE TEMPLATE EDITOR
      ========================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left: Template Catalog */}
        <section className="lg:col-span-5 space-y-3">
          <h2 className="font-display text-base font-semibold text-white">
            Бібліотека шаблонів ({templates.length})
          </h2>

          <div className="space-y-2.5">
            {templates.map((tpl) => {
              const isSelected = tpl.id === activeTemplate.id;
              return (
                <div
                  key={tpl.id}
                  className={`rounded-2xl border p-4 transition-colors ${
                    isSelected
                      ? "border-cyan-400/45 bg-abyss-900"
                      : "border-white/[0.08] bg-abyss-900/65 hover:border-white/20"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                      <span>
                        {tpl.subject} · {tpl.gradeRange}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        {tpl.isPublic ? (
                          <>
                            <Globe className="h-3 w-3 text-emerald-300" />
                            Публічний
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            Приватний
                          </>
                        )}
                      </span>
                    </div>

                    <h3 className="font-display text-sm font-semibold text-white sm:text-base">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {tpl.author} · {tpl.hangmanWords.length} слів ·{" "}
                      {tpl.forksCount} копій
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectTemplate(tpl.id)}
                      className={`min-h-[44px] rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                          : "border-white/10 bg-abyss-950/75 text-slate-300 hover:text-white"
                      }`}
                    >
                      {isSelected ? "Обрано" : "Редагувати"}
                    </button>

                    <button
                      type="button"
                      onClick={() => forkTemplate(tpl.id)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/75 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
                    >
                      <CopyPlus className="h-3.5 w-3.5" />
                      Клонувати
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Active Template Editor */}
        <section className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-5">
          {/* Title + Settings */}
          <div className="space-y-3 border-b border-white/[0.07] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">
                Редактор обраного шаблону
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateTemplateMeta(activeTemplate.id, {
                      deliveryMode:
                        activeTemplate.deliveryMode === "classroom-15m"
                          ? "homework"
                          : "classroom-15m",
                    })
                  }
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/75 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-white/25"
                >
                  {activeTemplate.deliveryMode === "classroom-15m" ? (
                    <>
                      <Users className="h-3.5 w-3.5 text-cyan-300" />
                      Урок (15 хв)
                    </>
                  ) : (
                    <>
                      <Home className="h-3.5 w-3.5 text-sky-300" />
                      Домашнє (ДЗ)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateTemplateMeta(activeTemplate.id, {
                      isPublic: !activeTemplate.isPublic,
                    })
                  }
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/75 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-white/25"
                >
                  {activeTemplate.isPublic ? (
                    <>
                      <Globe className="h-3.5 w-3.5 text-emerald-300" />
                      Публічний
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 text-slate-400" />
                      Приватний
                    </>
                  )}
                </button>
              </div>
            </div>

            <input
              type="text"
              value={activeTemplate.title}
              onChange={(e) =>
                updateTemplateMeta(activeTemplate.id, {
                  title: e.target.value,
                })
              }
              aria-label="Назва шаблону уроку"
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3.5 py-2 font-display text-base font-bold text-white focus:border-cyan-400/50 focus:outline-none sm:text-lg"
            />
          </div>

          {/* Current Words */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300">
                Слова теми ({activeTemplate.hangmanWords.length})
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab("play-hangman")}
                className="min-h-[44px] px-2 text-xs font-medium text-cyan-300 hover:underline"
              >
                Тестувати в Шибениці →
              </button>
            </div>

            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {activeTemplate.hangmanWords.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-abyss-950/70 p-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-semibold text-white">
                        {item.word}
                      </span>
                      <span className="font-mono text-[11px] text-amber-300">
                        #{item.radarKeyword}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{item.clue}</p>
                  </div>

                  <button
                    type="button"
                    disabled={activeTemplate.hangmanWords.length <= 1}
                    onClick={() =>
                      removeWordFromTemplate(activeTemplate.id, item.id)
                    }
                    title="Видалити слово"
                    aria-label={`Видалити слово ${item.word}`}
                    className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Word Form */}
          <form
            onSubmit={handleAddWord}
            className="rounded-xl border border-white/[0.08] bg-abyss-950/70 p-4 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                Додати слово
              </span>
              <button
                type="button"
                onClick={handleFillMegabytePreset}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-900 px-3 py-1.5 text-xs font-medium text-amber-200 hover:border-white/25"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Приклад «МЕГАБАЙТ»
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                required
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Слово (напр. МЕГАБАЙТ)"
                className="min-h-[44px] rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
              />
              <input
                type="text"
                value={newRadarKeyword}
                onChange={(e) => setNewRadarKeyword(e.target.value)}
                placeholder="Тег Радару (напр. мільйон)"
                className="min-h-[44px] rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
              />
            </div>

            <input
              type="text"
              required
              value={newClue}
              onChange={(e) => setNewClue(e.target.value)}
              placeholder="Визначення / підказка для учня..."
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
            />

            <input
              type="text"
              value={newRadarFact}
              onChange={(e) => setNewRadarFact(e.target.value)}
              placeholder="Факт у Пошуковому Радарі (необов'язково)..."
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
            />

            <button
              type="submit"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/20 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500/30"
            >
              <Plus className="h-4 w-4" />
              Зберегти слово в шаблон
            </button>
          </form>
        </section>
      </div>

      {/* =========================================================
          ROW 3: MODERATION QUEUE FOR STUDENT 60s TESTS
      ========================================================= */}
      <section className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            <h2 className="font-display text-base font-semibold text-white">
              Модерація 60-сек тестів учнів
            </h2>
          </div>

          <button
            type="button"
            onClick={() => openSanctumSection("blitz")}
            className="min-h-[44px] px-2 text-xs font-medium text-cyan-300 hover:underline"
          >
            Перейти до тестів →
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {funBlitzList.map((blitz) => (
            <div
              key={blitz.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-white/[0.07] bg-abyss-950/70 p-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-semibold leading-snug text-white">
                      {blitz.title}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {blitz.authorName} · {blitz.durationSeconds} сек
                    </span>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${
                      blitz.status === "approved"
                        ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                        : blitz.status === "pending-teacher"
                        ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
                        : "border-rose-400/35 bg-rose-500/10 text-rose-200"
                    }`}
                  >
                    {blitz.status === "approved"
                      ? "Схвалено"
                      : blitz.status === "pending-teacher"
                      ? "Очікує перевірки"
                      : "Відхилено"}
                  </span>
                </div>

                {blitz.questions[0] && (
                  <div className="rounded-lg border border-white/[0.05] bg-abyss-900/80 p-3 text-xs space-y-1">
                    <div className="font-medium text-slate-100">
                      {blitz.questions[0].q}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {blitz.questions[0].options.join(" · ")}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => moderateFunBlitz(blitz.id, "approved")}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Схвалити
                </button>

                <button
                  type="button"
                  onClick={() => moderateFunBlitz(blitz.id, "rejected")}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-abyss-900 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-rose-400/40 hover:text-rose-200"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Відхилити
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
