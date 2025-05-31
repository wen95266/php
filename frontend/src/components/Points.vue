<template>
  <div>
    <h2>我的积分</h2>
    <p v-if="points>=0">{{ points }}</p>
    <button @click="loadPoints">刷新</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const points = ref(-1)
async function loadPoints() {
  const res = await fetch('https://wenge.cloudns.ch/api/points.php?action=my', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
  })
  const data = await res.json()
  points.value = data.points
}
onMounted(loadPoints)
</script>
