<template>
  <div class="register">
    <h2>手机号注册/登录</h2>
    <form @submit.prevent="register">
      <input v-model="phone" placeholder="输入手机号" maxlength="20" required/>
      <button type="submit">注册/登录</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const phone = ref('')
const router = useRouter()

async function register() {
  const res = await fetch('https://wenge.cloudns.ch/api/auth.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phone.value })
  })
  const data = await res.json()
  if (data.success) {
    localStorage.setItem('token', data.token)
    router.push('/lobby')
  } else {
    alert(data.message || '注册失败')
  }
}
</script>
