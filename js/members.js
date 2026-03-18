/**
 * 참가자 선택 화면 로직
 */

// HTML 이스케이프 (XSS 방지)
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 회원 목록 렌더링 (안전한 DOM 조작)
function renderMemberList() {
  const container = document.getElementById('member-list');
  container.textContent = '';
  const activeMembers = appState.members.filter(m => m.active);

  if (activeMembers.length === 0) {
    const p = document.createElement('p');
    p.className = 'empty-msg';
    p.textContent = '등록된 회원이 없습니다. 아래에서 회원을 추가하세요.';
    container.appendChild(p);
    updateMemberCount();
    return;
  }

  // 성별별 정렬 (남 먼저, 그 다음 여)
  activeMembers.sort((a, b) => {
    if (a.gender === b.gender) return a.name.localeCompare(b.name, 'ko');
    return a.gender === '남' ? -1 : 1;
  });

  activeMembers.forEach((m, idx) => {
    const isSelected = appState.selectedIds.has(m.id);
    const isPaid = appState.paidIds.has(m.id);

    const card = document.createElement('div');
    card.className = `member-card ${isSelected ? 'selected' : ''}`;
    card.dataset.id = m.id;
    card.style.animationDelay = `${idx * 0.03}s`;

    // 메인 터치 영역 (선택/해제)
    const mainArea = document.createElement('div');
    mainArea.className = 'member-main-area';
    mainArea.addEventListener('click', () => toggleMember(m.id));

    const badge = document.createElement('span');
    badge.className = `gender-badge ${m.gender === '남' ? 'male' : 'female'}`;
    badge.textContent = m.gender;

    const name = document.createElement('span');
    name.className = 'member-name';
    name.textContent = m.name;

    const check = document.createElement('span');
    check.className = 'check-icon';
    check.textContent = isSelected ? '✓' : '';

    mainArea.appendChild(badge);
    mainArea.appendChild(name);
    mainArea.appendChild(check);
    card.appendChild(mainArea);

    // 선택된 멤버에만 납부 토글 표시
    if (isSelected) {
      const payBtn = document.createElement('button');
      payBtn.className = `pay-toggle ${isPaid ? 'paid' : ''}`;
      payBtn.textContent = isPaid ? '₩' : '₩';
      payBtn.title = isPaid ? '납부 완료' : '미납부';
      payBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePayment(m.id);
      });
      card.appendChild(payBtn);
    }

    container.appendChild(card);
  });

  updateMemberCount();
  renderPaymentSummary();
}

// 회원 선택 토글
function toggleMember(id) {
  if (appState.selectedIds.has(id)) {
    appState.selectedIds.delete(id);
  } else {
    appState.selectedIds.add(id);
  }
  renderMemberList();
}

// 납부 토글
function togglePayment(id) {
  if (appState.paidIds.has(id)) {
    appState.paidIds.delete(id);
  } else {
    appState.paidIds.add(id);
  }
  renderMemberList();
}

// 전체 선택/해제
function toggleAllMembers() {
  const activeMembers = appState.members.filter(m => m.active);
  if (appState.selectedIds.size === activeMembers.length) {
    appState.selectedIds.clear();
  } else {
    activeMembers.forEach(m => appState.selectedIds.add(m.id));
  }
  renderMemberList();
}

// 선택 인원 카운트 업데이트
function updateMemberCount() {
  const selected = getSelectedMembers();
  const males = selected.filter(m => m.gender === '남').length;
  const females = selected.filter(m => m.gender === '여').length;
  const total = selected.length;

  document.getElementById('selected-count').textContent = total;
  document.getElementById('male-count').textContent = males;
  document.getElementById('female-count').textContent = females;

  const drawBtn = document.getElementById('btn-draw-teams');
  if (drawBtn) {
    drawBtn.disabled = total < 4;
  }
}

// 납부 요약 렌더링
function renderPaymentSummary() {
  let summaryEl = document.getElementById('payment-summary');
  const selected = getSelectedMembers();

  if (selected.length === 0) {
    if (summaryEl) summaryEl.classList.add('hidden');
    return;
  }

  if (!summaryEl) return;
  summaryEl.classList.remove('hidden');

  const paidCount = selected.filter(m => appState.paidIds.has(m.id)).length;
  const unpaidCount = selected.length - paidCount;

  const paidEl = document.getElementById('paid-count');
  const unpaidEl = document.getElementById('unpaid-count');
  if (paidEl) paidEl.textContent = paidCount;
  if (unpaidEl) unpaidEl.textContent = unpaidCount;
}

// 선택된 회원 목록 반환
function getSelectedMembers() {
  return appState.members.filter(m => appState.selectedIds.has(m.id));
}

// 회원 추가 모달 열기
function showAddMemberModal() {
  document.getElementById('add-member-modal').classList.remove('hidden');
  document.getElementById('new-member-name').value = '';
  document.getElementById('new-member-name').focus();
}

function closeAddMemberModal() {
  document.getElementById('add-member-modal').classList.add('hidden');
}

// 회원 추가 저장
async function saveMember() {
  const name = document.getElementById('new-member-name').value.trim();
  const gender = document.querySelector('input[name="new-member-gender"]:checked')?.value;

  if (!name) {
    showToast('이름을 입력해주세요', 'error');
    return;
  }
  if (!gender) {
    showToast('성별을 선택해주세요', 'error');
    return;
  }

  if (appState.members.some(m => m.name === name)) {
    showToast('이미 등록된 이름입니다', 'error');
    return;
  }

  showLoading(true);
  try {
    const result = await api.addMember(name, gender);
    if (result.success) {
      appState.members.push(result.data);
      renderMemberList();
      closeAddMemberModal();
      showToast(`${name} 선생님이 추가되었습니다`);
    } else {
      showToast('추가 실패: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('서버 오류: ' + err.message, 'error');
  }
  showLoading(false);
}

// 회원 삭제
async function removeMember(id) {
  const member = appState.members.find(m => m.id === id);
  if (!confirm(`${member.name} 선생님을 삭제하시겠습니까?`)) return;

  showLoading(true);
  try {
    const result = await api.deleteMember(id);
    if (result.success) {
      appState.members = appState.members.filter(m => m.id !== id);
      appState.selectedIds.delete(id);
      renderMemberList();
      showToast(`${member.name} 선생님이 삭제되었습니다`);
    }
  } catch (err) {
    showToast('서버 오류: ' + err.message, 'error');
  }
  showLoading(false);
}

// 회원 일괄 추가 모달
function showBulkAddModal() {
  document.getElementById('bulk-add-modal').classList.remove('hidden');
  document.getElementById('bulk-member-input').value = '';
  document.getElementById('bulk-member-input').focus();
}

function closeBulkAddModal() {
  document.getElementById('bulk-add-modal').classList.add('hidden');
}

// 일괄 추가 저장
async function saveBulkMembers() {
  const text = document.getElementById('bulk-member-input').value.trim();
  if (!text) {
    showToast('회원 정보를 입력해주세요', 'error');
    return;
  }

  const lines = text.split('\n').filter(l => l.trim());
  const members = [];
  const errors = [];

  lines.forEach((line, idx) => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 2) {
      errors.push(`${idx + 1}번째 줄: 형식 오류 (이름,성별)`);
      return;
    }
    const name = parts[0];
    const gender = parts[1];
    if (gender !== '남' && gender !== '여') {
      errors.push(`${idx + 1}번째 줄: 성별은 "남" 또는 "여"만 가능`);
      return;
    }
    members.push({ name, gender });
  });

  if (errors.length > 0) {
    showToast(errors[0], 'error');
    return;
  }

  if (members.length === 0) {
    showToast('추가할 회원이 없습니다', 'error');
    return;
  }

  showLoading(true);
  try {
    const result = await api.bulkAddMembers(members);
    if (result.success) {
      result.data.forEach(m => appState.members.push(m));
      renderMemberList();
      closeBulkAddModal();
      showToast(`${result.count}명이 추가되었습니다`);
    } else {
      showToast('추가 실패: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('서버 오류: ' + err.message, 'error');
  }
  showLoading(false);
}

// 회원 관리 모드 토글
function toggleManageMode() {
  const container = document.getElementById('member-list');
  container.classList.toggle('manage-mode');
  const btn = document.getElementById('btn-manage');
  const isManaging = container.classList.contains('manage-mode');
  btn.textContent = isManaging ? '완료' : '관리';

  if (isManaging) {
    document.querySelectorAll('.member-card').forEach(card => {
      const id = parseInt(card.dataset.id);
      if (!card.querySelector('.delete-btn')) {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', (e) => { e.stopPropagation(); removeMember(id); });
        card.appendChild(delBtn);
      }
    });
  } else {
    document.querySelectorAll('.delete-btn').forEach(btn => btn.remove());
  }
}

// 팀 추첨으로 이동
function goToTeamDraw() {
  if (getSelectedMembers().length < 4) {
    showToast('최소 4명 이상 선택해주세요', 'error');
    return;
  }
  // 납부 기록 자동 저장
  saveTodayPayments();
  switchTab('teams');
  renderTeamDraw();
}
