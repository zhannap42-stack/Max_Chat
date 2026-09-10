import { QUESTIONS, MESSAGES, ROOMS, initialState, transition, currentBooking, roomPrice, nights, addDays, isoDay, nextQuestion } from './state.js?v=5';

const app = document.querySelector('#app');
const STORAGE = 'tl-chat-prototype-v3';
let state;
try { state=JSON.parse(sessionStorage.getItem(STORAGE)); } catch {}
if(state?.version!==1) state=initialState();
let panel=null, dateDraft=null, guestsDraft=null, returnFocus=null;
const money = n => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
const dateText = iso => new Date(iso+'T12:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
const dateRange = b => `${dateText(b.start)} — ${dateText(b.end)}`;
const plural = (n, forms) => forms[n%100>=11&&n%100<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2];
const nightLabel = n => `${n} ${plural(n,['ночь','ночи','ночей'])}`;
function guestLabel(b) {
  const adults=b.guests.reduce((n,g)=>n+g.adults,0), children=b.guests.reduce((n,g)=>n+g.children,0);
  return `${adults} ${plural(adults,['взрослый','взрослых','взрослых'])}${children?`, детей: ${children}`:''}${b.guests.length>1?' · 2 номера':''}`;
}
const asset = name => `./${name}`;
const icon = (name,cls='') => `<img class="icon ${cls}" src="${asset(name)}" alt="" draggable="false">`;
const closeIcon=()=>icon('context0-imgExit.svg');
function save(){try{sessionStorage.setItem(STORAGE,JSON.stringify(state));}catch{}}
function dispatch(event) { state=transition(state,event);save();render(); }
function header(mini=false) {
  return mini?`<header class="mini-header"><button class="icon-button" data-action="close" aria-label="Закрыть Mini App">${closeIcon()}</button><b>Best Western</b><span class="dots" aria-hidden="true">⋮</span></header>`:
    `<header class="chat-header"><span class="header-back" aria-hidden="true">${icon('context0-imgAiArrowLeft24.svg')}</span>${icon('startContext-imgIcn.svg','avatar')}<div><b>Best Western</b><small>${state.managerDone?'Менеджер':'Бот'}</small></div><span class="dots" aria-hidden="true">⋮</span></header>`;
}
function chatMarkup() {
  if(!state.mini) state.question=nextQuestion(state);
  if(!state.started) return `${header()}<main class="welcome"><div class="welcome-card">${icon('startContext-imgIcn.svg','welcome-avatar')}<b>Хотите узнать, что умеет бот?</b><p>Нажмите <b>«Начать»</b>, чтобы запустить чат с ботом и оценить его в деле</p></div></main><footer class="composer"><button class="primary start" data-action="start">Начать</button></footer>`;
  return `${header()}<main class="messages" role="log" aria-label="История переписки" aria-live="polite" aria-relevant="additions"><div class="day-label">Сегодня</div>${state.chat.map(m=>{
    const guest=m.who==='guest';
    return `<div class="message-row ${guest?'outgoing':'incoming'}"><div class="bubble ${guest?'guest':'bot'}">${guest?QUESTIONS[m.key]:MESSAGES[m.key]}</div>${m.key==='booking'&&!guest?`<button class="booking-cta" data-action="open">${icon('external-link.svg')}<span>Перейти к бронированию</span></button>`:''}</div>`;
  }).join('')}</main><footer class="composer"><button class="primary open-button" data-action="open">${icon('context2-imgIcn1.svg')}Открыть</button><button class="message-field ${state.draft?'filled':''}" data-action="type" aria-label="Поле сообщения" ${!state.question||state.pending.length?'disabled':''}>${state.draft||'Сообщение'}</button>${state.draft?`<button class="primary send" data-action="send" aria-label="Отправить сообщение">${icon('send.svg')}</button>`:'<span class="composer-attachment" aria-hidden="true"></span><span class="composer-mic" aria-hidden="true"></span>'}</footer>`;
}
function roomCard(key) {
  const r=ROOMS[key],b=currentBooking(state);
  return `<article class="room-card"><div class="room-image"><img src="${asset(r.photo)}" alt="${r.name}" class="room-photo"><span class="bestseller">${icon('context0-imgBficCup2424.svg')}Лидер продаж</span><span class="gallery-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div><div class="room-content"><div class="room-name"><h2>${r.name}</h2><span class="room-expand">${icon('context0-imgBficArrowDown2424.svg')}</span></div><div class="properties"><span>${icon('context0-imgBfic3People2424.svg')}до ${r.places} мест</span><span>${icon('context0-imgBficSquare2424.svg')}${r.area} м²</span><span>${icon('context0-imgBeicQuantityRoom24.svg')}${r.rooms} комн.</span></div><div class="room-price"><small>от</small> ${money(roomPrice(state,key))} ₽<small class="price-detail">${nightLabel(nights(b))} / ${guestLabel(b)}</small></div><button class="primary" data-action="room" data-room="${key}" aria-label="Выбрать ${r.name}">Выбрать</button></div></article>`;
}
function roomMarkup() {
  const b=currentBooking(state);
  return `<div class="mini-scroll" data-scroll="room"><section class="booking-controls"><div class="promo-row"><span class="promo"><span class="promo-lock">${icon('context0-imgBficLock2424.svg')}</span>Ввести<br>промокод</span><span class="locale"><span>${icon('context0-imgFrame.svg')}</span><b>RUB</b></span><span class="login">${icon('context0-imgAva.svg')}Войти</span></div><button class="select" data-action="dates" aria-label="Выбрать даты"><span><small>Заезд — Выезд</small>${dateRange(b)}</span>${icon('context0-imgIcons18IcArrow18Down.svg')}</button><button class="select" data-action="guests" aria-label="Выбрать гостей"><span><small>Гости</small>${guestLabel(b)}</span>${icon('context0-imgIcons18IcArrow18Down1.svg')}</button></section><h1 class="step-title">Выберите номер</h1><div class="cards">${roomCard('standard')}${roomCard('luxe')}</div></div>`;
}
function rateMarkup() {
  const r=ROOMS[state.selected||'standard'],b=currentBooking(state),count=nights(b);
  return `<div class="mini-scroll" data-scroll="rate"><div class="rate-title"><button class="icon-button" data-action="back" aria-label="Назад к номерам">${icon('context1-imgBficArrowLeft2424.svg')}</button><h1>Выберите тариф</h1></div><div class="cards rate-cards"><article class="selected-room"><img src="${asset(r.photo)}" alt="${r.name}"><div><h2>${r.name}</h2><p>До ${r.places} мест · ${r.area} м²<br>${r.rooms} ${r.rooms===1?'комната':'комнаты'}</p></div></article>${['Гостиничный','Выгодный'].map((title,i)=>`<article class="rate-card"><h2>Тариф ${title.toLowerCase()}</h2><ul class="benefits"><li>${icon(i?'context1-imgBficHb2424.svg':'context1-imgBficFood2424.svg')}<span>${i?'Полный пансион':'Завтрак'}</span></li><li>${icon('context1-imgBficCancellationRule2424.svg')}<span>Бесплатная отмена до ${dateText(addDays(b.start,-2))}, 14:00</span></li><li>${icon('context1-imgBficPayment2424.svg')}<span>Без предоплаты</span></li><li>${icon('context1-imgBficGift2424.svg')}<span>Бассейн, Парковка, Бильярд, Настольный теннис, Прокат велосипедов</span></li></ul><div class="rate-footer"><p>Стоимость за <b>${nightLabel(count)}</b><small>Налоги не включены</small></p><div><strong>${money(roomPrice(state,state.selected||'standard')+i*5000)} ₽</strong><button class="primary" data-action="rate" aria-label="Выбрать тариф ${title.toLowerCase()}">Выбрать</button></div></div></article>`).join('')}</div></div>`;
}
function calendarMarkup() {
  const startMonth=new Date(dateDraft.anchor+'T12:00:00');startMonth.setDate(1);
  const months=[];
  for(let m=0;m<3;m++) {
    const month=new Date(startMonth);month.setMonth(month.getMonth()+m);
    const label=month.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}).replace(' г.','');
    const first=(month.getDay()+6)%7, total=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    let days='<span></span>'.repeat(first);
    for(let d=1;d<=total;d++) {
      const iso=isoDay(new Date(month.getFullYear(),month.getMonth(),d));
      const edge=iso===dateDraft.start||iso===dateDraft.end,between=iso>dateDraft.start&&iso<dateDraft.end;
      days+=`<button class="day ${edge?'edge':between?'in-range':''}" data-action="day" data-date="${iso}" aria-label="${dateText(iso)} ${month.getFullYear()}" aria-pressed="${edge||between}">${d}</button>`;
    }
    months.push(`<section class="month"><h3>${label}</h3><div class="weekdays" aria-hidden="true">${['ПН','ВТ','СР','ЧТ','ПТ','СБ','ВС'].map(d=>`<span>${d}</span>`).join('')}</div><div class="days">${days}</div></section>`);
  }
  return `<section class="calendar dialog fullscreen" role="dialog" aria-modal="true" aria-label="Выбор дат"><header class="calendar-top"><button class="icon-button" data-action="month-prev" aria-label="Предыдущие месяцы">${icon('context1-imgBficArrowLeft2424.svg')}</button><span>Даты проживания</span><button class="icon-button" data-action="panel-close" aria-label="Закрыть календарь">${closeIcon()}</button></header><div class="calendar-scroll">${months.join('')}<button class="more-months" data-action="month-next">Следующие месяцы</button></div><footer class="calendar-footer"><p>${dateDraft.end?dateRange(dateDraft):'Выберите дату выезда'}</p><button class="primary" data-action="dates-done" ${!dateDraft.end?'disabled':''}>Готово</button></footer></section>`;
}
function guestsMarkup() {
  const stepper=(i,key,label,min)=>`<div class="guest-counter"><label>${label}</label><div class="stepper"><button data-action="count" data-index="${i}" data-key="${key}" data-delta="-1" aria-label="Уменьшить: ${label}, номер ${i+1}" ${guestsDraft[i][key]<=min?'disabled':''}>−</button><output aria-live="polite">${guestsDraft[i][key]}</output><button data-action="count" data-index="${i}" data-key="${key}" data-delta="1" aria-label="Увеличить: ${label}, номер ${i+1}" ${guestsDraft[i][key]>=9?'disabled':''}>+</button></div></div>`;
  return `<div class="shade"><section class="guests dialog" role="dialog" aria-modal="true" aria-labelledby="guests-title"><header><h2 id="guests-title">Гости</h2><button class="icon-button" data-action="panel-close" aria-label="Закрыть гостей">${closeIcon()}</button></header><div class="guests-body">${guestsDraft.map((_,i)=>`<section><h3>Номер ${i+1}</h3><div class="guest-counters">${stepper(i,'adults','Взрослые',1)}${stepper(i,'children','Дети младше 12 лет',0)}</div></section>`).join('')}</div><footer><button class="secondary" data-action="add-room">${guestsDraft.length===1?'+ Добавить номер':'− Убрать номер'}</button><button class="primary" data-action="guests-done">Готово</button></footer></section></div>`;
}
const scrollPositions={room:0,rate:0};
let previousMini=false,previousStep='room',previousPanel=null,previousChatLength=0;
function render() {
  const oldScroll=app.querySelector('.mini-scroll');
  if(oldScroll)scrollPositions[oldScroll.dataset.scroll]=oldScroll.scrollTop;
  const oldChat=app.querySelector('.messages');const chatTop=oldChat?.scrollTop||0;
  const focused=document.activeElement?.dataset;
  if(state.completed){app.innerHTML='<main class="success"><h1>Вы справились с&nbsp;заданием!</h1></main>';return;}
  app.innerHTML=`<div class="phone"><section class="chat" ${state.mini?'inert aria-hidden="true"':''}>${chatMarkup()}</section>${state.mini?`<section class="mini fullscreen" role="dialog" aria-modal="true" aria-label="Бронирование номера" ${panel?'inert aria-hidden="true"':''}>${header(true)}${state.step==='rate'?rateMarkup():roomMarkup()}</section>`:''}${panel==='dates'?calendarMarkup():panel==='guests'?guestsMarkup():''}</div>`;
  const messages=app.querySelector('.messages');if(messages)messages.scrollTop=state.chat.length!==previousChatLength?messages.scrollHeight:chatTop;
  const scroller=app.querySelector('.mini-scroll');if(scroller)scroller.scrollTop=scrollPositions[state.step];
  if(panel!==previousPanel || state.mini!==previousMini || state.step!==previousStep) {
    const target=panel?app.querySelector('.dialog button'):state.mini?app.querySelector('.mini button'):returnFocus?app.querySelector(`[data-action="${returnFocus}"]`):null;
    target?.focus({preventScroll:true});
  } else if(focused?.action==='count') {
    app.querySelector(`[data-action="count"][data-index="${focused.index}"][data-key="${focused.key}"][data-delta="${focused.delta}"]:not(:disabled)`)?.focus({preventScroll:true});
  }
  previousMini=state.mini;previousStep=state.step;previousPanel=panel;previousChatLength=state.chat.length;
}
app.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(action==='start')dispatch({type:'START'});
  if(action==='open'){returnFocus='open';dispatch({type:'OPEN'});}
  if(action==='type')dispatch({type:'TYPE'});
  if(action==='send')dispatch({type:'SEND'});
  if(action==='close')dispatch({type:'CLOSE'});
  if(action==='back')dispatch({type:'BACK'});
  if(action==='room'){scrollPositions.rate=0;dispatch({type:'SELECT_ROOM',room:button.dataset.room});}
  if(action==='rate')dispatch({type:'SELECT_RATE'});
  if(action==='dates'){const b=currentBooking(state);dateDraft={start:b.start,end:b.end,anchor:b.start,selectingEnd:false};panel='dates';returnFocus='dates';render();}
  if(action==='guests'){guestsDraft=structuredClone(currentBooking(state).guests);panel='guests';returnFocus='guests';render();}
  if(action==='panel-close'){panel=null;render();}
  if(action==='day'){
    const scroll=app.querySelector('.calendar-scroll').scrollTop;
    if(!dateDraft.selectingEnd||button.dataset.date<=dateDraft.start){dateDraft.start=button.dataset.date;dateDraft.end=null;dateDraft.selectingEnd=true;}
    else{dateDraft.end=button.dataset.date;dateDraft.selectingEnd=false;}
    render();app.querySelector('.calendar-scroll').scrollTop=scroll;
  }
  if(action==='month-prev'||action==='month-next'){const d=new Date(dateDraft.anchor+'T12:00:00');d.setDate(1);d.setMonth(d.getMonth()+(action==='month-prev'?-1:1));dateDraft.anchor=isoDay(d);render();}
  if(action==='dates-done'){panel=null;dispatch({type:'DATES',start:dateDraft.start,end:dateDraft.end});}
  if(action==='count'){const i=Number(button.dataset.index),key=button.dataset.key;guestsDraft[i][key]=Math.max(key==='adults'?1:0,Math.min(9,guestsDraft[i][key]+Number(button.dataset.delta)));render();}
  if(action==='add-room'){guestsDraft.length===1?guestsDraft.push({adults:2,children:0}):guestsDraft.pop();render();}
  if(action==='guests-done'){panel=null;dispatch({type:'GUESTS',guests:guestsDraft});}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(panel){panel=null;render();}else if(state.mini)dispatch({type:'CLOSE'});}
  if(event.key==='Tab'&&(state.mini||panel)){
    const scope=panel?app.querySelector('.dialog'):app.querySelector('.mini');
    const buttons=[...scope.querySelectorAll('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
setInterval(()=>{if(state.pending[0]?.due<=Date.now())dispatch({type:'TICK'});},150);
// The visual viewport follows browser chrome and the on-screen keyboard on mobile.
function viewport(){document.documentElement.style.setProperty('--viewport-height',`${window.visualViewport?.height||window.innerHeight}px`);}
window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);
viewport();render();
