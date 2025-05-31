<template>
  <div class="lobby">
    <h2>十三水大厅</h2>
    <button @click="autoMatch" :disabled="loading">自动匹配开始</button>
    <p v-if="loading">匹配中，请稍候...</p>
    <button @click="$router.push('/points')">积分管理</button>
    <button @click="$router.push('/gift')">赠送积分</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const loading = ref(false)
const router = useRouter()

async function autoMatch() {
  loading.value = true
  const res = await fetch('https://wenge.cloudns.ch/api/game.php?action=match', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  })
  const data = await res.json()
  loading.value = false
  if (data.success) {
    router.push(`/room/${data.roomId}`)
  } else {
    alert(data.message || '匹配失败')
  }
}
</script>
