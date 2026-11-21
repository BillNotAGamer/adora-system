"use client";
import { useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '@/lib/concierge/state';
import { useConcierge } from './concierge-provider';
const FIELD_LABELS = { mood: 'Cảm hứng', party: 'Bạn đồng hành', destination: 'Điểm đến', duration: 'Thời lượng', timing: 'Thời gian', budget: 'Ngân sách', style: 'Phong cách', access: 'Nhu cầu tiếp cận' };
export function ConciergeSurvey() {
  const { state: s, dispatch } = useConcierge();
  const [reset, setReset] = useState(false);
  const q = QUESTIONS[s.question] ?? QUESTIONS[0];
  const reviewing = ['review', 'proposal', 'refinement'].includes(s.stage);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(`${s.question}:${reviewing}`);
  useEffect(() => {
    const step = `${s.question}:${reviewing}`;
    if (previousStep.current !== step && questionHeading.current?.checkVisibility()) {
      questionHeading.current.focus({ preventScroll: true });
      questionHeading.current.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
    previousStep.current = step;
  }, [s.question, reviewing]);
  return <div className="concierge-survey" aria-label="Định hình chuyến đi">
    <p className="adora-eyebrow">{reviewing ? 'Mong muốn của bạn' : 'Định hình chuyến đi'}</p>
    {reviewing ? <><h2 className="font-editorial text-3xl">Một khoảng trời dành riêng.</h2><dl>{QUESTIONS.map(question => <div key={question.key}><dt>{FIELD_LABELS[question.key]}</dt><dd>{s.answers[question.key]?.join(', ') || 'Chưa chọn'} <button type="button" onClick={() => dispatch({ type: 'edit', field: question.key })}>Sửa<span className="sr-only"> {FIELD_LABELS[question.key]}</span></button></dd></div>)}</dl>
      {s.notes.length > 0 && <div><h3>Ghi chú của bạn · chưa diễn giải</h3><ul>{s.notes.map((note, i) => <li key={i}>{note}</li>)}</ul></div>}
      <p className="text-sm">Các mong muốn này không tự động thay đổi bản mẫu. Chọn rõ một ví dụ Đà Lạt bên dưới; không phải hành trình được tạo riêng.</p>
      {s.stage === 'review' && <button type="button" className="concierge-primary" onClick={() => dispatch({ type: 'confirm' })}>Xác nhận & xem ví dụ</button>}
    </> : <><h2 ref={questionHeading} tabIndex={-1} className="font-editorial text-3xl">{q.title}</h2><div className="concierge-choices">{q.choices.map(choice => <button type="button" key={choice} aria-pressed={s.answers[q.key]?.includes(choice) ?? false} onClick={() => dispatch({ type: 'choice', value: choice })}>{choice}</button>)}</div><div className="concierge-actions"><button type="button" className="concierge-primary" onClick={() => dispatch({ type: 'next' })}>Tiếp tục</button><button type="button" onClick={() => dispatch({ type: 'skip' })}>Bỏ qua</button><button type="button" onClick={() => dispatch({ type: 'review' })}>Xem mong muốn</button></div></>}
    {s.error && <p role="alert">{s.error}</p>}
    {reset ? <div className="concierge-actions"><span>Xóa cuộc trò chuyện trong phiên này?</span><button type="button" onClick={() => { dispatch({ type: 'reset', confirmed: true }); setReset(false); }}>Xác nhận xóa</button><button type="button" onClick={() => setReset(false)}>Giữ lại</button></div> : <button type="button" onClick={() => setReset(true)}>Bắt đầu lại</button>}
  </div>;
}
