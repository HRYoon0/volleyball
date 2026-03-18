/**
 * 배구 팀 관리 앱 - 메인 진입점
 */

// 전역 앱 상태
const appState = {
  members: [],          // 전체 회원 목록
  selectedIds: new Set(), // 오늘 참가자 ID
  teamA: [],            // A팀
  teamB: [],            // B팀
  currentGameId: null,
  sets: [],             // 세트 기록 [{setNum, scoreA, scoreB, winner, addedA, addedB, currentA, currentB}]
  currentSet: 1,
  gameStarted: false,
  lateArrivals: { A: [], B: [] }, // 세트별 지각 합류자
  paidIds: new Set(),  // 오늘 납부한 회원 ID
  paymentLoaded: false // 납부 데이터 로드 여부
};

// DOM 로드 완료 시
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // API 설정 확인
  if (!api.isConfigured()) {
    showApiSetup();
    return;
  }

  // 탭 이벤트 등록
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 초기 데이터 로드
  loadMembers();
  // 승률 통계 백그라운드 로드 (밸런스 추첨용)
  loadPlayerStats();
  // 오늘 납부 기록 로드
  loadTodayPayments();
}

// API 설정 화면 표시
function showApiSetup() {
  document.getElementById('api-setup').classList.remove('hidden');
  document.getElementById('main-app').classList.add('hidden');
}

function hideApiSetup() {
  document.getElementById('api-setup').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');
}

function saveApiUrl() {
  const url = document.getElementById('api-url-input').value.trim();
  if (!url) {
    showToast('URL을 입력해주세요', 'error');
    return;
  }
  api.setUrl(url);
}

// 탭 전환
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('hidden', content.id !== `tab-${tabName}`);
  });

  // 탭별 초기화
  if (tabName === 'teams') loadPlayerStats();
  if (tabName === 'game') { if (appState.gameStarted) renderGameScreen(); else loadGames(); }
  if (tabName === 'stats') loadStats();
}

// 회원 데이터 로드
async function loadMembers() {
  showLoading(true);
  try {
    const result = await api.getMembers();
    if (result.success) {
      appState.members = result.data;
      renderMemberList();
      hideApiSetup();
    } else {
      showToast('회원 목록 로드 실패: ' + result.error, 'error');
    }
  } catch (err) {
    showToast('서버 연결 실패. API URL을 확인하세요.', 'error');
    showApiSetup();
  }
  showLoading(false);
}

// 로딩 표시
function showLoading(show) {
  const el = document.getElementById('loading');
  if (el) el.classList.toggle('hidden', !show);
}

// 토스트 메시지
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// 날짜 포맷
function formatDate(date) {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 오늘 납부 기록 로드
async function loadTodayPayments() {
  try {
    const today = formatDate(new Date());
    const result = await api.getPayments(today);
    if (result.success) {
      appState.paidIds.clear();
      // 이름 → ID 매핑
      Object.entries(result.data).forEach(([name, paid]) => {
        if (paid) {
          const member = appState.members.find(m => m.name === name);
          if (member) appState.paidIds.add(member.id);
        }
      });
      appState.paymentLoaded = true;
      renderMemberList();
    }
  } catch (e) {
    // 납부 로드 실패해도 앱은 정상 동작
  }
}

// 납부 저장
async function saveTodayPayments() {
  const today = formatDate(new Date());
  const payments = {};
  appState.members.forEach(m => {
    if (appState.selectedIds.has(m.id)) {
      payments[m.name] = appState.paidIds.has(m.id);
    }
  });

  try {
    await api.savePayments(today, payments);
    showToast('납부 기록이 저장되었습니다');
  } catch (e) {
    showToast('납부 저장 실패', 'error');
  }
}

// 경기 ID 생성
function generateGameId() {
  const now = new Date();
  return formatDate(now).replace(/-/g, '') + '_' + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
}
