"use client";
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useConcierge } from './concierge-provider';
import { ConciergeSurvey } from './concierge-survey';
import { PLANNER_SCENARIOS, UNSUPPORTED_PROMPT_REPLY } from '@/lib/demo/planner-scenarios';
import { TRIPS, PERIOD_LABELS } from '@/lib/demo/trips';

const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
export default function ConciergeDialog() {
  const { state: s, dispatch, close, logPositionRef } = useConcierge();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const backdropStart = useRef(false);
  const log = useRef<HTMLDivElement>(null);
  const previousPanel = useRef(s.panel);
  const scenario = PLANNER_SCENARIOS.find(item => item.id === s.scenarioId);
  const trip = TRIPS.find(item => item.slug === scenario?.tripSlug);
  useEffect(() => {
    const element = dialog.current!;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    if (!element.open) element.showModal();
    heading.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => { performance.mark('adora-concierge-painted'); });
    return () => { cancelAnimationFrame(frame); if (element.open) element.close(); root.style.overflow = previous; };
  }, []);
  useEffect(() => {
    if (log.current && s.panel === 'chat') log.current.scrollTop = logPositionRef.current;
    if (previousPanel.current !== s.panel) {
      const target = s.panel === 'itinerary' ? dialog.current?.querySelector<HTMLElement>('.concierge-preview h2') : heading.current;
      target?.focus({ preventScroll: true });
      previousPanel.current = s.panel;
    }
  }, [s.panel, logPositionRef]);
  return <dialog ref={dialog} className="concierge-dialog" aria-labelledby="concierge-title" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, [tabindex="0"]')).filter(el => el.checkVisibility());
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} onCancel={event => { event.preventDefault(); close(); }} onPointerDown={event => { backdropStart.current = event.target === event.currentTarget; }} onPointerUp={event => { if (backdropStart.current && event.target === event.currentTarget) close(); backdropStart.current = false; }}>
    <div className="concierge-shell">
      <header className="concierge-top"><div><p className="adora-eyebrow">ADORA · Demo có kịch bản</p><h2 id="concierge-title" ref={heading} tabIndex={-1} className="font-editorial text-3xl">Your Travel Concierge</h2></div><div className="concierge-actions"><Link href="/ai-planner" onClick={() => close(false)}>Mở rộng ↗</Link><button type="button" aria-label="Đóng Concierge" onClick={() => close()}>Đóng ×</button></div></header>
      <div className="concierge-body" data-panel={s.panel}>
        <div className="concierge-chat">
          <div ref={log} className="concierge-scroll" onScroll={event => { if (event.currentTarget.checkVisibility()) logPositionRef.current = event.currentTarget.scrollTop; }}>
            <p className="concierge-disclosure">Chưa kết nối mô hình AI. Hai hành trình Đà Lạt là ví dụ viết sẵn, không được tạo riêng và không được lưu sau khi tải lại.</p>
            <ConciergeSurvey />
            <div role="log" aria-label="Nội dung cuộc trò chuyện Concierge" aria-live="polite" aria-relevant="additions text">
              {s.messages.map(message => <article key={message.id} className={`concierge-message ${message.role}`}><p className="adora-eyebrow">{message.role === 'user' ? 'Bạn · ghi chú' : 'ADORA · phản hồi dựng sẵn'}</p><p>{message.role === 'user' ? message.text : message.kind === 'scripted' ? PLANNER_SCENARIOS.find(item => item.id === message.scenarioId)?.introduction : `${UNSUPPORTED_PROMPT_REPLY} Đã thêm vào ghi chú; bản demo chưa diễn giải yêu cầu tự do.`}</p></article>)}
            </div>
            {['proposal', 'refinement'].includes(s.stage) && <div className="concierge-choices" aria-label="Chọn ví dụ dựng sẵn">{PLANNER_SCENARIOS.map(item => <button type="button" key={item.id} onClick={() => dispatch({ type: 'sample', prompt: item.prompt })}>{item.prompt}</button>)}</div>}
            {trip && <button type="button" className="concierge-primary" onClick={() => dispatch({ type: 'panel', value: 'itinerary' })}>Xem lịch trình minh họa</button>}
          </div>
          <form className="concierge-composer" onSubmit={event => { event.preventDefault(); dispatch({ type: 'submit', text: s.draft }); }}><label htmlFor="concierge-prompt">Ghi chú chuyến đi · bản demo</label><div><textarea id="concierge-prompt" rows={2} maxLength={2000} value={s.draft} aria-describedby="concierge-input-note" onChange={event => dispatch({ type: 'draft', value: event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); dispatch({ type: 'submit', text: s.draft }); } }} /><button type="submit" aria-label="Gửi ghi chú">Gửi ↗</button></div><p id="concierge-input-note">Ghi chú tự do được giữ nguyên, chưa được AI diễn giải. Tối đa 2000 ký tự.</p></form>
        </div>
        <aside className="concierge-preview" aria-label="Lịch trình minh họa"><button type="button" className="concierge-back" onClick={() => dispatch({ type: 'panel', value: 'chat' })}>← Trở lại trò chuyện</button>
          {trip ? <><div className="concierge-cover"><Image src={trip.cover.src} alt={trip.cover.alt} fill sizes="(min-width: 1024px) 440px, 90vw" /></div><p className="adora-eyebrow">Bản mẫu minh họa · {trip.durationDays} ngày</p><h2 tabIndex={-1} className="font-editorial text-4xl">{trip.title}</h2><p>{trip.pace}</p>{trip.days.map(day => <section key={day.day}><h3>Ngày {day.day} · {day.title}</h3><p>{day.summary}</p><ol>{day.activities.map(activity => <li key={activity.id}><span>{PERIOD_LABELS[activity.period]}</span> · {activity.title}</li>)}</ol><p>Ước tính minh họa: {money(day.illustrativeBudgetVnd)}</p></section>)}<p className="concierge-total">Tổng minh họa: {money(trip.days.reduce((sum, day) => sum + day.illustrativeBudgetVnd, 0))}</p><p>Không phải báo giá. Chưa xác nhận giá, tồn chỗ, vận chuyển hoặc lưu trú. Không có phân bổ chi phí theo hạng mục trong bản mẫu.</p><ul>{trip.planNotes.map(note => <li key={note}>{note}</li>)}</ul><Link href={`/trips/${trip.slug}`} onClick={() => close(false)}>Xem lịch trình đầy đủ ↗</Link> · <Link href="/destinations/da-lat" onClick={() => close(false)}>Khám phá Đà Lạt</Link></> : <div className="concierge-preview-empty"><p className="adora-eyebrow">Từ cảm hứng đến hành trình</p><h2 tabIndex={-1} className="font-editorial">Một khoảng trời.<br /><em>Một nhịp đi riêng.</em></h2><p>Sau khi xem lại mong muốn, bạn có thể khám phá một trong hai lịch trình Đà Lạt dựng sẵn.</p><span aria-hidden="true">✧</span></div>}
        </aside>
      </div>
    </div>
  </dialog>;
}
