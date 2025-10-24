const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'csv.csv');
const jsonPath = path.join(__dirname, 'materiales.json');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());

const headers = lines[0].split(';');

const data = [];

for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(';');
  
  const nombre = values[0] ? values[0].trim() : '';
  const medida = values[1] ? values[1].replace(/"/g, '').trim() : '';
  const caracteristicas = values[2] ? values[2].trim() : '';
  const stockActual = values[3] ? parseInt(values[3]) : 0;
  const salidaMaterial = values[4] ? parseInt(values[4]) : 0;
  const faltaMaterial = values[5] ? (values[5].toLowerCase() === 'si' || values[5].toLowerCase() === 'sí') : false;
  const cantidadFaltante = values[6] ? parseInt(values[6]) : 0;

  if (!nombre && !medida) {
    continue;
  }

  data.push({
    nombre,
    medida,
    caracteristicas,
    stock_actual: stockActual,
    salida_material: salidaMaterial,
    falta_material: faltaMaterial,
    cantidad_faltante: cantidadFaltante
  });
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
console.log(`Converted ${data.length} records to ${jsonPath}`);
