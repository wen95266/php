import { createRouter, createWebHistory } from 'vue-router'
import Register from '../components/Register.vue'
import Lobby from '../components/Lobby.vue'
import GameRoom from '../components/GameRoom.vue'
import Points from '../components/Points.vue'
import Gift from '../components/Gift.vue'

const routes = [
  { path: '/', redirect: '/register' },
  { path: '/register', component: Register },
  { path: '/lobby', component: Lobby },
  { path: '/room/:roomId', component: GameRoom },
  { path: '/points', component: Points },
  { path: '/gift', component: Gift }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
