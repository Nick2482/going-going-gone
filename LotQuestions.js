"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { when } from "@/lib/format";

function friendly(err, fallback) {
  const msg = err?.message || "";
  if (msg && !/violates|syntax|permission denied|JWT|fetch/i.test(msg)) return msg;
  return fallback;
}

// Questions and answers on a lot. Anyone can read answered questions.
// Signed-in members can ask while the auction runs; the seller answers.
export default function LotQuestions({ lotId, userId, isSeller, ended, live, initialQuestions }) {
  const supabase = createClient();
  const [questions, setQuestions] = useState(initialQuestions);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [editing, setEditing] = useState({});
  const [rowError, setRowError] = useState({});
  const [rowBusy, setRowBusy] = useState({});

  const answered = questions.filter((q) => q.answer);
  const waiting = questions.filter((q) => !q.answer);
  const canAsk = live && !ended && !isSeller;

  async function ask(e) {
    e.preventDefault();
    if (text.trim().length < 3) return setError("Type your question first.");
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("ask_question", { p_lot: lotId, p_question: text });
    setBusy(false);
    if (err) return setError(friendly(err, "Your question didn't send. Please try again."));
    setQuestions((qs) => [...qs, data]);
    setText("");
    setSent(true);
  }

  async function answer(q) {
    const a = (drafts[q.id] ?? q.answer ?? "").trim();
    if (!a) return setRowError((r) => ({ ...r, [q.id]: "Type your answer first." }));
    setRowBusy((b) => ({ ...b, [q.id]: true }));
    setRowError((r) => ({ ...r, [q.id]: "" }));
    const { data, error: err } = await supabase.rpc("answer_question", { p_question: q.id, p_answer: a });
    setRowBusy((b) => ({ ...b, [q.id]: false }));
    if (err) return setRowError((r) => ({ ...r, [q.id]: friendly(err, "Your answer didn't save. Please try again.") }));
    setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, ...data } : x)));
    setEditing((ed) => ({ ...ed, [q.id]: false }));
  }

  async function remove(q) {
    if (!window.confirm("Remove this question? Nobody will see it, including the person who asked.")) return;
    setRowBusy((b) => ({ ...b, [q.id]: true }));
    const { error: err } = await supabase.rpc("remove_question", { p_question: q.id });
    setRowBusy((b) => ({ ...b, [q.id]: false }));
    if (err) return setRowError((r) => ({ ...r, [q.id]: friendly(err, "That didn't work. Please try again.") }));
    setQuestions((qs) => qs.filter((x) => x.id !== q.id));
  }

  function answerForm(q) {
    return (
      <div className="qa-answer-form">
        <label className="visually-hidden" htmlFor={`qa-a-${q.id}`}>Your answer</label>
        <textarea id={`qa-a-${q.id}`} className="input qa-input" maxLength={600} rows={3}
          placeholder="Type your answer. Everyone will see it."
          value={drafts[q.id] ?? q.answer ?? ""}
          onChange={(e) => setDrafts((d) => ({ ...d, [q.id]: e.target.value }))} />
        {rowError[q.id] ? <p className="error" role="alert">{rowError[q.id]}</p> : null}
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-brass btn-sm" disabled={rowBusy[q.id]} onClick={() => answer(q)}>
            {rowBusy[q.id] ? "Saving…" : q.answer ? "Save answer" : "Answer"}
          </button>
          {q.answer ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing((ed) => ({ ...ed, [q.id]: false }))}>Cancel</button> : null}
          <button type="button" className="btn btn-ghost btn-sm qa-remove" disabled={rowBusy[q.id]} onClick={() => remove(q)}>Remove question</button>
        </div>
      </div>
    );
  }

  // The seller's own running lot with no questions yet: say where they'll appear.
  if (!questions.length && isSeller && live && !ended) {
    return (
      <section id="questions" className="qa">
        <h2 className="block-title">Questions &amp; answers</h2>
        <p className="qa-signin">No questions yet. If a buyer asks something, we&apos;ll email you and it will appear here for you to answer.</p>
      </section>
    );
  }
  // Nothing to show and nobody can ask: keep the page tidy.
  if (!questions.length && !canAsk) return null;

  return (
    <section id="questions" className="qa">
      <h2 className="block-title">
        Questions &amp; answers{answered.length ? <span className="hint" style={{ fontWeight: 400 }}> ({answered.length})</span> : null}
      </h2>

      {isSeller && waiting.length ? (
        <div className="qa-waiting">
          <div className="qa-waiting-title">{waiting.length === 1 ? "1 question is" : `${waiting.length} questions are`} waiting for your answer</div>
          <ul className="qa-list">
            {waiting.map((q) => (
              <li key={q.id} className="qa-item">
                <div className="qa-q"><span className="qa-tag">Q</span><span>{q.question}</span></div>
                <div className="hint qa-when">Asked {when(q.created_at)}</div>
                {answerForm(q)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {answered.length ? (
        <ul className="qa-list">
          {answered.map((q) => (
            <li key={q.id} className="qa-item">
              <div className="qa-q"><span className="qa-tag">Q</span><span>{q.question}</span></div>
              {isSeller && editing[q.id] ? answerForm(q) : (
                <div className="qa-a">
                  <span className="qa-tag qa-tag-a">A</span>
                  <span>{q.answer}<span className="hint qa-when"> · seller, {when(q.answered_at || q.created_at)}</span></span>
                </div>
              )}
              {isSeller && !editing[q.id] ? (
                <button type="button" className="qa-edit" onClick={() => setEditing((ed) => ({ ...ed, [q.id]: true }))}>Edit answer</button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !isSeller && !waiting.length ? <p className="hint">No questions yet.</p> : null}

      {!isSeller && waiting.length ? (
        <ul className="qa-list">
          {waiting.map((q) => (
            <li key={q.id} className="qa-item qa-mine">
              <div className="qa-q"><span className="qa-tag">Q</span><span>{q.question}</span></div>
              <div className="hint">Your question · waiting for the seller to answer. We&apos;ll email you when they do.</div>
            </li>
          ))}
        </ul>
      ) : null}

      {canAsk ? (
        userId ? (
          <form className="qa-ask" onSubmit={ask} noValidate>
            <label htmlFor="qa-ask" className="qa-ask-label">Ask the seller a question</label>
            <textarea id="qa-ask" className="input qa-input" maxLength={300} rows={2}
              placeholder="For example: does it come with the charger? Can you deliver?"
              value={text} onChange={(e) => { setText(e.target.value); setSent(false); }} />
            {error ? <p className="error" role="alert">{error}</p> : null}
            {sent ? <p className="qa-sent" role="status">Sent! The seller has been emailed.</p> : null}
            <div className="row" style={{ gap: 10, justifyContent: "space-between" }}>
              <span className="hint">Your name isn&apos;t shown. The answer appears here for everyone.</span>
              <button className="btn btn-brass btn-sm" type="submit" disabled={busy}>{busy ? "Sending…" : "Ask"}</button>
            </div>
          </form>
        ) : (
          <p className="qa-signin"><Link href={`/login?next=/lot/${lotId}%23questions`}>Sign in</Link> to ask the seller a question.</p>
        )
      ) : null}
    </section>
  );
}
