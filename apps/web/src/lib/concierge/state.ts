import { matchScenario } from '../demo/planner-scenarios.ts';

export const QUESTIONS = [
  { key: 'mood', title: 'Một hành trình lý tưởng sẽ mang lại cho bạn cảm giác gì?', choices: ['Bình yên', 'Lãng mạn', 'Thiên nhiên', 'Văn hóa & ẩm thực', 'Nghỉ dưỡng'], multi: true },
  { key: 'party', title: 'Bạn sẽ đi cùng ai?', choices: ['Một mình', 'Hai người', 'Bạn bè', 'Gia đình'] },
  { key: 'destination', title: 'Miền đất nào đang gọi bạn?', choices: ['Đà Lạt', 'Chưa quyết định', 'Nơi khác — thêm vào ghi chú'] },
  { key: 'duration', title: 'Bạn muốn dành bao lâu?', choices: ['2 ngày', '3 ngày', 'Chưa quyết định'] },
  { key: 'timing', title: 'Bạn dự định đi khi nào?', choices: ['Cuối tuần', 'Chưa có ngày cụ thể'] },
  { key: 'budget', title: 'Khoảng ngân sách mong muốn?', choices: ['Chưa quyết định', 'Thêm khoảng ngân sách vào ghi chú'] },
  { key: 'style', title: 'Một nhịp đi và chốn nghỉ dành cho bạn?', choices: ['Đi chậm', 'Cân bằng', 'Nghỉ dưỡng yên tĩnh'] },
  { key: 'access', title: 'Có nhu cầu tiếp cận hoặc di chuyển nào bạn muốn lưu ý? Không cần chia sẻ thông tin y tế.', choices: ['Không cần thêm', 'Thêm vào ghi chú'] },
] as const;
export type Field = typeof QUESTIONS[number]['key'];
export type Message = { id: number; role: 'user'; text: string } | { id: number; role: 'assistant'; kind: 'scripted'; scenarioId: string } | { id: number; role: 'assistant'; kind: 'unsupported' };
export type State = {
  stage: 'welcome' | 'mood' | 'profile' | 'constraints' | 'review' | 'proposal' | 'refinement';
  question: number; answers: Partial<Record<Field, string[]>>; messages: Message[];
  draft: string; notes: string[]; scenarioId: string | null; panel: 'chat' | 'itinerary';
  editing: boolean; error: string; nextId: number;
};
export const initialState: State = { stage: 'welcome', question: 0, answers: {}, messages: [], draft: '', notes: [], scenarioId: null, panel: 'chat', editing: false, error: '', nextId: 1 };
export type Action = { type: 'draft'; value: string } | { type: 'submit'; text: string } | { type: 'choice'; value: string } | { type: 'next' } | { type: 'skip' } | { type: 'review' } | { type: 'edit'; field: Field } | { type: 'confirm' } | { type: 'sample'; prompt: string } | { type: 'panel'; value: State['panel'] } | { type: 'reset'; confirmed: boolean };
function stageFor(question: number): State['stage'] { return question === 0 ? 'mood' : question === 1 ? 'profile' : 'constraints'; }
function advance(s: State): State {
  if (s.editing || s.question === QUESTIONS.length - 1) return { ...s, stage: 'review', editing: false, error: '' };
  const question = s.question + 1;
  return { ...s, question, stage: stageFor(question), error: '' };
}
export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'draft': return { ...s, draft: a.value, error: '' };
    case 'reset': return a.confirmed ? initialState : s;
    case 'panel': return { ...s, panel: a.value };
    case 'review': return { ...s, stage: 'review', editing: false };
    case 'confirm': return s.stage === 'review' ? { ...s, stage: 'proposal' } : s;
    case 'edit': { const question = QUESTIONS.findIndex(q => q.key === a.field); return { ...s, question, stage: stageFor(question), editing: true }; }
    case 'choice': {
      const q = QUESTIONS[s.question] ?? QUESTIONS[0];
      if (!q.choices.some(v => v === a.value)) return s;
      const old = s.answers[q.key] ?? [];
      if ('multi' in q && !old.includes(a.value) && old.length >= 3) return { ...s, error: 'Chọn tối đa ba cảm hứng.' };
      const values = 'multi' in q ? old.includes(a.value) ? old.filter(v => v !== a.value) : [...old, a.value] : [a.value];
      return { ...s, answers: { ...s.answers, [q.key]: values }, stage: stageFor(s.question), error: '' };
    }
    case 'skip': return advance({ ...s, answers: { ...s.answers, [(QUESTIONS[s.question] ?? QUESTIONS[0]).key]: [] } });
    case 'next': return advance(s);
    case 'submit':
    case 'sample': {
      const text = (a.type === 'sample' ? a.prompt : a.text).trim();
      if (!text) return s;
      if (text.length > 2000) return { ...s, error: 'Vui lòng giới hạn ghi chú trong 2000 ký tự.' };
      const scenario = matchScenario(text);
      const messages: Message[] = [...s.messages, { id: s.nextId, role: 'user', text }, scenario ? { id: s.nextId + 1, role: 'assistant', kind: 'scripted', scenarioId: scenario.id } : { id: s.nextId + 1, role: 'assistant', kind: 'unsupported' }];
      return { ...s, messages, nextId: s.nextId + 2, draft: '', error: '', notes: scenario ? s.notes : [...s.notes, text], scenarioId: scenario?.id ?? s.scenarioId, stage: scenario ? 'refinement' : s.stage };
    }
  }
}
