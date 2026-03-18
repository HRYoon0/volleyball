/**
 * 경기 기록 화면 로직
 */

// 경기 화면 렌더링
function renderGameScreen() {
  const container = document.getElementById('game-area');
  container.textContent = '';

  if (!appState.gameStarted) {
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = '참가자를 선택하고 팀을 추첨한 후 경기를 시작하세요.';
    container.appendChild(msg);
    return;
  }

  // 세트 탭 바
  const setTabBar = document.createElement('div');
  setTabBar.className = 'set-tab-bar';

  appState.sets.forEach((set, idx) => {
    const setBtn = document.createElement('button');
    setBtn.className = `set-tab ${appState.currentSet === set.setNum ? 'active' : ''} ${set.winner ? 'done' : ''}`;
    setBtn.textContent = `${set.setNum}세트`;
    if (set.winner) {
      const winTag = document.createElement('span');
      winTag.className = 'set-winner-tag';
      winTag.textContent = ` ${set.winner}`;
      setBtn.appendChild(winTag);
    }
    setBtn.addEventListener('click', () => {
      appState.currentSet = set.setNum;
      renderGameScreen();
    });
    setTabBar.appendChild(setBtn);
  });

  // 새 세트 추가 버튼
  const addSetBtn = document.createElement('button');
  addSetBtn.className = 'set-tab add-set';
  addSetBtn.textContent = '+';
  addSetBtn.addEventListener('click', addNewSet);
  setTabBar.appendChild(addSetBtn);

  container.appendChild(setTabBar);

  // 현재 세트 내용
  const currentSetData = appState.sets.find(s => s.setNum === appState.currentSet);
  if (currentSetData) {
    renderSetContent(container, currentSetData);
  }

  // 하단 버튼
  const bottomBtns = document.createElement('div');
  bottomBtns.className = 'game-bottom-btns';

  const addPlayerBtn = document.createElement('button');
  addPlayerBtn.className = 'btn btn-secondary';
  addPlayerBtn.textContent = '+ 선수 추가 (지각)';
  addPlayerBtn.addEventListener('click', showLateArrivalModal);

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn-primary';
  saveBtn.textContent = '경기 종료 및 저장';
  saveBtn.addEventListener('click', saveGameResult);

  bottomBtns.appendChild(addPlayerBtn);
  bottomBtns.appendChild(saveBtn);
  container.appendChild(bottomBtns);
}

// 세트 내용 렌더링
function renderSetContent(container, setData) {
  const setContent = document.createElement('div');
  setContent.className = 'set-content';

  // 스코어보드
  const scoreboard = document.createElement('div');
  scoreboard.className = 'scoreboard';

  // A팀 점수
  const scoreA = createScorePanel('A', setData);
  const vsText = document.createElement('div');
  vsText.className = 'score-vs';
  vsText.textContent = 'VS';
  const scoreB = createScorePanel('B', setData);

  scoreboard.appendChild(scoreA);
  scoreboard.appendChild(vsText);
  scoreboard.appendChild(scoreB);
  setContent.appendChild(scoreboard);

  // 승리팀 선택 버튼
  const winnerArea = document.createElement('div');
  winnerArea.className = 'winner-area';

  const winLabel = document.createElement('span');
  winLabel.className = 'winner-label';
  winLabel.textContent = '승리팀: ';

  const winBtnA = document.createElement('button');
  winBtnA.className = `btn btn-win ${setData.winner === 'A' ? 'active-a' : ''}`;
  winBtnA.textContent = 'A팀 승';
  winBtnA.addEventListener('click', () => setWinner(setData.setNum, 'A'));

  const winBtnB = document.createElement('button');
  winBtnB.className = `btn btn-win ${setData.winner === 'B' ? 'active-b' : ''}`;
  winBtnB.textContent = 'B팀 승';
  winBtnB.addEventListener('click', () => setWinner(setData.setNum, 'B'));

  winnerArea.appendChild(winLabel);
  winnerArea.appendChild(winBtnA);
  winnerArea.appendChild(winBtnB);
  setContent.appendChild(winnerArea);

  // 이 세트 참가자 목록
  const membersArea = document.createElement('div');
  membersArea.className = 'set-members-area';

  membersArea.appendChild(createSetMemberList('A', setData.currentA, setData.addedA));
  membersArea.appendChild(createSetMemberList('B', setData.currentB, setData.addedB));

  setContent.appendChild(membersArea);
  container.appendChild(setContent);
}

// 점수 패널 생성
function createScorePanel(team, setData) {
  const panel = document.createElement('div');
  panel.className = `score-panel team-${team.toLowerCase()}-bg`;

  const label = document.createElement('div');
  label.className = 'score-team-label';
  label.textContent = `${team}팀`;

  const scoreDisplay = document.createElement('div');
  scoreDisplay.className = 'score-display';
  const key = team === 'A' ? 'scoreA' : 'scoreB';
  scoreDisplay.textContent = setData[key];

  const btnGroup = document.createElement('div');
  btnGroup.className = 'score-btn-group';

  const minusBtn = document.createElement('button');
  minusBtn.className = 'score-btn minus';
  minusBtn.textContent = '−';
  minusBtn.addEventListener('click', () => adjustScore(setData.setNum, team, -1));

  const plusBtn = document.createElement('button');
  plusBtn.className = 'score-btn plus';
  plusBtn.textContent = '+';
  plusBtn.addEventListener('click', () => adjustScore(setData.setNum, team, 1));

  btnGroup.appendChild(minusBtn);
  btnGroup.appendChild(plusBtn);

  panel.appendChild(label);
  panel.appendChild(scoreDisplay);
  panel.appendChild(btnGroup);

  return panel;
}

// 세트별 멤버 리스트 생성
function createSetMemberList(team, members, addedMembers) {
  const list = document.createElement('div');
  list.className = `set-member-list team-${team.toLowerCase()}-border`;

  const header = document.createElement('div');
  header.className = 'set-member-header';
  header.textContent = `${team}팀 (${members.length}명)`;
  list.appendChild(header);

  members.forEach(name => {
    const item = document.createElement('div');
    item.className = 'set-member-item';
    const isLate = addedMembers && addedMembers.includes(name);
    item.textContent = name;
    if (isLate) {
      const tag = document.createElement('span');
      tag.className = 'late-tag';
      tag.textContent = '추가';
      item.appendChild(tag);
    }
    list.appendChild(item);
  });

  return list;
}

// 점수 조정
function adjustScore(setNum, team, delta) {
  const set = appState.sets.find(s => s.setNum === setNum);
  const key = team === 'A' ? 'scoreA' : 'scoreB';
  set[key] = Math.max(0, set[key] + delta);
  renderGameScreen();
}

// 승리팀 설정
function setWinner(setNum, team) {
  const set = appState.sets.find(s => s.setNum === setNum);
  set.winner = set.winner === team ? null : team;
  renderGameScreen();
}

// 새 세트 추가
function addNewSet() {
  const lastSet = appState.sets[appState.sets.length - 1];
  const newSetNum = lastSet.setNum + 1;

  appState.sets.push({
    setNum: newSetNum,
    scoreA: 0,
    scoreB: 0,
    winner: null,
    addedA: [],
    addedB: [],
    currentA: [...lastSet.currentA],
    currentB: [...lastSet.currentB]
  });

  appState.currentSet = newSetNum;
  renderGameScreen();
}

// 지각 합류 모달
function showLateArrivalModal() {
  const modal = document.getElementById('late-arrival-modal');
  modal.classList.remove('hidden');

  const list = document.getElementById('late-member-list');
  list.textContent = '';

  // 현재 세트의 참가자 이름 목록
  const currentSet = appState.sets.find(s => s.setNum === appState.currentSet);
  const currentNames = [...currentSet.currentA, ...currentSet.currentB];

  // 아직 참가하지 않은 회원 표시
  const available = appState.members.filter(m =>
    m.active && !currentNames.includes(m.name)
  );

  if (available.length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = '추가할 수 있는 회원이 없습니다.';
    list.appendChild(msg);
    return;
  }

  available.forEach(m => {
    const item = document.createElement('div');
    item.className = 'late-member-item';

    const badge = document.createElement('span');
    badge.className = `gender-badge ${m.gender === '남' ? 'male' : 'female'}`;
    badge.textContent = m.gender;

    const name = document.createElement('span');
    name.className = 'member-name';
    name.textContent = m.name;

    const btnA = document.createElement('button');
    btnA.className = 'btn btn-sm btn-team-a';
    btnA.textContent = 'A팀';
    btnA.addEventListener('click', () => addLateArrival(m, 'A'));

    const btnB = document.createElement('button');
    btnB.className = 'btn btn-sm btn-team-b';
    btnB.textContent = 'B팀';
    btnB.addEventListener('click', () => addLateArrival(m, 'B'));

    item.appendChild(badge);
    item.appendChild(name);
    item.appendChild(btnA);
    item.appendChild(btnB);
    list.appendChild(item);
  });
}

function closeLateArrivalModal() {
  document.getElementById('late-arrival-modal').classList.add('hidden');
}

// 지각 합류자 추가
function addLateArrival(member, team) {
  const currentSet = appState.sets.find(s => s.setNum === appState.currentSet);

  if (team === 'A') {
    currentSet.currentA.push(member.name);
    currentSet.addedA.push(member.name);
  } else {
    currentSet.currentB.push(member.name);
    currentSet.addedB.push(member.name);
  }

  // 이후 세트에도 추가
  appState.sets.forEach(s => {
    if (s.setNum > appState.currentSet) {
      if (team === 'A' && !s.currentA.includes(member.name)) {
        s.currentA.push(member.name);
      } else if (team === 'B' && !s.currentB.includes(member.name)) {
        s.currentB.push(member.name);
      }
    }
  });

  showToast(`${member.name} 선생님이 ${team}팀에 합류했습니다`);
  showLateArrivalModal(); // 목록 갱신
  renderGameScreen();
}

// 경기 결과 저장
async function saveGameResult() {
  // 승리팀 미설정 세트 확인
  const unfinished = appState.sets.filter(s => !s.winner);
  if (unfinished.length > 0) {
    if (!confirm(`${unfinished.length}개 세트의 승리팀이 설정되지 않았습니다. 그래도 저장하시겠습니까?`)) {
      return;
    }
  }

  const teamAWins = appState.sets.filter(s => s.winner === 'A').length;
  const teamBWins = appState.sets.filter(s => s.winner === 'B').length;

  const teamAMales = appState.teamA.filter(m => m.gender === '남').length;
  const teamAFemales = appState.teamA.filter(m => m.gender === '여').length;
  const teamBMales = appState.teamB.filter(m => m.gender === '남').length;
  const teamBFemales = appState.teamB.filter(m => m.gender === '여').length;

  const gameData = {
    gameId: appState.currentGameId,
    date: formatDate(new Date()),
    teamA: appState.teamA.map(m => m.name).join(','),
    teamB: appState.teamB.map(m => m.name).join(','),
    teamAGender: `남${teamAMales}/여${teamAFemales}`,
    teamBGender: `남${teamBMales}/여${teamBFemales}`,
    totalSets: appState.sets.length,
    teamAWins: teamAWins,
    teamBWins: teamBWins,
    memo: '',
    sets: appState.sets.map(s => ({
      setNum: s.setNum,
      scoreA: s.scoreA,
      scoreB: s.scoreB,
      winner: s.winner || '',
      addedA: s.addedA.join(','),
      addedB: s.addedB.join(','),
      currentA: s.currentA.join(','),
      currentB: s.currentB.join(',')
    }))
  };

  showLoading(true);
  try {
    const result = await api.saveGame(gameData);
    if (result.success) {
      showToast('경기 결과가 저장되었습니다!');
      appState.gameStarted = false;
      appState.teamA = [];
      appState.teamB = [];
      appState.sets = [];
      appState.selectedIds.clear();
      switchTab('members');
      renderMemberList();
    } else {
      showToast('저장 실패: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('서버 오류: ' + err.message, 'error');
  }
  showLoading(false);
}

// 경기 기록 조회
async function loadGames() {
  if (appState.gameStarted) {
    renderGameScreen();
    return;
  }

  const container = document.getElementById('game-area');
  container.textContent = '';

  const historySection = document.createElement('div');
  historySection.className = 'history-section';

  const title = document.createElement('h3');
  title.textContent = '경기 기록';
  historySection.appendChild(title);

  showLoading(true);
  try {
    const result = await api.getGames();
    if (result.success && result.data.length > 0) {
      result.data.forEach(game => {
        historySection.appendChild(createGameCard(game));
      });
    } else {
      const msg = document.createElement('p');
      msg.className = 'empty-msg';
      msg.textContent = '아직 경기 기록이 없습니다.';
      historySection.appendChild(msg);
    }
  } catch (err) {
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = '기록을 불러올 수 없습니다.';
    historySection.appendChild(msg);
  }
  showLoading(false);

  container.appendChild(historySection);
}

// 경기 카드 생성
function createGameCard(game) {
  const card = document.createElement('div');
  card.className = 'game-history-card';

  const dateRow = document.createElement('div');
  dateRow.className = 'game-date';
  dateRow.textContent = game.date;

  const scoreRow = document.createElement('div');
  scoreRow.className = 'game-score-row';

  const aTeam = document.createElement('span');
  aTeam.className = `game-team ${game.teamAWins > game.teamBWins ? 'winner' : ''}`;
  aTeam.textContent = `A팀 ${game.teamAWins}`;

  const separator = document.createElement('span');
  separator.className = 'game-separator';
  separator.textContent = ':';

  const bTeam = document.createElement('span');
  bTeam.className = `game-team ${game.teamBWins > game.teamAWins ? 'winner' : ''}`;
  bTeam.textContent = `${game.teamBWins} B팀`;

  scoreRow.appendChild(aTeam);
  scoreRow.appendChild(separator);
  scoreRow.appendChild(bTeam);

  const memberRow = document.createElement('div');
  memberRow.className = 'game-members-row';
  memberRow.textContent = `A: ${game.teamA} | B: ${game.teamB}`;

  card.appendChild(dateRow);
  card.appendChild(scoreRow);
  card.appendChild(memberRow);

  return card;
}

// 통계 로드
async function loadStats() {
  const container = document.getElementById('stats-area');
  container.textContent = '';

  const title = document.createElement('h3');
  title.textContent = '개인 통계';
  container.appendChild(title);

  showLoading(true);
  try {
    const result = await api.getStats();
    if (result.success && result.data.length > 0) {
      const table = document.createElement('div');
      table.className = 'stats-table';

      // 헤더
      const header = document.createElement('div');
      header.className = 'stats-row stats-header';
      ['이름', '승', '패', '승률'].forEach(text => {
        const cell = document.createElement('div');
        cell.className = 'stats-cell';
        cell.textContent = text;
        header.appendChild(cell);
      });
      table.appendChild(header);

      // 데이터
      result.data.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'stats-row';

        [stat.name, stat.wins, stat.losses, `${stat.winRate}%`].forEach((text, i) => {
          const cell = document.createElement('div');
          cell.className = 'stats-cell';
          cell.textContent = text;
          if (i === 3) {
            cell.classList.add(stat.winRate >= 50 ? 'win-rate-high' : 'win-rate-low');
          }
          row.appendChild(cell);
        });
        table.appendChild(row);
      });

      container.appendChild(table);
    } else {
      const msg = document.createElement('p');
      msg.className = 'empty-msg';
      msg.textContent = '아직 통계 데이터가 없습니다.';
      container.appendChild(msg);
    }
  } catch (err) {
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = '통계를 불러올 수 없습니다.';
    container.appendChild(msg);
  }
  showLoading(false);
}
