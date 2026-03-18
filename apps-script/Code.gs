/**
 * 배구 팀 관리 - Google Apps Script 백엔드
 *
 * ★ 간편 설정 방법 (3단계):
 * 1. Google Sheets에서 새 스프레드시트를 생성합니다
 * 2. 확장 프로그램 > Apps Script에서 이 코드를 붙여넣습니다
 * 3. 상단 함수 선택 드롭다운에서 "initializeSpreadsheet"를 선택하고 ▶ 실행
 *    → 시트 3개 + 헤더가 자동 생성됩니다!
 * 4. 배포 > 새 배포 > 웹 앱으로 배포 (모든 사용자 접근 허용)
 * 5. 배포 URL을 웹앱에 입력
 *
 * ※ 스프레드시트 ID는 자동 감지됩니다 (바인딩 스크립트)
 */

// 바인딩 스크립트에서는 getActiveSpreadsheet() 사용
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name) {
  return getSpreadsheet().getSheetByName(name);
}

// ======================================================
// ★ 최초 1회 실행: 시트 자동 생성 + 헤더 세팅
// ======================================================
function initializeSpreadsheet() {
  const ss = getSpreadsheet();

  // 기존 시트 확인 후 없으면 생성
  const sheetsConfig = [
    {
      name: '회원목록',
      headers: ['번호', '이름', '성별', '활성'],
      colWidths: [60, 100, 60, 60]
    },
    {
      name: '경기기록',
      headers: ['경기ID', '날짜', 'A팀멤버', 'B팀멤버', 'A팀남녀', 'B팀남녀', '총세트수', 'A팀승수', 'B팀승수', '메모'],
      colWidths: [140, 100, 200, 200, 80, 80, 70, 70, 70, 150]
    },
    {
      name: '세트기록',
      headers: ['경기ID', '세트번호', 'A팀점수', 'B팀점수', '승리팀', 'A팀추가멤버', 'B팀추가멤버', 'A팀현재멤버', 'B팀현재멤버'],
      colWidths: [140, 70, 70, 70, 70, 150, 150, 200, 200]
    },
    {
      name: '납부기록',
      headers: ['날짜', '이름', '납부'],
      colWidths: [100, 100, 60]
    }
  ];

  sheetsConfig.forEach(function(config) {
    var sheet = ss.getSheetByName(config.name);
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
    }

    // 헤더가 비어있으면 세팅
    var firstCell = sheet.getRange(1, 1).getValue();
    if (!firstCell) {
      var headerRange = sheet.getRange(1, 1, 1, config.headers.length);
      headerRange.setValues([config.headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4285f4');
      headerRange.setFontColor('#ffffff');

      // 열 너비 설정
      config.colWidths.forEach(function(w, i) {
        sheet.setColumnWidth(i + 1, w);
      });

      // 헤더 행 고정
      sheet.setFrozenRows(1);
    }
  });

  // 기본 시트(Sheet1) 정리
  var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('시트1');
  if (defaultSheet && ss.getSheets().length > 4) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.getUi().alert(
    '초기화 완료!\n\n' +
    '✅ 회원목록 시트 생성\n' +
    '✅ 경기기록 시트 생성\n' +
    '✅ 세트기록 시트 생성\n' +
    '✅ 납부기록 시트 생성\n\n' +
    '이제 "배포 > 새 배포"로 웹 앱을 배포하세요.'
  );
}

// ======================================================
// GET 요청 처리
// ======================================================
function doGet(e) {
  var action = e.parameter.action;
  var result;

  try {
    switch (action) {
      case 'getMembers':
        result = getMembers();
        break;
      case 'getGames':
        result = getGames(e.parameter.date);
        break;
      case 'getGameDetail':
        result = getGameDetail(e.parameter.gameId);
        break;
      case 'getStats':
        result = getStats();
        break;
      case 'getPayments':
        result = getPayments(e.parameter.date);
        break;
      default:
        result = { success: false, error: '알 수 없는 액션: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ======================================================
// POST 요청 처리
// ======================================================
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;
  var result;

  try {
    switch (action) {
      case 'saveGame':
        result = saveGame(body);
        break;
      case 'addMember':
        result = addMember(body);
        break;
      case 'bulkAddMembers':
        result = bulkAddMembers(body);
        break;
      case 'updateMember':
        result = updateMember(body);
        break;
      case 'deleteMember':
        result = deleteMember(body);
        break;
      case 'savePayments':
        result = savePayments(body);
        break;
      default:
        result = { success: false, error: '알 수 없는 액션: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ======================================================
// 회원 관리
// ======================================================

// 회원 목록 조회
function getMembers() {
  var sheet = getSheet('회원목록');
  var data = sheet.getDataRange().getValues();
  var members = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === '' && data[i][1] === '') continue;
    members.push({
      id: data[i][0],
      name: data[i][1],
      gender: data[i][2],
      active: data[i][3] === 'O' || data[i][3] === true
    });
  }

  return { success: true, data: members };
}

// 회원 1명 추가
function addMember(body) {
  var sheet = getSheet('회원목록');
  var lastRow = sheet.getLastRow();
  var newId = lastRow > 1 ? sheet.getRange(lastRow, 1).getValue() + 1 : 1;

  sheet.appendRow([newId, body.name, body.gender, 'O']);

  return { success: true, data: { id: newId, name: body.name, gender: body.gender, active: true } };
}

// 회원 일괄 추가
function bulkAddMembers(body) {
  var sheet = getSheet('회원목록');
  var lastRow = sheet.getLastRow();
  var startId = lastRow > 1 ? sheet.getRange(lastRow, 1).getValue() + 1 : 1;
  var members = body.members; // [{name, gender}, ...]
  var added = [];

  // 기존 회원 이름 목록 (중복 방지)
  var existingNames = {};
  if (lastRow > 1) {
    var existingData = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    existingData.forEach(function(row) {
      if (row[0]) existingNames[row[0].toString().trim()] = true;
    });
  }

  var rows = [];
  members.forEach(function(m, i) {
    var name = m.name.trim();
    if (!name || existingNames[name]) return; // 빈 이름이나 중복 건너뛰기
    var id = startId + rows.length;
    rows.push([id, name, m.gender, 'O']);
    added.push({ id: id, name: name, gender: m.gender, active: true });
    existingNames[name] = true;
  });

  if (rows.length > 0) {
    sheet.getRange(lastRow + 1, 1, rows.length, 4).setValues(rows);
  }

  return { success: true, data: added, count: added.length };
}

// 회원 수정
function updateMember(body) {
  var sheet = getSheet('회원목록');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == body.id) {
      if (body.name) sheet.getRange(i + 1, 2).setValue(body.name);
      if (body.gender) sheet.getRange(i + 1, 3).setValue(body.gender);
      if (body.active !== undefined) sheet.getRange(i + 1, 4).setValue(body.active ? 'O' : 'X');
      return { success: true };
    }
  }

  return { success: false, error: '회원을 찾을 수 없습니다.' };
}

// 회원 삭제
function deleteMember(body) {
  var sheet = getSheet('회원목록');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == body.id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: '회원을 찾을 수 없습니다.' };
}

// ======================================================
// 경기 관리
// ======================================================

// 경기 기록 조회
function getGames(dateFilter) {
  var sheet = getSheet('경기기록');
  var data = sheet.getDataRange().getValues();
  var games = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === '') continue;
    var game = {
      gameId: data[i][0],
      date: data[i][1],
      teamA: data[i][2],
      teamB: data[i][3],
      teamAGender: data[i][4],
      teamBGender: data[i][5],
      totalSets: data[i][6],
      teamAWins: data[i][7],
      teamBWins: data[i][8],
      memo: data[i][9]
    };

    if (!dateFilter || game.date === dateFilter) {
      games.push(game);
    }
  }

  return { success: true, data: games.reverse() };
}

// 경기 상세 (세트 기록) 조회
function getGameDetail(gameId) {
  var sheet = getSheet('세트기록');
  var data = sheet.getDataRange().getValues();
  var sets = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === gameId) {
      sets.push({
        gameId: data[i][0],
        setNum: data[i][1],
        scoreA: data[i][2],
        scoreB: data[i][3],
        winner: data[i][4],
        addedA: data[i][5],
        addedB: data[i][6],
        currentA: data[i][7],
        currentB: data[i][8]
      });
    }
  }

  return { success: true, data: sets };
}

// 경기 저장
function saveGame(body) {
  var gameSheet = getSheet('경기기록');
  var setSheet = getSheet('세트기록');
  var gameId = body.gameId;

  gameSheet.appendRow([
    gameId, body.date, body.teamA, body.teamB,
    body.teamAGender, body.teamBGender,
    body.totalSets, body.teamAWins, body.teamBWins,
    body.memo || ''
  ]);

  if (body.sets && body.sets.length > 0) {
    var rows = body.sets.map(function(set) {
      return [
        gameId, set.setNum, set.scoreA, set.scoreB,
        set.winner, set.addedA || '', set.addedB || '',
        set.currentA || '', set.currentB || ''
      ];
    });
    setSheet.getRange(setSheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
  }

  return { success: true, gameId: gameId };
}

// ======================================================
// 통계 (개인별 승/패 - 세트 기준)
// ======================================================
function getStats() {
  var setSheet = getSheet('세트기록');
  var setData = setSheet.getDataRange().getValues();
  var stats = {};

  for (var i = 1; i < setData.length; i++) {
    if (setData[i][0] === '') continue;
    var winner = setData[i][4];
    var currentA = setData[i][7] ? setData[i][7].toString().split(',') : [];
    var currentB = setData[i][8] ? setData[i][8].toString().split(',') : [];

    currentA.forEach(function(name) {
      name = name.trim();
      if (!name) return;
      if (!stats[name]) stats[name] = { wins: 0, losses: 0 };
      if (winner === 'A') stats[name].wins++;
      else if (winner === 'B') stats[name].losses++;
    });

    currentB.forEach(function(name) {
      name = name.trim();
      if (!name) return;
      if (!stats[name]) stats[name] = { wins: 0, losses: 0 };
      if (winner === 'B') stats[name].wins++;
      else if (winner === 'A') stats[name].losses++;
    });
  }

  var result = Object.keys(stats).map(function(name) {
    var total = stats[name].wins + stats[name].losses;
    return {
      name: name,
      wins: stats[name].wins,
      losses: stats[name].losses,
      total: total,
      winRate: total > 0 ? Math.round(stats[name].wins / total * 100) : 0
    };
  });

  result.sort(function(a, b) { return b.winRate - a.winRate || b.wins - a.wins; });

  return { success: true, data: result };
}

// ======================================================
// 납부 관리
// ======================================================

// 특정 날짜의 납부 기록 조회
function getPayments(date) {
  var sheet = getSheet('납부기록');
  var data = sheet.getDataRange().getValues();
  var payments = {};

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === date) {
      payments[data[i][1]] = data[i][2] === 'O' || data[i][2] === true;
    }
  }

  return { success: true, data: payments };
}

// 납부 기록 저장 (해당 날짜 기존 기록 덮어쓰기)
function savePayments(body) {
  var sheet = getSheet('납부기록');
  var date = body.date;
  var payments = body.payments; // {이름: true/false, ...}

  // 기존 해당 날짜 기록 삭제 (아래에서 위로 삭제해야 행 번호가 밀리지 않음)
  var data = sheet.getDataRange().getValues();
  var rowsToDelete = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === date) {
      rowsToDelete.push(i + 1);
    }
  }
  for (var j = rowsToDelete.length - 1; j >= 0; j--) {
    sheet.deleteRow(rowsToDelete[j]);
  }

  // 새 기록 추가
  var names = Object.keys(payments);
  if (names.length > 0) {
    var rows = names.map(function(name) {
      return [date, name, payments[name] ? 'O' : 'X'];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 3).setValues(rows);
  }

  return { success: true };
}
