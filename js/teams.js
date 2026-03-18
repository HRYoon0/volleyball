/**
 * 팀 추첨 및 밸런싱 로직
 * - 랜덤 추첨: 성별 균형만 고려
 * - 밸런스 추첨: 성별 균형 + 승률 기반 Snake Draft
 */

// 현재 추첨 모드
let drawMode = 'balanced'; // 'random' 또는 'balanced'

// 개인 통계 캐시
let playerStats = {};

// Fisher-Yates 셔플
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 팀 추첨 (모드에 따라 분기)
function drawTeams() {
  if (drawMode === 'balanced') {
    drawTeamsBalanced();
  } else {
    drawTeamsRandom();
  }
}

// ── 랜덤 추첨 (성별 균형만) ──
function drawTeamsRandom() {
  const selected = getSelectedMembers();
  const males = shuffle(selected.filter(m => m.gender === '남'));
  const females = shuffle(selected.filter(m => m.gender === '여'));

  const teamA = [];
  const teamB = [];

  males.forEach((m, i) => {
    if (i % 2 === 0) teamA.push(m);
    else teamB.push(m);
  });

  females.forEach((m, i) => {
    if (i % 2 === 0) teamA.push(m);
    else teamB.push(m);
  });

  appState.teamA = teamA;
  appState.teamB = teamB;

  renderTeamResult();
}

// ── 밸런스 추첨 (성별 균형 + 승률 Snake Draft) ──
function drawTeamsBalanced() {
  const selected = getSelectedMembers();

  // 승률 정보 붙이기
  const withStats = selected.map(m => ({
    ...m,
    winRate: playerStats[m.name]?.winRate ?? 50, // 기록 없으면 50%
    wins: playerStats[m.name]?.wins ?? 0,
    losses: playerStats[m.name]?.losses ?? 0
  }));

  const males = withStats.filter(m => m.gender === '남');
  const females = withStats.filter(m => m.gender === '여');

  // 승률 높은 순으로 정렬 (동률이면 랜덤)
  const sortByWinRate = (arr) => {
    return arr.sort((a, b) => {
      const diff = b.winRate - a.winRate;
      if (diff !== 0) return diff;
      return Math.random() - 0.5; // 동률 랜덤
    });
  };

  sortByWinRate(males);
  sortByWinRate(females);

  const teamA = [];
  const teamB = [];

  // Snake Draft: 1→A, 2→B, 3→B, 4→A, 5→A, 6→B...
  // 강한 선수와 약한 선수가 골고루 분배됨
  const snakeDraft = (players) => {
    players.forEach((m, i) => {
      const round = Math.floor(i / 2);
      const pos = i % 2;
      // 짝수 라운드: 0→A, 1→B / 홀수 라운드: 0→B, 1→A
      if (round % 2 === 0) {
        if (pos === 0) teamA.push(m);
        else teamB.push(m);
      } else {
        if (pos === 0) teamB.push(m);
        else teamA.push(m);
      }
    });
  };

  snakeDraft(males);
  snakeDraft(females);

  appState.teamA = teamA;
  appState.teamB = teamB;

  renderTeamResult();
}

// 통계 데이터 로드
async function loadPlayerStats() {
  try {
    const result = await api.getStats();
    if (result.success) {
      playerStats = {};
      result.data.forEach(s => {
        playerStats[s.name] = s;
      });
    }
  } catch (e) {
    // 통계 로드 실패해도 추첨은 가능 (기본값 50% 사용)
  }
}

// 팀 추첨 화면 렌더링
function renderTeamDraw() {
  const container = document.getElementById('team-draw-area');
  container.textContent = '';

  const selected = getSelectedMembers();
  const males = selected.filter(m => m.gender === '남').length;
  const females = selected.filter(m => m.gender === '여').length;

  // 참가자 정보
  const info = document.createElement('div');
  info.className = 'team-info-bar';
  info.textContent = `참가자 ${selected.length}명 (남 ${males} / 여 ${females})`;
  container.appendChild(info);

  // 추첨 모드 선택
  const modeArea = document.createElement('div');
  modeArea.className = 'draw-mode-area';

  const modeLabel = document.createElement('span');
  modeLabel.className = 'mode-label';
  modeLabel.textContent = '추첨 방식:';
  modeArea.appendChild(modeLabel);

  const btnRandom = document.createElement('button');
  btnRandom.className = `btn btn-sm mode-btn ${drawMode === 'random' ? 'mode-active' : ''}`;
  btnRandom.textContent = '🎲 랜덤';
  btnRandom.addEventListener('click', () => { drawMode = 'random'; renderTeamDraw(); });

  const btnBalanced = document.createElement('button');
  btnBalanced.className = `btn btn-sm mode-btn ${drawMode === 'balanced' ? 'mode-active' : ''}`;
  btnBalanced.textContent = '⚖️ 밸런스';
  btnBalanced.addEventListener('click', () => { drawMode = 'balanced'; renderTeamDraw(); });

  modeArea.appendChild(btnRandom);
  modeArea.appendChild(btnBalanced);
  container.appendChild(modeArea);

  // 밸런스 모드일 때 승률 미리보기
  if (drawMode === 'balanced' && Object.keys(playerStats).length > 0) {
    const previewArea = document.createElement('div');
    previewArea.className = 'stats-preview';

    const previewTitle = document.createElement('div');
    previewTitle.className = 'stats-preview-title';
    previewTitle.textContent = '참가자 승률';
    previewArea.appendChild(previewTitle);

    selected.forEach(m => {
      const stat = playerStats[m.name];
      const row = document.createElement('div');
      row.className = 'stats-preview-row';

      const badge = document.createElement('span');
      badge.className = `gender-badge-sm ${m.gender === '남' ? 'male' : 'female'}`;
      badge.textContent = m.gender;

      const name = document.createElement('span');
      name.className = 'stats-preview-name';
      name.textContent = m.name;

      const rate = document.createElement('span');
      rate.className = 'stats-preview-rate';
      if (stat) {
        rate.textContent = `${stat.winRate}% (${stat.wins}승 ${stat.losses}패)`;
        rate.classList.add(stat.winRate >= 50 ? 'win-rate-high' : 'win-rate-low');
      } else {
        rate.textContent = '기록없음';
        rate.classList.add('no-record');
      }

      row.appendChild(badge);
      row.appendChild(name);
      row.appendChild(rate);
      previewArea.appendChild(row);
    });

    container.appendChild(previewArea);
  }

  // 추첨 버튼
  const btnDraw = document.createElement('button');
  btnDraw.className = 'btn btn-primary btn-large';
  btnDraw.textContent = drawMode === 'balanced' ? '⚖️ 밸런스 추첨하기' : '🎲 랜덤 추첨하기';
  btnDraw.addEventListener('click', drawTeams);
  container.appendChild(btnDraw);

  // 이전 추첨 결과가 있으면 표시
  if (appState.teamA.length > 0) {
    renderTeamResult();
  }
}

// 팀 결과 렌더링
function renderTeamResult() {
  let resultArea = document.getElementById('team-result');
  if (!resultArea) {
    resultArea = document.createElement('div');
    resultArea.id = 'team-result';
    document.getElementById('team-draw-area').appendChild(resultArea);
  }
  resultArea.textContent = '';

  const teamsWrapper = document.createElement('div');
  teamsWrapper.className = 'teams-wrapper';

  teamsWrapper.appendChild(createTeamCard('A', appState.teamA));

  const vs = document.createElement('div');
  vs.className = 'vs-badge';
  vs.textContent = 'VS';
  teamsWrapper.appendChild(vs);

  teamsWrapper.appendChild(createTeamCard('B', appState.teamB));
  resultArea.appendChild(teamsWrapper);

  // 밸런스 모드면 팀별 평균 승률 표시
  if (drawMode === 'balanced' && Object.keys(playerStats).length > 0) {
    const balanceInfo = document.createElement('div');
    balanceInfo.className = 'balance-info';

    const avgA = calcTeamAvgWinRate(appState.teamA);
    const avgB = calcTeamAvgWinRate(appState.teamB);

    balanceInfo.textContent = `평균 승률 — A팀: ${avgA}% / B팀: ${avgB}%`;
    resultArea.appendChild(balanceInfo);
  }

  // 버튼
  const btnArea = document.createElement('div');
  btnArea.className = 'btn-group';

  const btnRedraw = document.createElement('button');
  btnRedraw.className = 'btn btn-secondary';
  btnRedraw.textContent = '다시 추첨';
  btnRedraw.addEventListener('click', drawTeams);

  const btnStart = document.createElement('button');
  btnStart.className = 'btn btn-primary';
  btnStart.textContent = '경기 시작';
  btnStart.addEventListener('click', startGame);

  btnArea.appendChild(btnRedraw);
  btnArea.appendChild(btnStart);
  resultArea.appendChild(btnArea);
}

// 팀 평균 승률 계산
function calcTeamAvgWinRate(team) {
  const rates = team.map(m => playerStats[m.name]?.winRate ?? 50);
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
  return Math.round(avg);
}

// 팀 카드 DOM 생성
function createTeamCard(teamName, members) {
  const card = document.createElement('div');
  card.className = `team-card team-${teamName.toLowerCase()}`;

  const header = document.createElement('div');
  header.className = 'team-header';
  const maleCount = members.filter(m => m.gender === '남').length;
  const femaleCount = members.filter(m => m.gender === '여').length;
  header.textContent = `${teamName}팀 (남${maleCount}/여${femaleCount})`;
  card.appendChild(header);

  const list = document.createElement('div');
  list.className = 'team-members';
  members.forEach(m => {
    const item = document.createElement('div');
    item.className = 'team-member-item';

    const badge = document.createElement('span');
    badge.className = `gender-badge-sm ${m.gender === '남' ? 'male' : 'female'}`;
    badge.textContent = m.gender;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'team-member-name';
    nameSpan.textContent = m.name;

    item.appendChild(badge);
    item.appendChild(nameSpan);

    // 승률 표시 (밸런스 모드)
    if (drawMode === 'balanced') {
      const stat = playerStats[m.name];
      const rateSpan = document.createElement('span');
      rateSpan.className = 'team-member-rate';
      rateSpan.textContent = stat ? `${stat.winRate}%` : '-';
      item.appendChild(rateSpan);
    }

    list.appendChild(item);
  });
  card.appendChild(list);

  return card;
}

// 경기 시작
function startGame() {
  appState.currentGameId = generateGameId();
  appState.gameStarted = true;
  appState.sets = [];
  appState.currentSet = 1;
  appState.lateArrivals = { A: [], B: [] };

  appState.sets.push({
    setNum: 1,
    scoreA: 0,
    scoreB: 0,
    winner: null,
    addedA: [],
    addedB: [],
    currentA: appState.teamA.map(m => m.name),
    currentB: appState.teamB.map(m => m.name)
  });

  switchTab('game');
  renderGameScreen();
}
