<template>
  <v-main class="dashboard-background">
    <v-container class="py-8 px-4">
      <v-snackbar
        v-model="snackbar.show"
        :color="snackbar.color"
        location="top"
        timeout="3500"
        :close-on-back="false"
        :multi-line="true"
        class="snackbar-elevated"
      >
        {{ snackbar.message }}
      </v-snackbar>

      <v-sheet class="hero-surface pa-6 mb-8" rounded="xl" elevation="8">
        <div class="d-flex flex-wrap justify-space-between align-start gap-4 hero-header">
          <div class="hero-copy">
            <h1 class="text-h4 font-weight-bold mb-1">Panel de movimientos</h1>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Consulta, registra y genera reportes de movimientos según tu rol dentro del equipo.
            </p>
            <div class="d-flex flex-wrap gap-2">
              <v-chip color="primary" variant="tonal" class="text-capitalize">
                {{ currentUser?.cargo || 'Sin rol' }}
              </v-chip>
              <v-chip color="primary" variant="text" prepend-icon="mdi-account">
                {{ currentUser?.nombre || 'Usuario no identificado' }}
              </v-chip>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 justify-end hero-actions">
            <v-btn
              v-if="puedeAbrirDialogo"
              color="primary"
              class="submit-btn"
              prepend-icon="mdi-plus-circle"
              @click="openDialog"
            >
              Registrar movimiento
            </v-btn>
            <v-btn
              v-if="puedeDescargarReporte"
              color="primary-darken-1"
              class="submit-btn"
              prepend-icon="mdi-file-download"
              :disabled="generatingReport"
              :loading="generatingReport"
              @click="downloadReport"
            >
              Descargar reporte
            </v-btn>
            <v-btn
              v-if="currentUser"
              color="red-darken-1"
              variant="tonal"
              class="submit-btn"
              prepend-icon="mdi-logout"
              @click="logout"
            >
              Cerrar sesión
            </v-btn>
          </div>
        </div>
      </v-sheet>

      <v-row class="align-stretch" align="stretch">
        <v-col cols="12" md="8">
          <v-card class="content-card" elevation="10">
            <v-card-title class="d-flex justify-space-between align-center">
              <span class="text-subtitle-1 font-weight-semibold">Movimientos registrados</span>
              <v-btn
                v-if="puedeVerTabla"
                icon="mdi-refresh"
                variant="text"
                @click="loadMovimientos"
                :loading="isLoadingMovimientos"
                :disabled="isLoadingMovimientos"
                class="refresh-btn"
              ></v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-0">
              <template v-if="puedeVerTabla">
                <v-skeleton-loader
                  v-if="isLoadingMovimientos"
                  type="table"
                  class="pa-6"
                ></v-skeleton-loader>

                <v-data-table
                  v-else
                  :headers="movimientoHeaders"
                  :items="movimientosData"
                  item-key="id"
                  :items-per-page="8"
                  hover
                  class="movimientos-table"
                >
                  <template #item.fecha_movimiento="{ item }">
                    {{ formatDate(item.fecha_movimiento) }}
                  </template>
                  <template #item.tipo="{ item }">
                    <v-chip
                      :color="item.tipo === 'entrada' ? 'green' : 'red'"
                      variant="tonal"
                      size="small"
                    >
                      {{ formatTipo(item.tipo) }}
                    </v-chip>
                  </template>
                  <template #no-data>
                    <div class="text-center py-6 text-body-2">
                      No hay movimientos registrados para mostrar.
                    </div>
                  </template>
                </v-data-table>
              </template>

              <template v-else>
                <div class="pa-6">
                  <v-alert
                    type="info"
                    variant="tonal"
                    class="mb-4"
                    title="Registra tus movimientos"
                  >
                    Como empleado puedes agregar nuevos movimientos desde el botón
                    <strong>“Registrar movimiento”</strong>.
                  </v-alert>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    Si necesitas visualizar reportes o movimientos históricos, solicita acceso a tu supervisor.
                  </p>
                </div>
              </template>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="4">
          <v-card class="content-card pa-5" elevation="10">
            <h2 class="text-subtitle-1 font-weight-semibold mb-4">Resumen rápido</h2>

            <div v-if="puedeVerTabla && totalMovimientos > 0" class="stat-grid mb-5">
              <v-sheet rounded="xl" color="primary" variant="tonal" class="stat-tile">
                <span class="stat-label">Movimientos totales</span>
                <span class="stat-value">{{ totalMovimientos }}</span>
              </v-sheet>
              <v-sheet rounded="xl" color="green" variant="tonal" class="stat-tile">
                <span class="stat-label">Entradas</span>
                <span class="stat-value">{{ totalEntradas }}</span>
              </v-sheet>
              <v-sheet rounded="xl" color="red" variant="tonal" class="stat-tile">
                <span class="stat-label">Salidas</span>
                <span class="stat-value">{{ totalSalidas }}</span>
              </v-sheet>
            </div>

            <v-sheet
              v-if="puedeVerTabla && ultimoMovimiento"
              rounded="xl"
              variant="flat"
              class="last-movement-tile mb-5"
            >
              <div class="text-body-2 text-medium-emphasis mb-1">Último movimiento</div>
              <div class="text-subtitle-2 font-weight-medium">
                {{ formatTipo(ultimoMovimiento.tipo) }} · {{ ultimoMovimiento?.material || 'N/A' }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDate(ultimoMovimiento.fecha_movimiento) }} · {{ ultimoMovimiento?.proyecto || 'Sin proyecto' }}
              </div>
            </v-sheet>

            <v-divider class="mb-4"></v-divider>

            <h3 class="text-caption font-weight-semibold text-uppercase mb-3">Recomendaciones</h3>
            <v-list density="compact" class="tips-list">
              <v-list-item
                prepend-icon="mdi-calendar-clock"
                title="Actualiza la fecha del movimiento"
                subtitle="Mantén el historial con fechas reales."
              ></v-list-item>
              <v-list-item
                prepend-icon="mdi-file-table-box"
                title="Descarga el reporte en Excel"
                subtitle="Disponible para supervisores y administradores."
              ></v-list-item>
              <v-list-item
                prepend-icon="mdi-account-multiple"
                title="Verifica el técnico asignado"
                subtitle="Asegura que cada movimiento tenga responsable."
              ></v-list-item>
            </v-list>
          </v-card>
        </v-col>
      </v-row>

      <v-dialog v-model="showDialog" persistent max-width="640">
        <v-card class="dialog-card">
          <v-card-title class="text-h6 font-weight-bold">
            Registrar movimiento
          </v-card-title>
          <v-card-subtitle class="text-body-2 text-medium-emphasis px-6">
            Completa los datos para actualizar el stock del material seleccionado.
          </v-card-subtitle>
          <v-card-text class="pt-3">
            <v-form ref="formRef" class="d-flex flex-column gap-4" validate-on="input">
              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.tecnico"
                    :items="tecnicosDisponibles"
                    label="Nombre del técnico"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    class="input-field"
                    prepend-inner-icon="mdi-account-badge-outline"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.numeroMovil"
                    label="Número de vehículo"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required, rules.vehicle]"
                    type="number"
                    clearable
                    class="input-field"
                    prepend-inner-icon="mdi-truck"
                    min="0"
                    step="1"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="formData.proyecto"
                    :items="proyectosDisponibles"
                    label="Proyecto"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required]"
                    class="input-field"
                    prepend-inner-icon="mdi-briefcase-outline"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="formData.fecha"
                    label="Fecha"
                    variant="outlined"
                    density="comfortable"
                    :rules="[rules.required, rules.date]"
                    type="date"
                    prepend-inner-icon="mdi-calendar"
                    class="input-field"
                  ></v-text-field>
                </v-col>
              </v-row>

              <v-select
                v-model="formData.supervisor"
                :items="supervisoresDisponibles"
                label="Supervisor a cargo"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required]"
                class="input-field"
                prepend-inner-icon="mdi-account-tie"
                :disabled="isSupervisor"
              ></v-select>

              <v-autocomplete
                v-model="selectedMaterial"
                :items="materialesDataFormatted"
                item-title="displayName"
                item-value="value"
                return-object
                label="Buscar y seleccionar material"
                variant="outlined"
                density="comfortable"
                class="input-field"
                prepend-inner-icon="mdi-magnify"
                clearable
                :custom-filter="materialFilter"
              ></v-autocomplete>

              <v-row dense>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="movimientoTipo"
                    :items="movimientoOptions"
                    item-title="label"
                    item-value="value"
                    label="Tipo de movimiento"
                    variant="outlined"
                    density="comfortable"
                    class="input-field"
                    prepend-inner-icon="mdi-swap-horizontal"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="cantidad"
                    label="Cantidad"
                    type="number"
                    variant="outlined"
                    density="comfortable"
                    class="input-field"
                    prepend-inner-icon="mdi-counter"
                    min="0"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
          <v-card-actions class="px-6 pb-6">
            <v-spacer></v-spacer>
            <v-btn
              variant="text"
              @click="closeDialog"
              :disabled="isSubmitting"
            >
              Cancelar
            </v-btn>
            <v-btn
              color="primary"
              :disabled="!selectedMaterial || isSubmitting"
              :loading="isSubmitting"
              @click="addMaterial"
            >
              Registrar
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-container>
  </v-main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
const router = useRouter()

const formRef = ref(null)
const snackbar = ref({ show: false, message: '', color: 'primary' })
const materialesData = ref([])
const usuariosData = ref([])
const selectedMaterial = ref(null)
const selectedMateriales = ref([])
const cantidad = ref(0)
const movimientoTipo = ref('entrada')
const generatingReport = ref(false)
const movimientosData = ref([])
const isLoadingMovimientos = ref(false)
const showDialog = ref(false)
const currentUser = ref(null)
const movimientoOptions = [
  { label: 'Entrada', value: 'entrada' },
  { label: 'Salida', value: 'salida' }
]
const proyectosDisponibles = ['Proyecto Alpha', 'Proyecto Beta', 'Proyecto Gamma']

const tecnicosDisponibles = computed(() =>
  usuariosData.value
    .filter(usuario => usuario.cargo === 'empleado')
    .map(usuario => usuario.nombre)
)

const supervisoresDisponibles = computed(() =>
  usuariosData.value
    .filter(usuario => usuario.cargo === 'supervisor')
    .map(usuario => usuario.nombre)
)

const formData = reactive({
  tecnico: '',
  numeroMovil: '',
  proyecto: '',
  fecha: '',
  supervisor: ''
})

const rules = {
  required: value => (value && String(value).trim().length > 0) || 'Campo obligatorio',
  vehicle: value => !value || (/^\d{1,6}$/).test(String(value).trim()) || 'Número de vehículo inválido',
  date: value => (!!value && !Number.isNaN(Date.parse(value))) || 'Seleccione una fecha válida'
}

const validateForm = async () => {
  const result = await formRef.value?.validate()
  return result?.valid ?? false
}

const showSnackbar = (message, color = 'primary') => {
  snackbar.value = { show: true, message, color }
}

const resetFormFields = () => {
  Object.assign(formData, {
    tecnico: '',
    numeroMovil: '',
    proyecto: '',
    fecha: '',
    supervisor: isSupervisor.value ? currentUser.value?.nombre ?? '' : ''
  })

  selectedMaterial.value = null
  cantidad.value = 0
  movimientoTipo.value = 'entrada'
  formRef.value?.resetValidation()
}

const isSubmitting = ref(false)

const downloadReport = async () => {
  if (generatingReport.value) {
    return
  }

  if (!currentUser.value) {
    showSnackbar('No hay usuario autenticado.', 'error')
    return
  }

  try {
    generatingReport.value = true
    const params = {
      cargo: currentUser.value.cargo
    }

    if (currentUser.value.cargo === 'supervisor') {
      params.supervisor = currentUser.value.nombre
    }

    const response = await api.get('/materiales/reporte', {
      params,
      responseType: 'blob'
    })

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'reporte_materiales.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)

    showSnackbar('Reporte descargado correctamente.', 'success')
  } catch (error) {
    console.error(error)
    const message = error.response?.data?.message || 'No se pudo descargar el reporte.'
    showSnackbar(message, 'error')
  } finally {
    generatingReport.value = false
  }
}

const loadData = async () => {
  const [materialesResponse, usuariosResponse] = await Promise.all([
    api.get('/materiales'),
    api.get('/usuarios')
  ])

  materialesData.value = materialesResponse.data
  usuariosData.value = usuariosResponse.data
}

onMounted(async () => {
  try {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      currentUser.value = JSON.parse(storedUser)
    }
    await loadData()
    if (puedeVerTabla.value) {
      await loadMovimientos()
    }
  } catch (error) {
    console.error(error)
    showSnackbar('No se pudo cargar la información inicial.', 'error')
  }
})

const materialesDataFormatted = computed(() =>
  materialesData.value.map((material, index) => ({
    ...material,
    displayName: material.medida ? `${material.nombre} - ${material.medida}` : material.nombre,
    value: `${material.nombre ?? ''}-${material.medida ?? ''}-${index}`
  }))
)

const materialFilter = (value, queryText, item) => {
  if (!queryText) {
    return true
  }

  const material = item?.raw ?? item ?? {}
  const query = queryText.toLowerCase()
  const nombreMatch = material.nombre?.toLowerCase().includes(query)
  const medidaMatch = material.medida?.toLowerCase().includes(query)
  const displayMatch = value?.toLowerCase().includes(query)

  return nombreMatch || medidaMatch || displayMatch
}

const isEmployee = computed(() => currentUser.value?.cargo === 'empleado')
const isSupervisor = computed(() => currentUser.value?.cargo === 'supervisor')
const isAdmin = computed(() => currentUser.value?.cargo === 'administrador')

const puedeVerTabla = computed(() => isSupervisor.value || isAdmin.value)
const puedeAbrirDialogo = computed(() => isEmployee.value || isSupervisor.value || isAdmin.value)
const puedeDescargarReporte = computed(() => isSupervisor.value || isAdmin.value)

const movimientoHeaders = [
  { title: 'Fecha', key: 'fecha_movimiento' },
  { title: 'Material', key: 'material' },
  { title: 'Medida', key: 'medida' },
  { title: 'Tipo', key: 'tipo' },
  { title: 'Cantidad', key: 'cantidad' },
  { title: 'Técnico', key: 'tecnico' },
  { title: 'Proyecto', key: 'proyecto' },
  { title: 'Móvil', key: 'numero_movil' },
  { title: 'Supervisor', key: 'supervisor' }
]

const totalMovimientos = computed(() => movimientosData.value.length)
const totalEntradas = computed(
  () => movimientosData.value.filter(item => item.tipo?.toLowerCase() === 'entrada').length
)
const totalSalidas = computed(
  () => movimientosData.value.filter(item => item.tipo?.toLowerCase() === 'salida').length
)

const ultimoMovimiento = computed(() => {
  if (movimientosData.value.length === 0) {
    return null
  }

  const sorted = [...movimientosData.value].sort((a, b) => {
    const dateA = a.fecha_movimiento ? new Date(a.fecha_movimiento).getTime() : 0
    const dateB = b.fecha_movimiento ? new Date(b.fecha_movimiento).getTime() : 0

    if (dateA === dateB) {
      return (b.id ?? 0) - (a.id ?? 0)
    }

    return dateB - dateA
  })

  return sorted[0]
})

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CL').format(date)
}

const formatTipo = (tipo) => {
  if (!tipo) return ''
  return tipo.charAt(0).toUpperCase() + tipo.slice(1)
}

const openDialog = () => {
  showDialog.value = true

  if (isSupervisor.value && currentUser.value?.nombre) {
    formData.supervisor = currentUser.value.nombre
  }
}

const closeDialog = () => {
  showDialog.value = false
  resetFormFields()
}

const loadMovimientos = async () => {
  if (!currentUser.value) return

  try {
    isLoadingMovimientos.value = true
    const params = {
      cargo: currentUser.value.cargo
    }

    if (currentUser.value.cargo === 'supervisor') {
      params.supervisor = currentUser.value.nombre
    }

    const response = await api.get('/materiales/movimientos', { params })
    movimientosData.value = response.data
  } catch (error) {
    console.error('Error cargando movimientos', error)
    const message = error.response?.data?.message || 'No se pudieron cargar los movimientos.'
    showSnackbar(message, 'error')
  } finally {
    isLoadingMovimientos.value = false
  }
}

const addMaterial = async () => {
  if (isSubmitting.value) {
    return
  }

  const formValid = await validateForm()
  if (!formValid) {
    showSnackbar('Revisa los campos obligatorios antes de continuar.', 'error')
    return
  }

  if (!selectedMaterial.value || (Number(cantidad.value) || 0) <= 0) {
    showSnackbar('Selecciona un material y una cantidad válida.', 'error')
    return
  }

  let materialId = selectedMaterial.value.id

  if (!materialId) {
    const fallback = materialesData.value.find(
      item => item.nombre === selectedMaterial.value.nombre && item.medida === selectedMaterial.value.medida
    )

    materialId = fallback?.id
  }

  if (!materialId) {
    showSnackbar('No se pudo identificar el material seleccionado.', 'error')
    return
  }

  const material = selectedMaterial.value
  const movimiento = {
    materialId,
    tipo: movimientoTipo.value,
    cantidad: Number(cantidad.value) || 0,
    tecnico: formData.tecnico,
    proyecto: formData.proyecto,
    numeroMovil: formData.numeroMovil,
    supervisor: formData.supervisor,
    fecha: formData.fecha
  }

  try {
    isSubmitting.value = true
    await api.post('/materiales/movimientos', {
      movimientos: [movimiento]
    })

    await loadData()
    if (puedeVerTabla.value) {
      await loadMovimientos()
    }
    showSnackbar('Movimiento registrado correctamente.', 'success')
    closeDialog()
  } catch (error) {
    const message = error.response?.data?.message || 'No se pudo registrar el movimiento.'
    showSnackbar(message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const logout = () => {
  localStorage.removeItem('currentUser')
  currentUser.value = null
  movimientosData.value = []
  showDialog.value = false
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.dashboard-background {
  min-height: 100vh;
  background: linear-gradient(180deg, #edf3ff 0%, #f7f9ff 100%);
}

.v-container {
  max-width: 1280px;
}

.hero-surface {
  background: linear-gradient(135deg, rgba(24, 103, 192, 0.12), rgba(24, 103, 192, 0));
  border: 1px solid rgba(24, 103, 192, 0.16);
  border-radius: 24px;
}

.hero-header {
  width: 100%;
}

.hero-copy h1 {
  color: #0b3d91;
}

.hero-actions {
  gap: 12px;
}

.hero-actions .v-btn {
  min-width: 180px;
}

.content-card {
  border-radius: 22px;
  border: 1px solid rgba(15, 59, 126, 0.08);
  background: #ffffff;
  box-shadow: 0 24px 48px rgba(15, 59, 126, 0.08);
}

.movimientos-table :deep(thead th) {
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.refresh-btn {
  color: #1867c0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.stat-tile {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
}

.last-movement-tile {
  padding: 18px;
  background: rgba(24, 103, 192, 0.05);
  border-radius: 18px;
}

.tips-list :deep(.v-list-item) {
  border-radius: 16px;
  padding-block: 6px;
}

.tips-list :deep(.v-list-item:hover) {
  background: rgba(24, 103, 192, 0.08);
}

.dialog-card {
  border-radius: 22px;
}

.input-field :deep(.v-field__overlay) {
  background-color: rgba(242, 247, 255, 0.85);
  border-radius: 14px;
  transition: background-color 0.3s ease;
}

.input-field :deep(.v-field__outline) {
  border-radius: 14px;
  border-color: rgba(24, 103, 192, 0.2);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.input-field :deep(.v-field--focused .v-field__overlay) {
  background-color: rgba(222, 237, 255, 0.85);
}

.input-field :deep(.v-field--focused .v-field__outline) {
  border-color: #1867c0;
  box-shadow: 0 0 0 3px rgba(24, 103, 192, 0.18);
}

.submit-btn {
  font-weight: 600;
  letter-spacing: 0.5px;
}

.submit-btn:disabled {
  opacity: 0.55;
}

.snackbar-elevated {
  font-weight: 600;
}

@media (max-width: 1024px) {
  .hero-actions .v-btn {
    min-width: unset;
    flex: 1 1 100%;
  }
}

@media (max-width: 600px) {
  .hero-surface {
    padding: 24px !important;
  }

  .content-card {
    border-radius: 18px;
  }
}
</style>
