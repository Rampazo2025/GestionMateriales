<template>
  <v-app>
    <v-main class="login-background">
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="5" lg="4">
            <v-card class="pa-8" elevation="12" rounded="xl">
              <v-card-title class="text-h4 font-weight-bold text-center mb-4">
                Iniciar sesión
              </v-card-title>
              <v-card-subtitle class="text-center mb-6">
                Ingresa tus credenciales para continuar.
              </v-card-subtitle>
              <v-form class="d-flex flex-column gap-4">
                <v-alert
                  v-if="errorMessage"
                  type="error"
                  variant="tonal"
                  class="mb-2"
                >
                  {{ errorMessage }}
                </v-alert>
                <v-text-field
                  v-model="form.email"
                  label="Correo electrónico"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-email-outline"
                  class="input-field"
                ></v-text-field>
                <v-text-field
                  v-model="form.password"
                  label="Contraseña"
                  type="password"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-lock-outline"
                  class="input-field"
                ></v-text-field>
                <v-btn
                  block
                  color="primary"
                  size="large"
                  class="mt-2"
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                  @click="onSubmit"
                >
                  Acceder
                </v-btn>
              </v-form>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()

const form = reactive({
  email: '',
  password: ''
})

const isSubmitting = ref(false)
const errorMessage = ref('')

const onSubmit = async () => {
  if (!form.email || !form.password) {
    errorMessage.value = 'Debes ingresar correo y contraseña.'
    return
  }

  try {
    errorMessage.value = ''
    isSubmitting.value = true

    const response = await api.post('/auth/login', {
      email: form.email,
      password: form.password
    })

    localStorage.setItem('currentUser', JSON.stringify(response.data))
    router.push('/home')
  } catch (error) {
    const message = error.response?.data?.message || 'No fue posible iniciar sesión.'
    errorMessage.value = message
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.login-background {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: radial-gradient(circle at top, rgba(24, 103, 192, 0.25), transparent 55%),
    linear-gradient(180deg, #eaf2ff 0%, #f8fbff 100%);
}

.input-field :deep(.v-field__overlay) {
  background-color: rgba(242, 247, 255, 0.85);
  border-radius: 14px;
}

.input-field :deep(.v-field__outline) {
  border-radius: 14px;
  border-color: rgba(24, 103, 192, 0.2);
}

.input-field :deep(.v-field--focused .v-field__outline) {
  border-color: #1867c0;
  box-shadow: 0 0 0 3px rgba(24, 103, 192, 0.18);
}
</style>
