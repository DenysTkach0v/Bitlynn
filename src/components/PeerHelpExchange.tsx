"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  MessageSquareHeart,
  Eye,
  EyeOff,
  Coins,
  Send,
  PlusCircle,
  CheckCircle2,
  Puzzle,
} from "lucide-react";
import { PrivacyScope, useBitlynnStore } from "@/store/useBitlynnStore";
import { triggerTapFeedback } from "@/lib/feedback";

const EMPATHY_PRESETS = [
  "Я теж учора на цьому заплутався, дивись як легко! 💪",
  "Не переживай, наша вчителька пояснювала це на прикладі піци 🍕",
  "Ти на правильному шляху, залишився один крок! ✨",
  "Без паніки! Зараз розкладемо по поличках за 30 секунд 🦎",
];

const QUICK_ANSWER_PRESETS: Record<string, string> = {
  "tkt-2":
    "У кодуванні UTF-16 кожна літера важить рівно 2 байти (16 бітів). У слові «СОНЦЕ» 5 літер: 5 × 2 = 10 байтів (або 10 × 8 = 80 бітів)!",
  "tkt-3":
    "Цикл FOR — це коли ти точно знаєш скільки разів бігти (напр. 3 сектори в Кібер-Екіпажі). А цикл WHILE (ПОКИ) — біжиш, ПОКИ не закінчиться енергія або час!",
};

export const PeerHelpExchange: React.FC = () => {
  const {
    privacyScope,
    setPrivacyScope,
    peerTickets,
    studentChallenges,
    draftHelpRequest,
    clearDraftHelpRequest,
    createPeerTicket,
    answerPeerTicket,
    receiveSimulatedPeerReply,
    reactToPeerReply,
    acceptPeerReply,
    createStudentChallenge,
    solveStudentChallenge,
  } = useBitlynnStore();

  const replyTimersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = replyTimersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const [subTab, setSubTab] = useState<"freelance-help" | "student-ugc">(
    "freelance-help"
  );
  const [scopeFilter, setScopeFilter] = useState<"all" | PrivacyScope>("all");

  // Ask for help form state
  const [askTopic, setAskTopic] = useState("Одиниці інформації");
  const [askQuestion, setAskQuestion] = useState("");
  const [askBounty, setAskBounty] = useState(30);
  const [askStatusMsg, setAskStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (draftHelpRequest) {
      setSubTab("freelance-help");
      setAskTopic(draftHelpRequest.topic);
      setAskQuestion(draftHelpRequest.question);
      setAskStatusMsg(
        "Питання із завдання підставлено автоматично — натисни «Опублікувати запит»."
      );
      clearDraftHelpRequest();
    }
  }, [draftHelpRequest, clearDraftHelpRequest]);

  // Reply state per ticket (collapsed by default for clean feed)
  const [activeReplyTicketId, setActiveReplyTicketId] = useState<string | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const [selectedEmpathy, setSelectedEmpathy] = useState(EMPATHY_PRESETS[0]);

  // Student-Created Challenge (UGC) state
  const [ugcTitle, setUgcTitle] = useState("");
  const [ugcPrompt, setUgcPrompt] = useState("");
  const [ugcOpt1, setUgcOpt1] = useState("");
  const [ugcOpt2, setUgcOpt2] = useState("");
  const [ugcOpt3, setUgcOpt3] = useState("");
  const [ugcCorrectIdx, setUgcCorrectIdx] = useState(0);
  const [ugcExplanation, setUgcExplanation] = useState("");
  const [selectedChallengeAnswers, setSelectedChallengeAnswers] = useState<
    Record<string, number>
  >({});

  const filteredTickets = peerTickets.filter((t) =>
    scopeFilter === "all" ? true : t.scope === scopeFilter
  );

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim()) return;
    const ok = createPeerTicket({
      topic: askTopic,
      question: askQuestion,
      bountyCoins: askBounty,
      scope: privacyScope,
    });
    if (ok) {
      triggerTapFeedback("success");
      setAskQuestion("");
      const createdId = useBitlynnStore.getState().peerTickets[0]?.id;
      if (createdId) {
        const timerId = window.setTimeout(() => {
          receiveSimulatedPeerReply(createdId);
          triggerTapFeedback("tap");
        }, 2200);
        replyTimersRef.current.push(timerId);
      }
      setAskStatusMsg(
        privacyScope === "class-named"
          ? "Запит надіслано в чат класу — однокласники вже читають."
          : "Анонімний запит надіслано між школами — очікуй відповідь."
      );
    } else {
      triggerTapFeedback("error");
      setAskStatusMsg("Недостатньо коїнів на балансі для такої винагороди.");
    }
  };

  const handleSendReply = (ticketId: string) => {
    const textToUse =
      replyText.trim() ||
      QUICK_ANSWER_PRESETS[ticketId] ||
      "Дивись: переводимо байти у біти множенням на 8, а кілобайти у байти множенням на 1024!";
    answerPeerTicket(ticketId, textToUse, selectedEmpathy);
    setReplyText("");
    setActiveReplyTicketId(null);
  };

  const handleCreateUgc = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !ugcTitle.trim() ||
      !ugcPrompt.trim() ||
      !ugcOpt1.trim() ||
      !ugcOpt2.trim()
    )
      return;
    const opts = [
      ugcOpt1.trim(),
      ugcOpt2.trim(),
      ugcOpt3.trim() || "Інший варіант",
    ];
    createStudentChallenge({
      title: ugcTitle,
      prompt: ugcPrompt,
      options: opts,
      correctIndex: ugcCorrectIdx,
      explanation:
        ugcExplanation.trim() || "Перевірено автором завдання з 7-А класу!",
      rewardCoins: 30,
      scope: privacyScope,
    });
    setUgcTitle("");
    setUgcPrompt("");
    setUgcOpt1("");
    setUgcOpt2("");
    setUgcOpt3("");
    setUgcExplanation("");
  };

  return (
    <div className="space-y-6">
      {/* Clean Flat Page Header + Privacy Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white sm:text-2xl">
            Біржа допомоги
          </h1>
          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
            Запитуй однолітків, пояснюй задачі за коїни та створюй власні
            челенджі.
          </p>
        </div>

        {/* Clean Privacy Mode Toggle */}
        <div
          role="group"
          aria-label="Режим видимості імені"
          className="inline-grid grid-cols-2 gap-1 self-start rounded-xl border border-white/[0.08] bg-abyss-900/75 p-1 sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setPrivacyScope("class-named")}
            aria-pressed={privacyScope === "class-named"}
            className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              privacyScope === "class-named"
                ? "bg-white/[0.10] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Eye className="h-3.5 w-3.5 text-emerald-300" />
            Мій клас
          </button>

          <button
            type="button"
            onClick={() => setPrivacyScope("interschool-anon")}
            aria-pressed={privacyScope === "interschool-anon"}
            className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              privacyScope === "interschool-anon"
                ? "bg-white/[0.10] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <EyeOff className="h-3.5 w-3.5 text-cyan-300" />
            Анонімно
          </button>
        </div>
      </div>

      {/* Clean Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="inline-flex rounded-xl border border-white/[0.08] bg-abyss-900/70 p-1 gap-1">
          <button
            type="button"
            onClick={() => setSubTab("freelance-help")}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              subTab === "freelance-help"
                ? "bg-white/[0.10] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquareHeart className="h-4 w-4 text-cyan-300" />
            Питання ({peerTickets.length})
          </button>

          <button
            type="button"
            onClick={() => setSubTab("student-ugc")}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              subTab === "student-ugc"
                ? "bg-white/[0.10] text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Puzzle className="h-4 w-4 text-pink-300" />
            Завдання учнів ({studentChallenges.length})
          </button>
        </div>

        {subTab === "freelance-help" && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "all", label: "Усі" },
                { id: "class-named", label: "Мій клас" },
                { id: "interschool-anon", label: "Між школами" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setScopeFilter(f.id)}
                className={`min-h-[44px] min-w-[44px] rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                  scopeFilter === f.id
                    ? "border-cyan-400/40 bg-cyan-500/15 text-white"
                    : "border-white/[0.07] bg-abyss-900/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* =========================================================
          SUB-VIEW 1: HELP REQUESTS FEED + ASK FORM
      ========================================================= */}
      {subTab === "freelance-help" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left 7 Cols: Clean Ticket Feed */}
          <div className="lg:col-span-7 space-y-4">
            {filteredTickets.map((tkt) => {
              const isClassNamed = tkt.scope === "class-named";
              const displayedAuthor = isClassNamed
                ? tkt.authorName
                : tkt.authorAnonAlias;
              const isReplying = activeReplyTicketId === tkt.id;

              return (
                <article
                  key={tkt.id}
                  className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-4 sm:p-5 space-y-3.5"
                >
                  {/* Ticket Meta Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className="font-semibold text-white">
                        {displayedAuthor}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">
                        ·
                      </span>
                      <span className="text-slate-400">{tkt.topic}</span>
                      <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-slate-300">
                        {isClassNamed ? "Мій клас" : "Анонімно"}
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-amber-200">
                      <Coins className="h-3.5 w-3.5" />+{tkt.bountyCoins}
                    </span>
                  </div>

                  {/* Question Text */}
                  <p className="text-sm leading-relaxed text-slate-100 sm:text-[15px]">
                    {tkt.question}
                  </p>

                  {/* Typing indicator */}
                  {tkt.authorName.startsWith("Ви (") &&
                    tkt.replies.length === 0 && (
                      <div className="rounded-xl border border-white/[0.08] bg-abyss-950/60 px-3.5 py-2.5 text-xs text-cyan-200">
                        {isClassNamed
                          ? "Однокласник друкує відповідь..."
                          : "Хтось із іншої школи друкує відповідь..."}
                      </div>
                    )}

                  {/* Existing Replies */}
                  {tkt.replies.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      {tkt.replies.map((rep) => {
                        const canAccept =
                          tkt.status === "open" || !rep.acceptedByAuthor;
                        return (
                          <div
                            key={rep.id}
                            className="rounded-xl border border-white/[0.06] border-l-2 border-l-emerald-400/60 bg-abyss-950/65 p-3.5 space-y-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-emerald-300">
                                {isClassNamed
                                  ? rep.authorName
                                  : rep.authorAnonAlias}{" "}
                                <span className="font-normal text-slate-400">
                                  · {rep.schoolBadge}
                                </span>
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {rep.createdAt}
                              </span>
                            </div>

                            <p className="text-xs leading-relaxed text-slate-200 sm:text-sm">
                              {rep.explanation}
                            </p>

                            <p className="text-xs italic text-slate-400">
                              «{rep.empathyNote}»
                            </p>

                            {/* Reactions & Accept */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {["🔥", "❤️", "🦎"].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => {
                                      triggerTapFeedback("tap");
                                      reactToPeerReply(tkt.id, rep.id, emoji);
                                    }}
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-abyss-900 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:border-white/20 active:scale-95"
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-mono text-[11px] text-slate-400">
                                      {rep.reactions?.[emoji] ?? 0}
                                    </span>
                                  </button>
                                ))}
                              </div>

                              {canAccept ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerTapFeedback("success");
                                    acceptPeerReply(tkt.id, rep.id);
                                  }}
                                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition-colors hover:bg-emerald-500/25"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Допомогло (+15)
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Подяку надіслано (+15)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reply Action / Composer */}
                  {!tkt.authorName.startsWith("Ви (") && (
                    <div className="pt-0.5">
                      {!isReplying ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReplyTicketId(tkt.id);
                            setReplyText(QUICK_ANSWER_PRESETS[tkt.id] ?? "");
                          }}
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-abyss-950/75 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-400/40 hover:text-white"
                        >
                          <Send className="h-3.5 w-3.5 text-cyan-300" />
                          Відповісти (+{tkt.bountyCoins} коїнів)
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-xl border border-white/12 bg-abyss-950/80 p-3.5 space-y-3"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span className="font-medium">
                              Твоя відповідь (
                              {isClassNamed ? "клас" : "анонімно"})
                            </span>
                            <button
                              type="button"
                              onClick={() => setActiveReplyTicketId(null)}
                              className="min-h-[44px] px-2 text-slate-400 hover:text-white"
                            >
                              Скасувати
                            </button>
                          </div>

                          <textarea
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Напиши просте пояснення своїми словами..."
                            className="w-full rounded-xl border border-white/10 bg-abyss-900 p-3 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
                          />

                          <div className="space-y-1.5">
                            <span className="text-[11px] text-slate-400">
                              Фраза підтримки:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {EMPATHY_PRESETS.map((emp) => (
                                <button
                                  key={emp}
                                  type="button"
                                  onClick={() => setSelectedEmpathy(emp)}
                                  className={`min-h-[44px] rounded-xl border px-3 py-1.5 text-left text-xs transition-colors ${
                                    selectedEmpathy === emp
                                      ? "border-cyan-400/45 bg-cyan-500/15 text-white"
                                      : "border-white/[0.08] bg-abyss-900 text-slate-400 hover:text-slate-200"
                                  }`}
                                >
                                  {emp}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSendReply(tkt.id)}
                            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/45 bg-emerald-500/20 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-500/30"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Надіслати допомогу (+{tkt.bountyCoins} коїнів)
                          </button>
                        </motion.div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {/* Right 5 Cols: Clean Ask Form */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <form
              onSubmit={handleCreateTicket}
              className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-4"
            >
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Спитати однолітків
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Режим:{" "}
                  <span className="text-slate-200">
                    {privacyScope === "class-named"
                      ? "Мій клас (з ім'ям)"
                      : "Між школами (анонімно)"}
                  </span>
                </p>
              </div>

              <div className="space-y-2.5">
                <input
                  type="text"
                  value={askTopic}
                  onChange={(e) => setAskTopic(e.target.value)}
                  placeholder="Тема (напр. Одиниці інформації)"
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3.5 py-2 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
                />

                <textarea
                  rows={3}
                  required
                  value={askQuestion}
                  onChange={(e) => setAskQuestion(e.target.value)}
                  placeholder="Опиши, що саме не виходить у задачі..."
                  className="w-full rounded-xl border border-white/10 bg-abyss-950/80 p-3.5 text-base text-white placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none sm:text-sm"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-abyss-950/60 px-3 py-2">
                  <span className="text-xs text-slate-400">Винагорода:</span>
                  <div className="flex items-center gap-1">
                    {[20, 30, 45].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAskBounty(val)}
                        className={`min-h-[44px] min-w-[44px] rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-colors ${
                          askBounty === val
                            ? "bg-white/[0.12] text-white"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/20 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500/30"
              >
                <PlusCircle className="h-4 w-4" />
                Опублікувати запит ({askBounty} коїнів)
              </button>

              {askStatusMsg && (
                <p className="text-xs text-emerald-300">{askStatusMsg}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          SUB-VIEW 2: STUDENT-CREATED CHALLENGES (UGC)
      ========================================================= */}
      {subTab === "student-ugc" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* Left 7 Cols: Challenges List */}
          <div className="lg:col-span-7 space-y-4">
            {studentChallenges.map((ch) => {
              const selectedIdx = selectedChallengeAnswers[ch.id];
              const effectiveSelectedIdx =
                selectedIdx ?? (ch.solvedByUser ? ch.correctIndex : undefined);
              const isAnswered = effectiveSelectedIdx !== undefined;
              const isCorrect =
                ch.solvedByUser || effectiveSelectedIdx === ch.correctIndex;

              return (
                <div
                  key={ch.id}
                  className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-4 sm:p-5 space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400">
                      Автор:{" "}
                      <span className="font-medium text-slate-200">
                        {ch.scope === "class-named"
                          ? ch.authorName
                          : ch.authorAnonAlias}
                      </span>{" "}
                      · ❤️ {ch.likes}
                    </span>

                    <span className="font-mono font-semibold text-cyan-300">
                      {ch.solvedByUser
                        ? `Розв'язано (+${ch.rewardCoins})`
                        : `+${ch.rewardCoins} коїнів`}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-semibold text-white">
                      {ch.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">
                      {ch.prompt}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {ch.options.map((opt, idx) => {
                      const chosen = effectiveSelectedIdx === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={ch.solvedByUser}
                          onClick={() => {
                            setSelectedChallengeAnswers((prev) => ({
                              ...prev,
                              [ch.id]: idx,
                            }));
                            if (idx === ch.correctIndex && !ch.solvedByUser) {
                              solveStudentChallenge(ch.id);
                            }
                          }}
                          className={`min-h-[44px] rounded-xl border px-3.5 py-2.5 text-left text-xs font-medium transition-colors sm:text-sm ${
                            chosen && idx === ch.correctIndex
                              ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                              : chosen && idx !== ch.correctIndex
                              ? "border-rose-400/50 bg-rose-500/15 text-rose-100"
                              : "border-white/10 bg-abyss-950/75 text-slate-200 hover:border-white/25"
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {isAnswered && (
                    <div
                      className={`rounded-xl border p-3 text-xs ${
                        isCorrect
                          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                          : "border-rose-400/35 bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      {isCorrect ? (
                        <span>
                          <CheckCircle2 className="mr-1 inline h-4 w-4" />
                          Правильно! +{ch.rewardCoins} коїнів. {ch.explanation}
                        </span>
                      ) : (
                        <span>
                          Спробуй ще! Підказка: {ch.explanation}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right 5 Cols: Clean Challenge Creator */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <form
              onSubmit={handleCreateUgc}
              className="rounded-2xl border border-white/[0.08] bg-abyss-900/75 p-5 space-y-3"
            >
              <div>
                <h2 className="font-display text-base font-semibold text-white">
                  Створити завдання для друзів
                </h2>
                <p className="text-xs text-slate-400">
                  +20 коїнів автору за нову задачу
                </p>
              </div>

              <input
                type="text"
                required
                value={ugcTitle}
                onChange={(e) => setUgcTitle(e.target.value)}
                placeholder="Назва челенджу (напр. Загадка про Мегабайт)"
                className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 text-base text-white placeholder:text-slate-500 sm:text-sm"
              />

              <textarea
                rows={2}
                required
                value={ugcPrompt}
                onChange={(e) => setUgcPrompt(e.target.value)}
                placeholder="Умова задачі..."
                className="w-full rounded-xl border border-white/10 bg-abyss-950/80 p-3 text-base text-white placeholder:text-slate-500 sm:text-sm"
              />

              <div className="space-y-2">
                <input
                  type="text"
                  required
                  value={ugcOpt1}
                  onChange={(e) => setUgcOpt1(e.target.value)}
                  placeholder="Варіант 1"
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 text-base text-white placeholder:text-slate-500 sm:text-sm"
                />
                <input
                  type="text"
                  required
                  value={ugcOpt2}
                  onChange={(e) => setUgcOpt2(e.target.value)}
                  placeholder="Варіант 2"
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 text-base text-white placeholder:text-slate-500 sm:text-sm"
                />
                <input
                  type="text"
                  value={ugcOpt3}
                  onChange={(e) => setUgcOpt3(e.target.value)}
                  placeholder="Варіант 3 (необов'язково)"
                  className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 text-base text-white placeholder:text-slate-500 sm:text-sm"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Правильний варіант:</span>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setUgcCorrectIdx(idx)}
                      className={`min-h-[44px] min-w-[44px] rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold ${
                        ugcCorrectIdx === idx
                          ? "border-emerald-400/45 bg-emerald-500/20 text-emerald-100"
                          : "border-white/[0.08] bg-abyss-950 text-slate-400"
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                value={ugcExplanation}
                onChange={(e) => setUgcExplanation(e.target.value)}
                placeholder="Коротке пояснення рішення..."
                className="min-h-[44px] w-full rounded-xl border border-white/10 bg-abyss-950/80 px-3 py-2 text-base text-white placeholder:text-slate-500 sm:text-sm"
              />

              <button
                type="submit"
                className="min-h-[44px] w-full rounded-xl border border-cyan-400/40 bg-cyan-500/20 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-500/30"
              >
                Опублікувати завдання (+20 коїнів)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
