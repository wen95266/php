<template>
  <div>
    <h2>房间ID: {{ roomId }}</h2>
    <div v-if="!gameStarted">
      <p>等待其他玩家进入...</p>
    </div>
    <div v-else>
      <div>
        <h3>你的手牌：</h3>
        <div>
          <img v-for="card in myCards" :src="getCardImg(card)" :key="card" class="card-img"/>
        </div>
        <button @click="autoSort">AI智能分牌</button>
        <button @click="trustee">托管</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
const myCards = ref([])
const gameStarted = ref(false)
const route = useRoute()
const roomId = route.params.roomId
let pollTimer

function getCardImg(card) {
  // 如 10_of_clubs.svg
  return `/cards/${card}.svg`
}

async function fetchGameStatus() {
  const res = await fetch(`https://wenge.cloudns.ch/api/game.php?action=status&room=${roomId}`, {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  })
  const data = await res.json()
  gameStarted.value = !!data.started
  myCards.value = data.cards || []
}

async function autoSort() {
  const res = await fetch(`https://wenge.cloudns.ch/api/ai.php?room=${roomId}`, {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  })
  const data = await res.json()
  if (data.success) {
    myCards.value = data.sorted_cards
  } else {
    alert('AI分牌失败')
  }
}

async function trustee() {
  await fetch(`https://wenge.cloudns.ch/api/game.php?action=trustee&room=${roomId}`, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  })
  alert('已托管')
}

onMounted(() => {
  fetchGameStatus()
  pollTimer = setInterval(fetchGameStatus, 3000)
})
onBeforeUnmount(() => clearInterval(pollTimer))
</script>
