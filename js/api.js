/**
 * Google Apps Script API 통신 모듈
 * 배포 URL을 아래에 설정하세요
 */

const API_URL = localStorage.getItem('volleyball_api_url') || '';

const api = {
  // API URL 설정
  setUrl(url) {
    localStorage.setItem('volleyball_api_url', url);
    location.reload();
  },

  getUrl() {
    return API_URL;
  },

  isConfigured() {
    return API_URL && API_URL.length > 0;
  },

  // GET 요청
  async get(action, params = {}) {
    if (!this.isConfigured()) throw new Error('API URL이 설정되지 않았습니다.');
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
    return res.json();
  },

  // POST 요청
  async post(action, data = {}) {
    if (!this.isConfigured()) throw new Error('API URL이 설정되지 않았습니다.');
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...data })
    });
    if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
    return res.json();
  },

  // 회원 관련
  async getMembers() {
    return this.get('getMembers');
  },

  async addMember(name, gender) {
    return this.post('addMember', { name, gender });
  },

  async updateMember(id, data) {
    return this.post('updateMember', { id, ...data });
  },

  async deleteMember(id) {
    return this.post('deleteMember', { id });
  },

  // 회원 일괄 추가 - members: [{name, gender}, ...]
  async bulkAddMembers(members) {
    return this.post('bulkAddMembers', { members });
  },

  // 경기 관련
  async getGames(date) {
    const params = date ? { date } : {};
    return this.get('getGames', params);
  },

  async getGameDetail(gameId) {
    return this.get('getGameDetail', { gameId });
  },

  async saveGame(gameData) {
    return this.post('saveGame', gameData);
  },

  // 통계
  async getStats() {
    return this.get('getStats');
  },

  // 납부 관련
  async getPayments(date) {
    return this.get('getPayments', { date });
  },

  async savePayments(date, payments) {
    return this.post('savePayments', { date, payments });
  }
};
