<template>
  <v-main class="form-background">
    <v-container class="py-10 d-flex justify-center">
      <v-card
        class="pa-6 pa-sm-8 form-card"
        color="white"
        elevation="12"
        rounded="xl"
      >
        <v-card-title class="text-h4 text-center font-weight-bold px-0 mb-2">
          Reporte de materiales
        </v-card-title>
        <v-card-subtitle class="text-center text-body-1 mb-4">
          Completa la información para generar el informe del día.
        </v-card-subtitle>

        <v-divider class="mb-4" thickness="2" color="primary" opacity="0.2"></v-divider>

        <v-snackbar
          v-model="snackbar.show"
          :color="snackbar.color"
          location="top"
          timeout="3500"
          :close-on-back="false"
          :multi-line="true"
        >
          {{ snackbar.message }}
        </v-snackbar>

        <v-form
          ref="formRef"
          class="d-flex flex-column gap-4"
          validate-on="input"
        >
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

          <v-select
            v-model="formData.supervisor"
            :items="supervisoresDisponibles"
            label="Supervisor a cargo"
            variant="outlined"
            density="comfortable"
            :rules="[rules.required]"
            class="input-field"
            prepend-inner-icon="mdi-account-tie"
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

          <v-btn
            color="primary"
            size="large"
            block
            class="mt-2 submit-btn"
            :disabled="!selectedMaterial || isSubmitting"
            @click="addMaterial"
          >
            Agregar material
          </v-btn>

          <v-row class="mt-2" dense>
            <v-col cols="12">
              <v-btn
                block
                color="primary-darken-1"
                class="submit-btn"
                :disabled="isSubmitting || generatingReport"
                @click="downloadReport"
              >
                Generar reporte
              </v-btn>
            </v-col>
          </v-row>
        </v-form>

        <v-divider class="my-6" thickness="2" color="primary" opacity="0.1"></v-divider>

      </v-card>
    </v-container>
  </v-main>
</template>

<script setup>
// Componente principal de la aplicación
import { computed, onMounted, reactive, ref } from 'vue'
import axios from 'axios'

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
    supervisor: ''
  })

  selectedMaterial.value = null
  cantidad.value = 0
  movimientoTipo.value = 'entrada'
  formRef.value?.resetValidation()
}

const isFormDirty = computed(() =>
  Object.values(formData).some(value => String(value ?? '').trim().length > 0)
    || selectedMateriales.value.length > 0
)

const isFormReady = computed(() => {
  const requiredFields = ['tecnico', 'numeroMovil', 'proyecto', 'fecha', 'supervisor']
  const requiredValid = requiredFields.every(field => rules.required(formData[field]) === true)
  const vehicleValid = rules.vehicle(formData.numeroMovil) === true
  const dateValid = rules.date(formData.fecha) === true
  return requiredValid && vehicleValid && dateValid && selectedMateriales.value.length > 0
})

const isSubmitting = ref(false)

const handleSubmit = async successMessage => {
  if (isSubmitting.value) {
    return
  }

  const isValid = await validateForm()
  if (!isValid) {
    showSnackbar('Revisa los campos obligatorios.', 'error')
    return
  }

  if (selectedMateriales.value.length === 0) {
    showSnackbar('Agrega al menos un material.', 'error')
    return
  }

  try {
    isSubmitting.value = true
    const movimientos = selectedMateriales.value.map(item => ({
      materialId: item.materialId,
      tipo: item.tipo,
      cantidad: item.cantidad
    }))

    await axios.post('http://localhost:3000/materiales/movimientos', { movimientos })
    showSnackbar(successMessage, 'success')
    await loadData()
    selectedMateriales.value = []
  } catch (error) {
    const message = error.response?.data?.message || 'No se pudo actualizar el stock.'
    showSnackbar(message, 'error')
  } finally {
    isSubmitting.value = false
  }
}

const downloadReport = async () => {
  if (generatingReport.value) {
    return
  }

  try {
    generatingReport.value = true
    const response = await axios.get('http://localhost:3000/materiales/reporte', {
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
    showSnackbar('No se pudo descargar el reporte.', 'error')
  } finally {
    generatingReport.value = false
  }
}

const onReset = () => {
  resetFormFields()
  selectedMateriales.value = []
}

const loadData = async () => {
  const [materialesResponse, usuariosResponse] = await Promise.all([
    axios.get('http://localhost:3000/materiales'),
    axios.get('http://localhost:3000/usuarios')
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

const materialHeaders = [
  { title: 'Nombre', key: 'nombre' },
  { title: 'Medida', key: 'medida' },
  { title: 'Tipo de movimiento', key: 'tipo' },
  { title: 'Cantidad', key: 'cantidad' }
]

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

    const response = await axios.get('http://localhost:3000/materiales/movimientos', { params })
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
    const response = await axios.post('http://localhost:3000/materiales/movimientos', {
      movimientos: [movimiento]
    })

    const updatedMaterial = response.data?.updated?.[0]
    const movimientoRegistrado = response.data?.movements?.[0]

    selectedMateriales.value.push({
      materialId,
      nombre: material.nombre,
      medida: material.medida,
      tipo: movimiento.tipo,
      cantidad: movimiento.cantidad,
      stockActual: updatedMaterial?.stock_actual,
      fechaMovimiento: movimientoRegistrado?.fecha_movimiento ?? formData.fecha,
      numeroMovil: movimiento.numeroMovil
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
</script>

<style scoped>
.form-background {
  min-height: 100vh;
  display: flex;
  align-items: center;
  background: radial-gradient(circle at top, rgba(24, 103, 192, 0.25), transparent 55%),
    linear-gradient(180deg, #eaf2ff 0%, #f8fbff 100%);
}

.form-card {
  width: 100%;
  max-width: 520px;
  border: 1px solid rgba(24, 103, 192, 0.25);
  box-shadow: 0 28px 60px rgba(11, 61, 145, 0.18);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 249, 255, 0.98));
}

.form-card :deep(.v-card-title),
.form-card :deep(.v-card-subtitle) {
  color: #0b3d91;
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

.outline-btn {
  font-weight: 600;
  letter-spacing: 0.25px;
}

.outline-btn:disabled {
  opacity: 0.55;
}

@media (max-width: 600px) {
  .form-card {
    padding: 24px;
  }

  .form-card :deep(.v-card-title) {
    font-size: 1.75rem;
  }
}
</style>
