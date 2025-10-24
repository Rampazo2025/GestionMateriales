import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/home',
      name: 'Home',
      component: () => import('../views/HomeView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const storedUser = localStorage.getItem('currentUser')
  const isAuthenticated = !!storedUser

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' })
    return
  }

  if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'Home' })
    return
  }

  next()
})

export default router
