/* =========================================================
   YSJ CORP · 성준 통합 비서실  (app.js)
   게임형 오피스 시뮬레이션 + 실시간 회의실
   ========================================================= */
'use strict';

/* ---------------- storage keys ---------------- */
const LS = {
  msg: 'ysj.msg.v1',
  memo: 'ysj.memo.v1',
  done: 'ysj.missions.v1',
  sender: 'ysj.sender.v1',
  room: 'ysj.room.v1',
  fb: 'ysj.fb.v1',
  stage: 'ysj.stage.v1'
};

/* ---------------- static data ---------------- */
const ROOMS = {
  grand:  { name: '대회의실', icon: '🏛️', on: 2, desc: '전체 브리핑 · 주간 회의' },
  cmd:    { name: '지휘실',   icon: '🎯', on: 2, desc: '실시간 지시 · 작전 지휘' },
  lounge: { name: '라운지',   icon: '☕', on: 1, desc: '휴식 · 잡담' }
};

const SENDERS = {
  seongjun: { full: '👑 성준(대장님)', short: '성준', emoji: '👑', me: true },
  mumu:     { full: '🩵 무무', short: '무무', emoji: '🩵', me: false },
  uttang:   { full: '🍊 우땅 비서', short: '우땅 비서', emoji: '🍊', me: false }
};

const MISSIONS = [
  { id: 'm1', dept: '데이픽스', rank: 'S', title: '상품진단 정비',       desc: '노출 진단 항목 점검 · 결측 정리', xp: 40, owner: 'mumu' },
  { id: 'm2', dept: '데이픽스', rank: 'A', title: '태그 · 카테고리 최적화', desc: '상위 노출 태그 구성 재정비',        xp: 30, owner: 'mumu' },
  { id: 'm3', dept: '데이픽스', rank: 'A', title: '마진 하한 사수',       desc: '하한 미만 상품 가격 정리',          xp: 25, owner: 'mumu' },
  { id: 'm4', dept: '오늘제철', rank: 'B', title: '마크 · 썸네일 점검',   desc: '당근스토어 상품 이미지 정비',        xp: 20, owner: 'uttang' },
  { id: 'm5', dept: '오늘제철', rank: 'B', title: '상세페이지 반영',       desc: '공급처 상세 · 이미지 교체',          xp: 20, owner: 'uttang' },
  { id: 'm6', dept: '본부',     rank: 'A', title: '정기 보고 브리핑',     desc: '아침 · 저녁 진행 상황 보고',         xp: 15, owner: 'mumu' }
];
const XP_PER_LEVEL = 150;

const AGENTS = [
  {
    key: 'mumu', name: '무무', tag: '수석비서', handle: '@무무', emoji: '🩵',
    role: '성준 비서 · 통합 지휘',
    stats: [['실행력', 96], ['정확도', 94], ['속도', 88]],
    tags: ['스마트스토어', '리서치', '브라우저 자동화']
  },
  {
    key: 'uttang', name: '우땅 비서', tag: '협력비서', handle: '@우땅비서', emoji: '🍊',
    role: '오늘제철 · 십이월마켓',
    stats: [['실행력', 90], ['정확도', 87], ['속도', 82]],
    tags: ['당근스토어', '상품 점검', '이미지 정비']
  }
];

const LINES = {
  busy: [
    '지시 받은 작전 수행 중입니다. 완료되면 바로 보고드릴게요.',
    '현재 미션 처리 중입니다. 진행률은 작업실에서 확인하실 수 있어요.',
    '작전 구역 점검 중입니다. 이상 없으면 다음 항목으로 넘어갑니다.'
  ],
  wait: [
    '대기 중입니다. 지시만 주시면 즉시 착수하겠습니다.',
    '보고 대기 상태입니다. 오늘 미션을 체크해 주세요.',
    '채널 연결 정상. 다음 지시를 기다리고 있습니다.'
  ],
  rest: [
    '오늘 배정된 작전을 모두 완료했습니다. 잠시 정비 중입니다.',
    '미션 클리어. 대장님 지시가 있으면 바로 복귀합니다.'
  ]
};

/* ---------------- state ---------------- */
const state = {
  tab: 'map',
  stage: localStorage.getItem(LS.stage) || 'ext',
  room: localStorage.getItem(LS.room) || 'cmd',
  sender: localStorage.getItem(LS.sender) || 'seongjun',
  msg: load(LS.msg, null),
  memo: load(LS.memo, []),
  done: load(LS.done, []),
  bubble: {}          // agent key -> open?
};

const FB = { base: normUrl(localStorage.getItem(LS.fb) || ''), es: null, room: null, online: false };

/* ---------------- utils ---------------- */
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function linkMentions(html) {
  return html.replace(/(@(?:all|무무|우땅비서))/g, '<span class="mention">$1</span>');
}
function normUrl(u) {
  u = (u || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/+$/, '');
}
function hhmm(ts) {
  const d = new Date(ts || Date.now());
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}
function stamp(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')} ${hhmm(ts)}`;
}

let toastTimer = null;
function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2100);
}

/* ---------------- seed ---------------- */
function seedMessages() {
  if (state.msg) return;
  const now = Date.now();
  state.msg = {
    cmd: [
      { id: 'seed1', s: 'system', t: '지휘실 채널 개설 · 보안 등급 S', ts: now - 600000 },
      { id: 'seed2', s: 'mumu', t: '대장님, 지휘실 대기 중입니다. 지시는 @무무 로 호출해 주세요.', ts: now - 540000 },
      { id: 'seed3', s: 'uttang', t: '협력 채널 접속 완료. 오늘제철 쪽은 @우땅비서 로 부르시면 됩니다.', ts: now - 480000 }
    ],
    grand: [
      { id: 'seed4', s: 'system', t: '대회의실 준비 완료 · 전체 브리핑 대기', ts: now - 900000 }
    ],
    lounge: [
      { id: 'seed5', s: 'system', t: '라운지 · 자유 채널', ts: now - 1200000 }
    ]
  };
  save(LS.msg, state.msg);
}
function seedMemos() {
  if (!Array.isArray(state.memo) || !state.memo.length) {
    state.memo = [{ id: uid(), text: '지시는 회의실에서 @멘션으로 남기면 작업실 미션으로 이어집니다.', ts: Date.now() - 3600000 }];
    save(LS.memo, state.memo);
  }
}

/* =========================================================
   HUD / XP
   ========================================================= */
function xpTotal() {
  return state.done.reduce((sum, id) => {
    const m = MISSIONS.find(x => x.id === id);
    return sum + (m ? m.xp : 0);
  }, 0);
}
function renderHUD() {
  const xp = xpTotal();
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const inLevel = xp % XP_PER_LEVEL;
  const pct = Math.round((state.done.length / MISSIONS.length) * 100);

  document.getElementById('hud-lv').textContent = 'LV ' + level;
  document.getElementById('hud-xp').style.width = (inLevel / XP_PER_LEVEL * 100) + '%';
  document.getElementById('hud-xp-txt').textContent = `${inLevel} / ${XP_PER_LEVEL} XP`;
  document.getElementById('hud-dept').textContent = '3';
  document.getElementById('hud-on').textContent = '2';
  document.getElementById('hud-mission').textContent = pct + '%';
  document.getElementById('ext-mission').textContent = pct + '%';

  document.getElementById('work-pct').textContent = pct + '%';
  document.getElementById('work-count').textContent = `${state.done.length} / ${MISSIONS.length}`;
  document.getElementById('work-bar').style.width = pct + '%';
  document.getElementById('work-xp').textContent = `+${xp} XP`;
}

/* =========================================================
   MAP
   ========================================================= */
function setStage(stage, silent) {
  state.stage = stage;
  localStorage.setItem(LS.stage, stage);
  const ext = document.getElementById('stage-ext');
  const int = document.getElementById('stage-int');
  const segs = document.querySelectorAll('.seg-btn');

  if (stage === 'int') {
    ext.classList.add('zooming');
    setTimeout(() => {
      ext.classList.add('hidden');
      ext.classList.remove('zooming');
      int.classList.remove('hidden');
      int.classList.add('zoom-in');
      setTimeout(() => int.classList.remove('zoom-in'), 460);
    }, 180);
  } else {
    int.classList.add('hidden');
    ext.classList.remove('hidden');
    ext.classList.add('zoom-in');
    setTimeout(() => ext.classList.remove('zoom-in'), 460);
  }
  segs.forEach(b => b.classList.toggle('active', b.dataset.stage === stage));
  if (!silent && stage === 'int') toast('작전층 24F · 3개 구역 가동 중');
}

function renderRoomList() {
  const wrap = document.getElementById('room-list');
  wrap.innerHTML = Object.entries(ROOMS).map(([key, r]) => `
    <button class="room-card" data-room="${key}">
      <span class="room-ico">${r.icon}</span>
      <span class="room-meta">
        <b>${r.name}</b>
        <em>${r.desc} · ON ${r.on}</em>
      </span>
      <span class="room-go">진입</span>
    </button>
  `).join('');
  wrap.querySelectorAll('.room-card').forEach(card => {
    card.addEventListener('click', () => openRoom(card.dataset.room));
  });
}

function openRoom(room) {
  setRoom(room);
  setTab('room');
}

/* =========================================================
   TABS
   ========================================================= */
function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'v-' + tab));
  if (tab === 'room') {
    renderChat();
    requestAnimationFrame(() => { scrollChat(); });
  }
  if (tab === 'work') renderQuests();
  if (tab === 'agents') renderAgents();
  if (tab === 'memo') renderMemos();
}

/* =========================================================
   ROOM / CHAT
   ========================================================= */
function setRoom(room) {
  if (!ROOMS[room]) return;
  state.room = room;
  localStorage.setItem(LS.room, room);
  document.querySelectorAll('.room-pill').forEach(p => p.classList.toggle('active', p.dataset.room === room));
  const r = ROOMS[room];
  document.getElementById('room-title').textContent = `${r.icon} ${r.name}`;
  document.getElementById('room-on').textContent = r.on;
  renderChat();
  fbSubscribe(room);
}

function renderChat() {
  const chat = document.getElementById('chat');
  if (!chat) return;
  const list = (state.msg && state.msg[state.room]) ? state.msg[state.room].slice() : [];
  list.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  chat.innerHTML = list.map(m => {
    if (m.s === 'system') {
      return `<div class="msg sys">${esc(m.t)}</div>`;
    }
    const snd = SENDERS[m.s] || SENDERS.mumu;
    const me = snd.me;
    return `
      <div class="msg ${me ? 'me' : ''}">
        <span class="av">${snd.emoji}</span>
        <div class="body">
          <div class="who"><b>${esc(snd.short)}</b><time>${hhmm(m.ts)}</time></div>
          <div class="bubble">${linkMentions(esc(m.t))}</div>
        </div>
      </div>`;
  }).join('');
  scrollChat();
}

function scrollChat() {
  const chat = document.getElementById('chat');
  if (chat) chat.scrollTop = chat.scrollHeight;
}

function persistMsgs() { save(LS.msg, state.msg); }

function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text) return;

  const m = { id: uid(), s: state.sender, t: text, ts: Date.now() };
  if (!state.msg[state.room]) state.msg[state.room] = [];
  state.msg[state.room].push(m);
  persistMsgs();
  renderChat();

  input.value = '';
  input.style.height = 'auto';

  if (FB.base) {
    fetch(`${FB.base}/rooms/${state.room}/${m.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ s: m.s, t: m.t, ts: m.ts })
    }).then(res => {
      if (!res.ok) throw new Error('http ' + res.status);
    }).catch(() => {
      setMode('local');
      toast('DB 전송 실패 · 기기에 저장했습니다');
    });
  }
}

/* =========================================================
   FIREBASE REALTIME (REST + EventSource)
   ========================================================= */
function setMode(mode) {
  FB.online = (mode === 'online');
  const el = document.getElementById('room-mode');
  if (el) {
    el.textContent = FB.online ? 'REALTIME' : 'LOCAL';
    el.classList.toggle('online', FB.online);
  }
}

function fbSubscribe(room) {
  if (FB.es) { try { FB.es.close(); } catch (e) {} FB.es = null; }
  if (!FB.base) { setMode('local'); return; }
  FB.room = room;
  try {
    const es = new EventSource(`${FB.base}/rooms/${room}.json`);
    FB.es = es;
    const handle = ev => {
      let parsed;
      try { parsed = JSON.parse(ev.data); } catch (e) { return; }
      applyRemote(room, parsed.path || '/', parsed.data);
    };
    es.addEventListener('put', handle);
    es.addEventListener('patch', handle);
    es.onopen = () => setMode('online');
    es.onerror = () => setMode('local');
  } catch (e) {
    setMode('local');
  }
}

function applyRemote(room, path, data) {
  if (!state.msg[room]) state.msg[room] = [];
  const arr = state.msg[room];

  if (path === '/' || path === '') {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(k => {
        const v = data[k] || {};
        const item = { id: k, s: v.s || 'mumu', t: v.t || '', ts: v.ts || Date.now() };
        const i = arr.findIndex(x => x.id === k);
        if (i >= 0) arr[i] = item; else arr.push(item);
      });
    }
  } else {
    const key = path.replace(/^\/+/, '');
    if (data === null) {
      const i = arr.findIndex(x => x.id === key);
      if (i >= 0) arr.splice(i, 1);
    } else {
      const item = { id: key, s: data.s || 'mumu', t: data.t || '', ts: data.ts || Date.now() };
      const i = arr.findIndex(x => x.id === key);
      if (i >= 0) arr[i] = item; else arr.push(item);
    }
  }
  arr.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  persistMsgs();
  if (room === state.room) renderChat();
}

async function testDb(url) {
  const base = normUrl(url);
  if (!base) throw new Error('주소가 비어 있습니다');
  const res = await fetch(`${base}/.json?shallow=true`, { cache: 'no-store' });
  if (res.status === 401 || res.status === 403) throw new Error('권한 거부 · DB 규칙을 확인하세요');
  if (!res.ok) throw new Error('응답 ' + res.status);
  return true;
}

/* =========================================================
   WORK / QUESTS
   ========================================================= */
function renderQuests() {
  const wrap = document.getElementById('quest-list');
  wrap.innerHTML = MISSIONS.map(m => {
    const done = state.done.includes(m.id);
    return `
      <div class="quest ${done ? 'done' : ''}" data-id="${m.id}">
        <button class="quest-check" data-check="${m.id}" aria-label="미션 완료">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        </button>
        <div class="quest-body">
          <div class="quest-line">
            <span class="rank ${m.rank}">${m.rank}</span>
            <h3>${esc(m.title)}</h3>
            <span class="dept">${esc(m.dept)}</span>
          </div>
          <p>${esc(m.desc)}</p>
          <span class="quest-xp">+${m.xp} XP</span>
        </div>
      </div>`;
  }).join('');

  wrap.querySelectorAll('[data-check]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleMission(btn.dataset.check);
    });
  });

  renderHUD();
}

function currentLevel() { return 1 + Math.floor(xpTotal() / XP_PER_LEVEL); }

function toggleMission(id) {
  const i = state.done.indexOf(id);
  const mission = MISSIONS.find(m => m.id === id);
  const before = currentLevel();
  if (i >= 0) {
    state.done.splice(i, 1);
  } else {
    state.done.push(id);
  }
  save(LS.done, state.done);
  renderQuests();
  renderAgents();
  const after = currentLevel();
  if (after > before) toast(`⭐ LEVEL UP · LV ${after} 달성`);
  else if (i < 0) toast(`미션 클리어 · +${mission.xp} XP`);
}

/* =========================================================
   AGENTS
   ========================================================= */
function agentStatus(key) {
  const mine = MISSIONS.filter(m => m.owner === key);
  const done = mine.filter(m => state.done.includes(m.id)).length;
  if (done === mine.length && mine.length > 0) return 'rest';
  if (done > 0) return 'busy';
  return 'wait';
}
function agentStatusLabel(s) {
  return s === 'busy' ? '작전 수행중' : s === 'rest' ? '휴식중' : '보고 대기';
}

function renderAgents() {
  const wrap = document.getElementById('agent-list');
  if (!wrap) return;

  wrap.innerHTML = AGENTS.map(a => {
    const st = agentStatus(a.key);
    const mine = MISSIONS.filter(m => m.owner === a.key);
    const done = mine.filter(m => state.done.includes(m.id)).length;
    const open = state.bubble[a.key];
    const line = LINES[st][Math.floor(Math.random() * LINES[st].length)];

    return `
      <article class="agent ${st === 'rest' ? 'rest' : ''}" data-agent="${a.key}">
        <div class="agent-top">
          <span class="avatar">${a.emoji}</span>
          <div class="agent-id">
            <h3>${esc(a.name)} <span>${esc(a.tag)}</span></h3>
            <p>${esc(a.role)} · ${esc(a.handle)}</p>
          </div>
          <span class="status ${st}">${agentStatusLabel(st)}</span>
        </div>
        <div class="stats">
          ${a.stats.map(([label, val]) => `
            <div class="stat">
              <span>${label}</span>
              <div class="bar"><i class="${st === 'rest' ? 'gold' : ''}" style="width:${val}%"></i></div>
              <b>${val}</b>
            </div>`).join('')}
        </div>
        <div class="agent-tags">
          ${a.tags.map(t => `<span>${esc(t)}</span>`).join('')}
        </div>
        <div class="load">
          <span>오늘 처리</span>
          <b>${done} / ${mine.length} 건</b>
        </div>
        ${open ? `<div class="bubble-line">${esc(line)}</div>` : ''}
      </article>`;
  }).join('') + `
    <div class="agent-slot">
      <b>＋ 신규 요원 슬롯</b>
      배치 대기 중 · 지시가 늘면 충원됩니다
    </div>`;

  wrap.querySelectorAll('[data-agent]').forEach(card => {
    card.addEventListener('click', () => {
      const k = card.dataset.agent;
      state.bubble[k] = !state.bubble[k];
      renderAgents();
    });
  });
}

/* =========================================================
   MEMO
   ========================================================= */
function renderMemos() {
  const list = document.getElementById('memo-list');
  document.getElementById('memo-count').textContent = String(state.memo.length);
  if (!state.memo.length) {
    list.innerHTML = `<li class="memo-empty">아직 기록이 없습니다.<br>첫 작전 메모를 남겨보세요.</li>`;
    return;
  }
  list.innerHTML = state.memo
    .slice()
    .sort((a, b) => b.ts - a.ts)
    .map(m => `
      <li class="memo-item">
        <p>${esc(m.text)}</p>
        <time>${stamp(m.ts)}</time>
        <button class="memo-del" data-del="${m.id}" aria-label="삭제">✕</button>
      </li>`).join('');

  list.querySelectorAll('[data-del]').forEach(b => {
    b.addEventListener('click', () => {
      state.memo = state.memo.filter(m => m.id !== b.dataset.del);
      save(LS.memo, state.memo);
      renderMemos();
    });
  });
}

function addMemo() {
  const input = document.getElementById('memo-input');
  const text = input.value.trim();
  if (!text) { toast('내용을 입력하세요'); return; }
  state.memo.push({ id: uid(), text, ts: Date.now() });
  save(LS.memo, state.memo);
  input.value = '';
  renderMemos();
  toast('메모 기록 완료');
}

/* =========================================================
   SETTINGS
   ========================================================= */
function openSheet() {
  document.getElementById('sheet').classList.add('open');
  document.getElementById('sheet').setAttribute('aria-hidden', 'false');
  document.getElementById('backdrop').classList.remove('hidden');
  document.getElementById('db-url').value = FB.base || '';
  updateDbStatus();
}
function closeSheet() {
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheet').setAttribute('aria-hidden', 'true');
  document.getElementById('backdrop').classList.add('hidden');
}
function updateDbStatus(extra) {
  const el = document.getElementById('db-status');
  if (FB.base) {
    el.className = 'status ok';
    el.innerHTML = `실시간 모드 · <b>${esc(FB.base.replace(/^https?:\/\//, ''))}</b> 에 연결되어 있습니다.`;
  } else {
    el.className = 'status';
    el.innerHTML = '현재 <b>로컬 모드</b> · 이 기기에만 저장됩니다.';
  }
  if (extra) el.innerHTML = extra;
}

async function saveDb() {
  const raw = document.getElementById('db-url').value;
  const base = normUrl(raw);
  const el = document.getElementById('db-status');
  if (!base) { el.className = 'status err'; el.innerHTML = '<b>주소를 입력하세요</b>'; return; }

  el.className = 'status';
  el.textContent = '연결 확인 중…';
  try {
    await testDb(base);
    FB.base = base;
    localStorage.setItem(LS.fb, base);
    setMode('online');
    fbSubscribe(state.room);
    updateDbStatus();
    toast('실시간 연결 완료');
  } catch (e) {
    FB.base = base;
    localStorage.setItem(LS.fb, base);
    setMode('local');
    fbSubscribe(state.room);
    el.className = 'status err';
    el.innerHTML = `<b>연결 확인 실패</b><br>${esc(e.message)} · 주소와 DB 규칙(읽기/쓰기 허용)을 확인하세요.<br>설정은 저장했으니 나중에 자동 재시도됩니다.`;
  }
}

function clearDb() {
  FB.base = '';
  localStorage.removeItem(LS.fb);
  if (FB.es) { try { FB.es.close(); } catch (e) {} FB.es = null; }
  setMode('local');
  updateDbStatus();
  toast('로컬 모드로 전환');
}

/* =========================================================
   SECURITY ACCESS GATE
   입장 코드는 해시값으로만 보관하고, 입력값을 해시해 비교합니다.
   ========================================================= */
const GATE = {
  hash: '7d122381b49fe9370fc7774b6c533fabb716f1cd564f6adf43472f179074584f',
  sk: 'ysj.auth.session.v1',
  pk: 'ysj.auth.keep.v1'
};
const gateState = { booted: false, busy: false };

/* --- SHA-256 --- */
function hexFromBytes(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

/* 비HTTPS·구형 환경용 순수 JS SHA-256 (UTF-8) */
function sha256HexJS(str) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // UTF-8 bytes
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      bytes.push(c);
    } else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const c2 = str.charCodeAt(++i);
      if (c2 >= 0xdc00 && c2 <= 0xdfff) {
        const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      } else {
        bytes.push(0xef, 0xbf, 0xbd);
        i--;
      }
    } else if (c >= 0xd800 && c <= 0xdfff) {
      bytes.push(0xef, 0xbf, 0xbd);
    } else {
      bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }

  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hiLen = Math.floor(bitLen / 0x100000000);
  const loLen = bitLen >>> 0;
  bytes.push((hiLen >>> 24) & 255, (hiLen >>> 16) & 255, (hiLen >>> 8) & 255, hiLen & 255);
  bytes.push((loLen >>> 24) & 255, (loLen >>> 16) & 255, (loLen >>> 8) & 255, loLen & 255);

  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  const w = new Array(64);
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  for (let off = 0; off < bytes.length; off += 64) {
    for (let i = 0; i < 16; i++) {
      const j = off + i * 4;
      w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = [
      (H[0] + a) | 0, (H[1] + b) | 0, (H[2] + c) | 0, (H[3] + d) | 0,
      (H[4] + e) | 0, (H[5] + f) | 0, (H[6] + g) | 0, (H[7] + h) | 0
    ];
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/* WebCrypto 우선, 없으면(비HTTPS 등) 순수 JS로 폴백 */
function sha256Hex(text) {
  const subtle = (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null;
  if (subtle && typeof subtle.digest === 'function' && typeof TextEncoder !== 'undefined') {
    const data = new TextEncoder().encode(text);
    return subtle.digest('SHA-256', data)
      .then(buf => hexFromBytes(new Uint8Array(buf)))
      .catch(() => sha256HexJS(text));
  }
  return Promise.resolve(sha256HexJS(text));
}

/* --- 인증 상태 저장 --- */
function gateIsOpen() {
  try {
    return sessionStorage.getItem(GATE.sk) === GATE.hash ||
           localStorage.getItem(GATE.pk) === GATE.hash;
  } catch (e) { return false; }
}
function gateRemember(keep) {
  try {
    sessionStorage.setItem(GATE.sk, GATE.hash);
    if (keep) localStorage.setItem(GATE.pk, GATE.hash);
    else localStorage.removeItem(GATE.pk);
  } catch (e) {}
}
function gateForget() {
  try {
    sessionStorage.removeItem(GATE.sk);
    localStorage.removeItem(GATE.pk);
  } catch (e) {}
}

/* --- 게이트 UI --- */
function gateInputEl() { return document.getElementById('gate-input'); }

function gateMsg(text, kind) {
  const el = document.getElementById('gate-msg');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'gate-msg' + (kind ? ' ' + kind : '');
}

function gateShake() {
  const card = document.getElementById('gate-card');
  if (!card) return;
  card.classList.remove('shake');
  void card.offsetWidth;
  card.classList.add('shake');
  setTimeout(() => card.classList.remove('shake'), 520);
}

function showGate() {
  document.getElementById('app').hidden = true;
  const gate = document.getElementById('gate');
  gate.hidden = false;
  gate.classList.remove('granted');
  document.body.classList.add('locked');
}

function hideGate() {
  document.getElementById('gate').hidden = true;
  document.getElementById('app').hidden = false;
  document.body.classList.remove('locked');
}

function openApp() {
  if (!gateState.booted) {
    gateState.booted = true;
    boot();
  }
}

async function gateSubmit() {
  if (gateState.busy) return;
  const input = gateInputEl();
  const btn = document.getElementById('gate-unlock');
  const code = (input.value || '').trim();

  if (!code) {
    gateMsg('접근 코드를 입력하세요', 'warn');
    gateShake();
    return;
  }

  gateState.busy = true;
  btn.disabled = true;
  btn.textContent = '인증 확인 중…';

  let hex = '';
  try { hex = await sha256Hex(code); } catch (e) { hex = sha256HexJS(code); }

  gateState.busy = false;
  btn.disabled = false;
  btn.textContent = '잠금 해제';

  if (hex === GATE.hash) {
    gateRemember(document.getElementById('gate-keep').checked);
    gateMsg('✓ 인증 완료 · 잠금을 해제합니다', 'ok');
    document.getElementById('gate').classList.add('granted');
    setTimeout(() => {
      input.value = '';
      gateMsg('');
      hideGate();
      openApp();
    }, 400);
  } else {
    input.value = '';
    gateMsg('접근 코드가 일치하지 않습니다', 'err');
    gateShake();
    if (window.matchMedia('(pointer: fine)').matches) input.focus();
  }
}

function lockApp() {
  gateForget();
  try { closeSheet(); } catch (e) {}
  const input = gateInputEl();
  if (input) input.value = '';
  const keep = document.getElementById('gate-keep');
  if (keep) keep.checked = false;
  gateMsg('');
  const btn = document.getElementById('gate-unlock');
  if (btn) { btn.disabled = false; btn.textContent = '잠금 해제'; }
  showGate();
  if (window.matchMedia('(pointer: fine)').matches) setTimeout(() => input && input.focus(), 120);
}

function initGate() {
  document.getElementById('gate-form').addEventListener('submit', e => {
    e.preventDefault();
    gateSubmit();
  });

  document.getElementById('keypad').addEventListener('click', e => {
    const key = e.target.closest('[data-key]');
    if (!key) return;
    const input = gateInputEl();
    const k = key.dataset.key;
    if (k === 'del') input.value = input.value.slice(0, -1);
    else if (k === 'clear') input.value = '';
    else if (input.value.length < Number(input.maxLength)) input.value += k;
    gateMsg('');
  });

  gateInputEl().addEventListener('input', () => gateMsg(''));
  document.getElementById('btn-lock').addEventListener('click', lockApp);

  if (gateIsOpen()) {
    hideGate();
    openApp();
  } else {
    showGate();
    if (window.matchMedia('(pointer: fine)').matches) {
      setTimeout(() => gateInputEl().focus(), 240);
    }
  }
}

/* =========================================================
   BOOT
   ========================================================= */
function boot() {
  seedMessages();
  seedMemos();

  // tabs
  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => setTab(t.dataset.tab));
  });

  // stage
  document.querySelectorAll('.seg-btn').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.stage !== state.stage) setStage(b.dataset.stage);
    });
  });
  document.getElementById('enter-hq').addEventListener('click', e => { e.stopPropagation(); setStage('int'); });
  document.getElementById('hq-hit').addEventListener('click', () => setStage('int'));
  document.getElementById('back-ext').addEventListener('click', () => setStage('ext', true));

  // pins
  document.querySelectorAll('.pin').forEach(p => {
    p.addEventListener('click', e => {
      e.stopPropagation();
      openRoom(p.dataset.room);
    });
  });

  // room pills
  document.querySelectorAll('.room-pill').forEach(p => {
    p.addEventListener('click', () => setRoom(p.dataset.room));
  });

  // sender
  document.querySelectorAll('.sender').forEach(b => {
    b.addEventListener('click', () => {
      state.sender = b.dataset.sender;
      localStorage.setItem(LS.sender, state.sender);
      document.querySelectorAll('.sender').forEach(x => x.classList.toggle('active', x.dataset.sender === state.sender));
    });
  });

  // mentions
  document.querySelectorAll('.mention').forEach(b => {
    b.addEventListener('click', () => {
      const input = document.getElementById('msg-input');
      const tmp = b.dataset.mention + ' ';
      input.value = (input.value ? input.value.replace(/\s+$/, ' ') : '') + tmp;
      input.focus();
    });
  });

  // input
  const input = document.getElementById('msg-input');
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('send').addEventListener('click', sendMessage);

  // memo
  document.getElementById('memo-save').addEventListener('click', addMemo);

  // settings
  document.getElementById('btn-settings').addEventListener('click', openSheet);
  document.getElementById('sheet-close').addEventListener('click', closeSheet);
  document.getElementById('backdrop').addEventListener('click', closeSheet);
  document.getElementById('db-save').addEventListener('click', saveDb);
  document.getElementById('db-clear').addEventListener('click', clearDb);
  document.getElementById('reset-all').addEventListener('click', () => {
    [LS.msg, LS.memo, LS.done, LS.sender, LS.room, LS.stage].forEach(k => localStorage.removeItem(k));
    gateForget();
    toast('초기화 완료 · 새로고침합니다');
    setTimeout(() => location.reload(), 700);
  });

  // cross-tab
  window.addEventListener('storage', e => {
    if (e.key === LS.msg) {
      state.msg = load(LS.msg, state.msg);
      renderChat();
    }
  });

  // initial
  renderRoomList();
  setRoom(state.room);
  renderHUD();
  renderQuests();
  renderAgents();
  renderMemos();
  setTab('map');
  setStage(state.stage === 'int' ? 'int' : 'ext', true);
  setMode(FB.base ? 'online' : 'local');
  if (FB.base) fbSubscribe(state.room);

  // restore sender UI
  document.querySelectorAll('.sender').forEach(x => x.classList.toggle('active', x.dataset.sender === state.sender));
}

document.addEventListener('DOMContentLoaded', initGate);
