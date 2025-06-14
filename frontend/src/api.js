// API通信
const API_BASE = "https://9526.ip-ddns.com/backend/api.php";

export async function createRoom(playerName) {
  const res = await fetch(`${API_BASE}?action=create_room&player=${encodeURIComponent(playerName)}`);
  return res.json();
}
export async function joinRoom(roomId, playerName) {
  const res = await fetch(`${API_BASE}?action=join_room&room=${roomId}&player=${encodeURIComponent(playerName)}`);
  return res.json();
}
export async function startGame(roomId) {
  const res = await fetch(`${API_BASE}?action=start_game&room=${roomId}`);
  return res.json();
}
export async function getRoomState(roomId, playerName) {
  // 增加playerName参数，确保myHand返回
  const url = playerName
    ? `${API_BASE}?action=room_state&room=${roomId}&player=${encodeURIComponent(playerName)}`
    : `${API_BASE}?action=room_state&room=${roomId}`;
  const res = await fetch(url);
  return res.json();
}
export async function submitHand(roomId, playerName, hand) {
  const res = await fetch(`${API_BASE}?action=submit_hand&room=${roomId}&player=${encodeURIComponent(playerName)}`, {
    method: "POST",
    body: JSON.stringify({ hand }),
    headers: { "Content-Type": "application/json" }
  });
  return res.json();
}
export async function getResults(roomId) {
  const res = await fetch(`${API_BASE}?action=get_results&room=${roomId}`);
  return res.json();
}
