export const QUESTIONS = {
  booking: 'Хочу забронировать с 25 по 27 сентября',
  breakfast: 'во сколько завтрак в отеле?',
  early: 'Можно ли заехать в отель около 9:00 25 сентября?'
};
export const MESSAGES = {
  greeting: 'Здравствуйте! Я ИИ-помощник «Best Western».<br>Отвечу на ваши вопросы, помогу подобрать номер и оформить бронирование.<p><i>Используя ИИ-Помощник, вы соглашаетесь с <span class="text-link">правилами использования чата</span></i></p>',
  booking: 'Подобрал варианты проживания с <b>25 по 27 сентября 2026 года</b> (2 ночи) в расчете на <b>1 взрослого</b> гостя.<p>Номера доступны к бронированию. Несколько вариантов с минимальной найденной ценой по тарифу:</p><ul><li>Стандарт — от 9 975 руб. за 2 ночи (от 4 987,5 руб./ночь)</li><li>Люкс — от 15 220 руб. за 2 ночи (от 7 610 руб./ночь)</li></ul><p>Посмотреть все доступные категории и оформить бронирование можно по кнопке ниже:</p>',
  breakfast: 'Завтрак в формате «шведский стол» проходит ежедневно <b>с 07:00 до 11:00</b> в ресторане «Пустыня» на 2-м этаже отеля.',
  waiting: 'Понял вас, уже зову менеджера.',
  connected: 'Вам отвечает менеджер Best Western',
  manager: 'Здравствуйте! Спасибо за ожидание. Стандартное время заезда в отель — <b>с 14:00</b>.<p>Заезд в <b>09:00</b> считается ранним заездом и возможен при наличии свободных номеров:</p><ul><li>При наличии готовых номеров услуга предоставляется за дополнительную плату: <b>2 500 руб.</b></li><li>Если вам требуется <b>гарантированный</b> ранний заезд, он оформляется с оплатой полной стоимости предыдущих суток проживания.</li></ul>'
};
export const ROOMS = {
  standard: { name: 'Стандарт двухместный', places: 2, area: 36, rooms: 1, price: 9975, initialPrice: 64800, photo: 'context0-imgMedia.png' },
  luxe: { name: 'Люкс', places: 3, area: 46, rooms: 2, price: 15220, initialPrice: 84800, photo: 'context0-imgMedia1.png' }
};
export function isoDay(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function addDays(iso, days) { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+days); return isoDay(d); }
export function nights(booking) { return Math.round((Date.parse(booking.end+'T12:00:00Z')-Date.parse(booking.start+'T12:00:00Z'))/86400000); }
export function initialState(today = isoDay(new Date())) {
  return { version: 1, started:false, branch:null, chat:[], draft:'', question:'booking', pending:[], mini:false, step:'room', selected:null, completed:false, managerDone:false,
    bookings: {
      1:{start:today,end:addDays(today,1),guests:[{adults:2,children:0}],quoted:false},
      2:{start:'2026-09-25',end:'2026-09-27',guests:[{adults:1,children:0}],quoted:true}
    }
  };
}
export function currentBooking(state) { return state.bookings[state.branch || 1]; }
export function roomPrice(state, room) {
  const booking = currentBooking(state);
  return booking.quoted ? Math.round(ROOMS[room].price * nights(booking) / 2 * 100)/100 : ROOMS[room].initialPrice;
}
export function nextQuestion(s) {
  if (!s.started || s.pending.length || s.managerDone) return null;
  if (s.chat.some(m=>m.key==='breakfast' && m.who==='bot')) return 'early';
  if (s.branch) return 'breakfast';
  return 'booking';
}
export function transition(state, event, now = Date.now()) {
  const s = structuredClone(state);
  const message = (key, who='bot') => s.chat.push({key,who});
  if (s.completed) return s;
  switch(event.type) {
    case 'START': if (!s.started) { s.started=true; message('greeting'); } break;
    case 'TYPE': s.question=nextQuestion(s); if (!s.pending.length && QUESTIONS[s.question]) s.draft=QUESTIONS[s.question]; break;
    case 'SEND': {
      if (!s.draft || s.pending.length) break;
      const key=s.question;
      if (key==='booking') { if(s.branch===1) break; s.branch=2; }
      message(key,'guest'); s.draft=''; s.question=null;
      if(key==='booking') s.pending=[{key:'booking',due:now+700}];
      if(key==='breakfast') s.pending=[{key:'breakfast',due:now+700}];
      if(key==='early') s.pending=[{key:'waiting',due:now+700},{key:'connected',due:now+2700},{key:'manager',due:now+3900}];
      break;
    }
    case 'TICK': {
      // Flush one message per tick. On returning to a suspended tab, keep a visible delay.
      if(s.pending[0]?.due<=now) {
        const next=s.pending.shift(); message(next.key,next.key==='manager'?'manager':next.key==='connected'?'notice':'bot');
        if(next.key==='breakfast') s.question='early';
        if(next.key==='manager') s.managerDone=true;
        if(s.pending[0] && s.pending[0].due<=now) s.pending[0].due=now+1200;
      }
      break;
    }
    case 'OPEN':
      if(!s.started) break;
      if(!s.branch) {s.branch=1;s.question=null;s.draft='';}
      s.mini=true; break;
    case 'CLOSE':
      s.mini=false;
      s.question=nextQuestion(s);
      break;
    case 'SELECT_ROOM':
      if(s.mini && ROOMS[event.room]) {s.selected=event.room;s.step='rate';} break;
    case 'BACK': if(s.mini) s.step='room'; break;
    case 'DATES':
      if(s.mini && event.end>event.start && /^\d{4}-\d{2}-\d{2}$/.test(event.start) && /^\d{4}-\d{2}-\d{2}$/.test(event.end)) {
        currentBooking(s).start=event.start;currentBooking(s).end=event.end;
      } break;
    case 'GUESTS':
      if(s.mini && event.guests.length>0 && event.guests.every(g=>Number.isInteger(g.adults)&&g.adults>=1&&g.adults<=9&&Number.isInteger(g.children)&&g.children>=0&&g.children<=9)) {
        currentBooking(s).guests=event.guests;
        currentBooking(s).quoted=s.branch===2 || (event.guests.length===1 && event.guests[0].adults===1);
      } break;
    case 'SELECT_RATE': if(s.mini && s.step==='rate' && s.managerDone) { s.completed=true;s.mini=false; } break;
  }
  return s;
}
