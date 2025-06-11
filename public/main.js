// APIのベースURL（必要に応じて調整）
const API_BASE = '/api';

// ログイン情報の取得（例：localStorageにトークン保存）
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

// APIリクエスト用のヘルパー関数（認証トークン付き）
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  options.headers = headers;

  const res = await fetch(API_BASE + path, options);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'APIエラー');
  }
  return res.json();
}

// ログイン状態のチェックとユーザー情報取得
async function fetchUserInfo() {
  try {
    const user = await apiFetch('/me');
    return user;
  } catch {
    clearToken();
    return null;
  }
}

// Workボタン制御（1時間に1回ランダム報酬）
async function doWork() {
  try {
    const res = await apiFetch('/work', { method: 'POST' });
    alert(`報酬を獲得しました：${res.rewarded_amount.toLocaleString()}円`);
    return res.rewarded_amount;
  } catch (err) {
    alert(`報酬取得エラー: ${err.message}`);
  }
}

// DOMにユーザー情報を表示する例
function displayUserInfo(user) {
  if (!user) return;
  const el = document.getElementById('user-info');
  if (el) {
    el.textContent = `ユーザー名: ${user.username} | 残高: ${user.balance.toLocaleString()}円 | ランク: ${user.rank_name || 'なし'}`;
  }
}

// ページ読み込み時にユーザー情報を取得して表示する例
async function initPage() {
  const user = await fetchUserInfo();
  if (!user) {
    window.location.href = '/login.html';  // ログインページへリダイレクト
    return;
  }
  displayUserInfo(user);
}

// Exports if using modules (optional)
// export { getToken, setToken, clearToken, apiFetch, fetchUserInfo, doWork, displayUserInfo, initPage };
