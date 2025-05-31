<template>
  <div>
    <h2>赠送积分</h2>
    <form @submit.prevent="gift">
      <input v-model="toPhone" placeholder="对方手机号" required maxlength="20" />
      <input v-model.number="amount" type="number" min="1" placeholder="赠送积分" required />
      <button type="submit">赠送</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const toPhone = ref('')
const amount = ref('')

async function gift() {
  const res = await fetch('https://wenge.cloudns.ch/api/points.php?action=transfer', {
    method: 'POST',
    headers: { 
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `to=${encodeURIComponent(toPhone.value)}&points=${amount.value}`
  })
  const data = await res.json()
  if (data.success) {
    alert('赠送成功')
  } else {
    alert(data.message || '赠送失败')
  }
}
</script>
