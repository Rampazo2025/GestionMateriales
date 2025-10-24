const ExcelJS = require('exceljs');
const { pool } = require('../config/db');

const listMateriales = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM materiales ORDER BY nombre ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error querying materiales', error);
    res.status(500).json({ message: 'Error loading materiales data' });
  }
};

const listMovimientos = async (req, res) => {
  const { cargo, supervisor } = req.query;

  if (cargo === 'empleado') {
    return res.status(403).json({ message: 'No tienes permisos para ver los movimientos.' });
  }

  try {
    const whereParts = [];
    const params = [];

    if (cargo === 'supervisor') {
      if (!supervisor) {
        return res.status(400).json({ message: 'Debes indicar el supervisor para filtrar los movimientos.' });
      }

      params.push(supervisor);
      whereParts.push(`mv.supervisor = $${params.length}`);
    }

    const baseQuery = `
      SELECT
        mv.id,
        mv.fecha_movimiento,
        mv.proyecto,
        mv.tecnico,
        mv.numero_movil,
        mv.cantidad,
        mv.tipo,
        mv.supervisor,
        mat.nombre AS material,
        mat.medida
      FROM movimientos_materiales mv
      INNER JOIN materiales mat ON mat.id = mv.material_id
    `;

    const filters = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const order = 'ORDER BY mv.fecha_movimiento DESC, mv.id DESC';
    const query = `${baseQuery} ${filters} ${order}`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error consultando movimientos de materiales', error);
    res.status(500).json({ message: 'Error al cargar los movimientos de materiales' });
  }
};

const registerMovimientos = async (req, res) => {
  const { movimientos } = req.body || {};

  if (!Array.isArray(movimientos) || movimientos.length === 0) {
    return res.status(400).json({ message: 'Debes enviar al menos un movimiento válido.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updatedMateriales = [];
    const movimientosRegistrados = [];

    for (const movimiento of movimientos) {
      const materialId = Number(movimiento?.materialId);
      const tipo = movimiento?.tipo;
      const cantidad = Number(movimiento?.cantidad);
      const tecnico = movimiento?.tecnico ?? null;
      const proyecto = movimiento?.proyecto ?? null;
      const numeroMovil = movimiento?.numeroMovil ?? null;
      const supervisor = movimiento?.supervisor ?? null;
      const fechaMovimientoRaw = movimiento?.fecha ?? null;
      const fechaMovimiento = fechaMovimientoRaw ? new Date(fechaMovimientoRaw) : null;

      if (!Number.isInteger(materialId) || materialId <= 0) {
        throw new Error('ID de material inválido');
      }

      if (!['entrada', 'salida'].includes(tipo)) {
        throw new Error('Tipo de movimiento inválido');
      }

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error('Cantidad de movimiento inválida');
      }

      const { rows: currentRows } = await client.query(
        'SELECT id, stock_actual FROM materiales WHERE id = $1 FOR UPDATE',
        [materialId]
      );

      if (currentRows.length === 0) {
        throw new Error(`Material con id ${materialId} no encontrado`);
      }

      const currentStock = Number(currentRows[0].stock_actual) || 0;
      const deltaStock = tipo === 'entrada' ? cantidad : -cantidad;
      const newStock = currentStock + deltaStock;

      if (newStock < 0) {
        throw new Error(`Stock insuficiente para el material con id ${materialId}`);
      }

      const salidaIncrement = tipo === 'salida' ? cantidad : 0;

      const updateResult = await client.query(
        `
          UPDATE materiales
          SET stock_actual = $1,
              salida_material = salida_material + $2
          WHERE id = $3
          RETURNING *
        `,
        [newStock, salidaIncrement, materialId]
      );

      updatedMateriales.push(updateResult.rows[0]);

      const movimientoInsertResult = await client.query(
        `
          INSERT INTO movimientos_materiales (
            material_id,
            tipo,
            cantidad,
            tecnico,
            proyecto,
            numero_movil,
            supervisor,
            fecha_movimiento
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `,
        [
          materialId,
          tipo,
          cantidad,
          tecnico,
          proyecto,
          numeroMovil,
          supervisor,
          fechaMovimiento
        ]
      );

      movimientosRegistrados.push(movimientoInsertResult.rows[0]);

    }

    await client.query('COMMIT');
    res.json({ updated: updatedMateriales, movements: movimientosRegistrados });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registrando movimientos', error);

    const knownErrors = [
      'ID de material inválido',
      'Tipo de movimiento inválido',
      'Cantidad de movimiento inválida'
    ];

    if (knownErrors.includes(error.message) || error.message?.includes('no encontrado') || error.message?.includes('Stock insuficiente')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Error al registrar movimientos de materiales' });
    }
  } finally {
    client.release();
  }
};

const generateReporteExcel = async (req, res) => {
  const { cargo, supervisor } = req.query;

  if (cargo === 'empleado') {
    return res.status(403).json({ message: 'No tienes permisos para generar este reporte.' });
  }

  try {
    const whereParts = [];
    const params = [];

    if (cargo === 'supervisor') {
      if (!supervisor) {
        return res.status(400).json({ message: 'Debes indicar el supervisor para generar el reporte.' });
      }

      params.push(supervisor);
      whereParts.push(`mv.supervisor = $${params.length}`);
    }

    const baseQuery = `
      SELECT
        mv.fecha_movimiento,
        mv.proyecto,
        mv.tecnico,
        mv.numero_movil,
        mv.cantidad,
        mat.nombre AS material,
        mat.medida,
        mv.tipo,
        mv.supervisor
      FROM movimientos_materiales mv
      INNER JOIN materiales mat ON mat.id = mv.material_id
    `;

    const filters = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
    const order = 'ORDER BY mat.nombre ASC, mv.fecha_movimiento ASC, mv.id ASC';
    const query = `${baseQuery} ${filters} ${order}`;

    const { rows } = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Movimientos');

    worksheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'Proyecto', key: 'proyecto', width: 28 },
      { header: 'Técnico', key: 'tecnico', width: 24 },
      { header: 'Móvil', key: 'movil', width: 14 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Material', key: 'material', width: 28 },
      { header: 'Medidas', key: 'medida', width: 18 },
      { header: 'Entrada/Salida', key: 'tipo', width: 16 },
      { header: 'Supervisor', key: 'supervisor', width: 24 }
    ];

    const formatter = new Intl.DateTimeFormat('es-CL');

    rows.forEach(row => {
      worksheet.addRow({
        fecha: row.fecha_movimiento ? formatter.format(row.fecha_movimiento) : '',
        proyecto: row.proyecto ?? '',
        tecnico: row.tecnico ?? '',
        movil: row.numero_movil ?? '',
        cantidad: row.cantidad ?? '',
        material: row.material ?? '',
        medida: row.medida ?? '',
        tipo: row.tipo ? row.tipo.charAt(0).toUpperCase() + row.tipo.slice(1) : '',
        supervisor: row.supervisor ?? ''
      });
    });

    worksheet.getRow(1).font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_materiales.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generando reporte de materiales', error);
    res.status(500).json({ message: 'No se pudo generar el reporte de materiales' });
  }
};

module.exports = {
  listMateriales,
  listMovimientos,
  registerMovimientos,
  generateReporteExcel
};
