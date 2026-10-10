require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

const registrarAuditoria = async (usuarioNombre, accion, detalle) => {
    try {
        await pool.query(
            "INSERT INTO auditoria (usuario_nombre, accion, detalle) VALUES ($1, $2, $3)",
            [usuarioNombre || 'Sistema', accion, detalle]
        );
    } catch (e) {
        console.error("Error al registrar auditoría:", e.message);
    }
};

pool.connect()
    .then(async (client) => {
        console.log('✅ Conexión exitosa a PostgreSQL');
        try {
            await client.query("ALTER TABLE pagos ALTER COLUMN comprobante_url TYPE TEXT;");
            await client.query("ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_check;");
            await client.query("ALTER TABLE pagos ALTER COLUMN metodo TYPE VARCHAR(50) USING metodo::text;");
            await client.query("ALTER TYPE estado_turno ADD VALUE IF NOT EXISTS 'Ocupado';");
            await client.query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123456';");
            await client.query("ALTER TABLE pagos ADD COLUMN IF NOT EXISTS id_reserva INTEGER;");

            await client.query(`
                CREATE TABLE IF NOT EXISTS auditoria (
                    id_auditoria SERIAL PRIMARY KEY,
                    usuario_nombre VARCHAR(150),
                    accion VARCHAR(80),
                    detalle TEXT,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);

            await client.query(`
                UPDATE pagos p
                SET id_reserva = (
                    SELECT r.id_reserva 
                    FROM reservas r 
                    WHERE r.id_alumno = p.id_alumno 
                    ORDER BY r.fecha_reserva DESC 
                    LIMIT 1
                )
                WHERE p.id_reserva IS NULL;
            `);
        } catch (e) {
            console.log("Aviso en migraciones:", e.message);
        }
        client.release();
    })
    .catch(err => console.error('❌ Error de conexión a la BD:', err.stack));

// ==========================================
// 0. LOGIN
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { identificador, password, rol_deseado, solo_celular } = req.body;

        if (!identificador) {
            return res.status(400).json({ error: "Ingresa tu número de celular." });
        }

        if (!solo_celular && !password) {
            return res.status(400).json({ error: "Ingresa tu número de celular y contraseña." });
        }

        const idTexto = String(identificador).trim();
        const soloDigitos = idTexto.replace(/\D/g, '');

        if (!soloDigitos || soloDigitos.length < 6) {
            return res.status(400).json({ error: "Número de celular inválido." });
        }

        let query = `
            SELECT id_usuario, rol, nombre, apellido, telefono, estado, password 
            FROM usuarios 
            WHERE (telefono = $1 OR regexp_replace(telefono, '[^0-9]', '', 'g') = $2)
              AND estado = true
        `;
        const params = [idTexto, soloDigitos];

        if (rol_deseado) {
            query += ` AND rol = $3`;
            params.push(rol_deseado);
        } else {
            query += ` ORDER BY CASE WHEN rol = 'Administrador' THEN 1 WHEN rol = 'Profesor' THEN 2 ELSE 3 END ASC`;
        }

        const consulta = await pool.query(query, params);

        if (consulta.rows.length === 0) {
            return res.status(401).json({ error: "Número no registrado en el padrón o usuario inactivo." });
        }

        const usuario = consulta.rows[0];

        if (solo_celular) {
            if (usuario.rol !== 'Alumno') {
                return res.status(403).json({ error: "Las cuentas de Docente y Administrador deben usar la plataforma Web con contraseña." });
            }
        } else {
            if (usuario.password && usuario.password !== password) {
                return res.status(401).json({ error: "Contraseña incorrecta." });
            }
        }

        delete usuario.password;
        res.json({ mensaje: "Acceso concedido", usuario });
    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ error: "Error interno en login" });
    }
});

// ==========================================
// 1. AUDITORÍA
// ==========================================
app.get('/api/auditoria', async (req, res) => {
    try {
        const resultado = await pool.query(
            `SELECT 
                id_auditoria,
                usuario_nombre,
                accion,
                detalle,
                TO_CHAR(fecha_creacion, 'YYYY-MM-DD HH24:MI:SS') AS fecha
             FROM auditoria 
             ORDER BY fecha_creacion DESC 
             LIMIT 150`
        );
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener historial de auditoría" });
    }
});

// VACIAR TODA LA BITÁCORA DE AUDITORÍA
app.delete('/api/auditoria/todos', async (req, res) => {
    try {
        const autor = req.query.autor || 'Administrador';
        await pool.query("TRUNCATE TABLE auditoria RESTART IDENTITY");
        await registrarAuditoria(autor, 'Limpieza Auditoría', 'Se vació el historial completo de la bitácora de eventos.');
        res.json({ mensaje: "Historial de auditoría vaciado con éxito" });
    } catch (err) {
        res.status(500).json({ error: "Error al vaciar bitácora de auditoría" });
    }
});

// ==========================================
// 2. USUARIOS
// ==========================================
app.get('/api/usuarios', async (req, res) => {
    try {
        const todos = await pool.query("SELECT id_usuario, rol, nombre, apellido, telefono, estado, fecha_registro FROM usuarios ORDER BY fecha_registro DESC");
        res.json(todos.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
});

app.post('/api/usuarios', async (req, res) => {
    try {
        const { rol, nombre, apellido, telefono, password, autor } = req.body;
        const clave = password || '123456';
        const nuevo = await pool.query(
            "INSERT INTO usuarios (rol, nombre, apellido, telefono, password) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario, rol, nombre, apellido, telefono, estado",
            [rol, nombre, apellido, telefono, clave]
        );
        
        await registrarAuditoria(
            autor || 'Administrador',
            'Crear Usuario',
            `Registró a ${nombre} ${apellido} como ${rol} (Cel: ${telefono})`
        );

        res.json(nuevo.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error interno al crear usuario" });
    }
});

app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { rol, nombre, apellido, telefono, estado, password, autor } = req.body;
        let query = "UPDATE usuarios SET rol = $1, nombre = $2, apellido = $3, telefono = $4, estado = COALESCE($5, estado)";
        const params = [rol, nombre, apellido, telefono, estado];

        if (password) {
            params.push(password);
            query += `, password = $${params.length}`;
        }
        params.push(id);
        query += ` WHERE id_usuario = $${params.length} RETURNING id_usuario, rol, nombre, apellido, telefono, estado`;

        const actualizado = await pool.query(query, params);

        await registrarAuditoria(
            autor || 'Administrador',
            'Actualizar Usuario',
            `Modificó datos de ${nombre} ${apellido} (${rol}) - Estado: ${estado ? 'Activo' : 'Inactivo'}`
        );

        res.json(actualizado.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error interno al actualizar" });
    }
});

app.delete('/api/usuarios/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const autor = req.query.autor || 'Administrador';

        const uInfo = await client.query("SELECT nombre, apellido, rol FROM usuarios WHERE id_usuario = $1", [id]);
        const datosU = uInfo.rows[0];

        await client.query('BEGIN');
        await client.query("DELETE FROM pagos WHERE id_alumno = $1", [id]);
        await client.query("DELETE FROM reservas WHERE id_alumno = $1", [id]);
        await client.query("DELETE FROM horarios WHERE id_profesor = $1", [id]);
        await client.query("DELETE FROM usuarios WHERE id_usuario = $1", [id]);
        await client.query('COMMIT');

        if (datosU) {
            await registrarAuditoria(
                autor,
                'Eliminar Usuario',
                `Eliminó a ${datosU.nombre} ${datosU.apellido} (${datosU.rol}) del sistema`
            );
        }

        res.json({ mensaje: "Usuario y registros asociados eliminados correctamente" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: `Error al eliminar usuario: ${err.message}` });
    } finally {
        client.release();
    }
});

// ==========================================
// 3. HORARIOS
// ==========================================
app.get('/api/horarios', async (req, res) => {
    try {
        const consulta = `
            SELECT 
                h.id_horario,
                h.id_profesor,
                h.modalidad,
                h.capacidad_max,
                TO_CHAR(h.fecha, 'YYYY-MM-DD') AS fecha,
                h.hora_inicio,
                h.hora_fin,
                h.estado,
                u.nombre AS profesor_nombre,
                u.apellido AS profesor_apellido
            FROM horarios h
            LEFT JOIN usuarios u ON h.id_profesor = u.id_usuario
            ORDER BY h.fecha ASC, h.hora_inicio ASC
        `;
        const horarios = await pool.query(consulta);
        res.json(horarios.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener los horarios" });
    }
});

app.post('/api/horarios', async (req, res) => {
    try {
        const { id_profesor, modalidad, capacidad_max, fecha, hora_inicio, hora_fin, autor } = req.body;
        const cruce = await pool.query(
            `SELECT * FROM horarios 
             WHERE id_profesor = $1 AND fecha = $2 
               AND (hora_inicio < $4 AND hora_fin > $3)`,
            [id_profesor, fecha, hora_inicio, hora_fin]
        );
        if (cruce.rows.length > 0) {
            return res.status(400).json({ error: "Conflicto: El profesor ya tiene clase asignada en este bloque." });
        }
        const nuevo = await pool.query(
            "INSERT INTO horarios (id_profesor, modalidad, capacidad_max, fecha, hora_inicio, hora_fin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [id_profesor, modalidad, capacidad_max, fecha, hora_inicio, hora_fin]
        );

        await registrarAuditoria(
            autor || 'Administrador',
            'Crear Horario',
            `Publicó turno ${modalidad} para el ${fecha} de ${hora_inicio.slice(0,5)} a ${hora_fin.slice(0,5)}`
        );

        res.json(nuevo.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error al registrar clase" });
    }
});

app.delete('/api/horarios/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const autor = req.query.autor || 'Administrador';

        const hInfo = await client.query(
            `SELECT h.fecha, h.hora_inicio, h.hora_fin, h.modalidad, u.nombre AS profesor_nombre 
             FROM horarios h LEFT JOIN usuarios u ON h.id_profesor = u.id_usuario 
             WHERE h.id_horario = $1`, 
            [id]
        );
        const datosH = hInfo.rows[0];

        await client.query('BEGIN');
        const resQuery = await client.query("SELECT id_reserva FROM reservas WHERE id_horario = $1", [id]);
        const idsReservas = resQuery.rows.map(r => r.id_reserva);

        if (idsReservas.length > 0) {
            await client.query("UPDATE pagos SET id_reserva = NULL WHERE id_reserva = ANY($1)", [idsReservas]);
            await client.query("DELETE FROM reservas WHERE id_horario = $1", [id]);
        }

        await client.query("DELETE FROM horarios WHERE id_horario = $1", [id]);
        await client.query('COMMIT');

        if (datosH) {
            const fStr = datosH.fecha ? String(datosH.fecha).split('T')[0] : '';
            await registrarAuditoria(
                autor,
                'Eliminar Horario',
                `Eliminó turno ${datosH.modalidad} del ${fStr} (${datosH.hora_inicio?.slice(0,5)} - ${datosH.hora_fin?.slice(0,5)}) con Prof. ${datosH.profesor_nombre || 'Asignado'}`
            );
        }

        res.json({ mensaje: "Clase y cupos liberados eliminados con éxito" });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: `Error al eliminar horario: ${err.message}` });
    } finally {
        client.release();
    }
});

// ==========================================
// 4. PAGOS
// ==========================================
app.get('/api/pagos', async (req, res) => {
    try {
        const consulta = `
            SELECT 
                p.id_pago,
                p.id_alumno,
                p.id_reserva,
                p.monto,
                p.metodo,
                p.comprobante_url,
                p.estado,
                TO_CHAR(p.fecha_pago, 'YYYY-MM-DD HH24:MI') AS fecha_pago,
                COALESCE(u.nombre, 'Alumno') AS alumno_nombre,
                COALESCE(u.apellido, 'Registrado') AS alumno_apellido,
                COALESCE(u.telefono, 'Sin teléfono') AS alumno_telefono
            FROM pagos p
            LEFT JOIN usuarios u ON p.id_alumno = u.id_usuario
            ORDER BY p.fecha_pago DESC
        `;
        const pagos = await pool.query(consulta);
        res.json(pagos.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener pagos" });
    }
});

app.post('/api/pagos', async (req, res) => {
    try {
        const { id_alumno, id_reserva, monto, metodo, comprobante_url, estado, autor } = req.body;
        const estadoFinal = estado || 'Pendiente';
        const comprobanteFinal = comprobante_url || (metodo === 'Efectivo' ? 'Pago presencial en counter' : 'Comprobante Digital');
        
        let idReservaFinal = id_reserva && !isNaN(Number(id_reserva)) ? Number(id_reserva) : null;

        if (!idReservaFinal) {
            const buscarRes = await pool.query(`
                SELECT r.id_reserva 
                FROM reservas r 
                LEFT JOIN pagos p ON r.id_reserva = p.id_reserva
                WHERE r.id_alumno = $1 AND r.activa = true AND p.id_pago IS NULL
                ORDER BY r.fecha_reserva ASC 
                LIMIT 1
            `, [id_alumno]);

            if (buscarRes.rows.length > 0) {
                idReservaFinal = buscarRes.rows[0].id_reserva;
            }
        }

        const nuevoPago = await pool.query(
            "INSERT INTO pagos (id_alumno, id_reserva, monto, metodo, comprobante_url, estado) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [id_alumno, idReservaFinal, parseFloat(monto || 0), String(metodo), comprobanteFinal, estadoFinal]
        );

        const aInfo = await pool.query("SELECT nombre, apellido FROM usuarios WHERE id_usuario = $1", [id_alumno]);
        const nombreAlum = aInfo.rows.length > 0 ? `${aInfo.rows[0].nombre} ${aInfo.rows[0].apellido}` : 'Alumno';

        await registrarAuditoria(
            autor || nombreAlum,
            'Registrar Pago',
            `Abonó S/ ${parseFloat(monto || 0).toFixed(2)} por ${metodo} (Estado: ${estadoFinal})`
        );

        res.json(nuevoPago.rows[0]);
    } catch (err) {
        res.status(500).json({ error: `Error en BD: ${err.message}` });
    }
});

app.put('/api/pagos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, autor } = req.body;
        const actualizado = await pool.query(
            "UPDATE pagos SET estado = $1 WHERE id_pago = $2 RETURNING *",
            [estado, id]
        );

        const p = actualizado.rows[0];
        const aInfo = await pool.query("SELECT nombre, apellido FROM usuarios WHERE id_usuario = $1", [p.id_alumno]);
        const nombreAlum = aInfo.rows.length > 0 ? `${aInfo.rows[0].nombre} ${aInfo.rows[0].apellido}` : 'Alumno';

        await registrarAuditoria(
            autor || 'Administrador',
            `${estado === 'Confirmado' ? 'Confirmar' : estado === 'Rechazado' ? 'Rechazar' : 'Modificar'} Pago`,
            `Marcó como "${estado}" el abono de S/ ${parseFloat(p.monto).toFixed(2)} (${p.metodo}) de ${nombreAlum}`
        );

        res.json(actualizado.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error al actualizar pago" });
    }
});

// VACIAR TODO EL HISTORIAL DE PAGOS (CIERRE DE MES)
app.delete('/api/pagos/todos', async (req, res) => {
    try {
        const autor = req.query.autor || 'Administrador';
        await pool.query("DELETE FROM pagos");
        await registrarAuditoria(
            autor,
            'Cierre de Finanzas',
            'Se limpió y vació el historial completo de pagos y transacciones.'
        );
        res.json({ mensaje: "Historial de pagos limpiado con éxito" });
    } catch (err) {
        res.status(500).json({ error: "Error al vaciar los pagos" });
    }
});

app.delete('/api/pagos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const autor = req.query.autor || 'Administrador';

        const pInfo = await pool.query(
            `SELECT p.monto, p.metodo, u.nombre, u.apellido 
             FROM pagos p LEFT JOIN usuarios u ON p.id_alumno = u.id_usuario 
             WHERE p.id_pago = $1`,
            [id]
        );
        const p = pInfo.rows[0];

        const resultado = await pool.query("DELETE FROM pagos WHERE id_pago = $1 RETURNING *", [id]);
        if (resultado.rows.length === 0) {
            return res.status(404).json({ error: "El registro de pago no existe." });
        }

        if (p) {
            await registrarAuditoria(
                autor,
                'Eliminar Pago',
                `Eliminó del historial el pago de S/ ${parseFloat(p.monto).toFixed(2)} (${p.metodo}) de ${p.nombre} ${p.apellido}`
            );
        }

        res.json({ mensaje: "Pago eliminado con éxito" });
    } catch (err) {
        res.status(500).json({ error: "Error al eliminar pago" });
    }
});

// ==========================================
// 5. RESERVAS
// ==========================================
app.get('/api/reservas', async (req, res) => {
    try {
        const consulta = `
            SELECT 
                r.id_reserva,
                r.id_alumno,
                r.id_horario,
                r.estado_asistencia,
                r.activa,
                TO_CHAR(r.fecha_reserva, 'YYYY-MM-DD HH24:MI') AS fecha_reserva,
                u.nombre AS alumno_nombre,
                u.apellido AS alumno_apellido,
                u.telefono AS alumno_telefono,
                TO_CHAR(h.fecha, 'YYYY-MM-DD') AS clase_fecha,
                h.hora_inicio,
                h.hora_fin,
                h.modalidad,
                h.id_profesor,
                p.nombre AS profesor_nombre,
                p.apellido AS profesor_apellido,
                COALESCE(pago.estado, NULL) AS estado_pago,
                COALESCE(pago.metodo, NULL) AS metodo_pago,
                COALESCE(pago.monto, NULL) AS monto_pago
            FROM reservas r
            JOIN usuarios u ON r.id_alumno = u.id_usuario
            JOIN horarios h ON r.id_horario = h.id_horario
            LEFT JOIN usuarios p ON h.id_profesor = p.id_usuario
            LEFT JOIN LATERAL (
                SELECT estado, metodo, monto 
                FROM pagos 
                WHERE pagos.id_reserva = r.id_reserva 
                ORDER BY pagos.id_pago DESC 
                LIMIT 1
            ) pago ON true
            WHERE r.activa = true
            ORDER BY h.fecha ASC, h.hora_inicio ASC
        `;
        const resultado = await pool.query(consulta);
        res.json(resultado.rows);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener reservas" });
    }
});

app.post('/api/reservas', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id_alumno, id_horario, id_companero, autor } = req.body;
        await client.query('BEGIN');

        if (id_companero && String(id_alumno) === String(id_companero)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "No puedes seleccionarte a ti mismo como compañero." });
        }

        const yaInscrito = await client.query(
            "SELECT id_reserva FROM reservas WHERE id_alumno = $1 AND id_horario = $2 AND activa = true",
            [id_alumno, id_horario]
        );
        if (yaInscrito.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "Ya te encuentras registrado en esta clase." });
        }

        const horarioQuery = await client.query(
            "SELECT capacidad_max, modalidad, estado, fecha, hora_inicio, hora_fin FROM horarios WHERE id_horario = $1 FOR UPDATE",
            [id_horario]
        );
        const horario = horarioQuery.rows[0];

        const reservasActuales = await client.query(
            "SELECT COUNT(*) FROM reservas WHERE id_horario = $1 AND activa = true",
            [id_horario]
        );
        const totalInscritos = parseInt(reservasActuales.rows[0].count, 10);
        const cuposNecesarios = id_companero ? 2 : 1;

        if (horario.modalidad !== 'Otros' && (totalInscritos + cuposNecesarios) > horario.capacidad_max) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: "No hay cupos libres suficientes." });
        }

        const nuevaReserva = await client.query(
            "INSERT INTO reservas (id_alumno, id_horario, estado_asistencia, activa) VALUES ($1, $2, 'Pendiente', true) RETURNING *",
            [id_alumno, id_horario]
        );

        let reservaCompanero = null;
        if (id_companero) {
            const resComp = await client.query(
                "INSERT INTO reservas (id_alumno, id_horario, estado_asistencia, activa) VALUES ($1, $2, 'Pendiente', true) RETURNING *",
                [id_companero, id_horario]
            );
            reservaCompanero = resComp.rows[0];
        }

        if (horario.modalidad !== 'Otros' && (totalInscritos + cuposNecesarios) >= horario.capacidad_max) {
            await client.query("UPDATE horarios SET estado = 'Ocupado' WHERE id_horario = $1", [id_horario]);
        }

        await client.query('COMMIT');

        const a1 = await pool.query("SELECT nombre, apellido FROM usuarios WHERE id_usuario = $1", [id_alumno]);
        const nombreA1 = a1.rows[0] ? `${a1.rows[0].nombre} ${a1.rows[0].apellido}` : 'Alumno';
        const fStr = horario.fecha ? String(horario.fecha).split('T')[0] : '';

        await registrarAuditoria(
            autor || nombreA1,
            'Inscribir Alumno',
            `Agendó a ${nombreA1} para el turno ${fStr} (${horario.hora_inicio?.slice(0,5)} - ${horario.hora_fin?.slice(0,5)})`
        );

        res.json({ 
            mensaje: "Reserva completada",
            reserva: nuevaReserva.rows[0],
            reservaCompanero
        });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: `Error en BD: ${err.message}` });
    } finally {
        client.release();
    }
});

app.put('/api/reservas/:id/asistencia', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado_asistencia, autor } = req.body;
        const resultado = await pool.query(
            "UPDATE reservas SET estado_asistencia = $1 WHERE id_reserva = $2 RETURNING *",
            [estado_asistencia, id]
        );

        const rInfo = await pool.query(
            `SELECT u.nombre, u.apellido, h.fecha, h.hora_inicio 
             FROM reservas r 
             JOIN usuarios u ON r.id_alumno = u.id_usuario 
             JOIN horarios h ON r.id_horario = h.id_horario 
             WHERE r.id_reserva = $1`,
            [id]
        );
        const r = rInfo.rows[0];
        if (r) {
            const fStr = r.fecha ? String(r.fecha).split('T')[0] : '';
            await registrarAuditoria(
                autor || 'Profesor',
                'Marcar Asistencia',
                `Registró "${estado_asistencia}" para ${r.nombre} ${r.apellido} en clase del ${fStr} ${r.hora_inicio?.slice(0,5)}`
            );
        }

        res.json(resultado.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Error al registrar asistencia" });
    }
});

app.delete('/api/reservas/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const autor = req.query.autor || 'Administrador';

        const rInfo = await client.query(
            `SELECT u.nombre, u.apellido, h.fecha, h.hora_inicio, r.id_horario 
             FROM reservas r 
             JOIN usuarios u ON r.id_alumno = u.id_usuario 
             JOIN horarios h ON r.id_horario = h.id_horario 
             WHERE r.id_reserva = $1`,
            [id]
        );
        const r = rInfo.rows[0];

        await client.query('BEGIN');
        if (r) {
            await client.query("UPDATE pagos SET id_reserva = NULL WHERE id_reserva = $1", [id]);
            await client.query("DELETE FROM reservas WHERE id_reserva = $1", [id]);
            await client.query("UPDATE horarios SET estado = 'Disponible' WHERE id_horario = $1", [r.id_horario]);
        }
        await client.query('COMMIT');

        if (r) {
            const fStr = r.fecha ? String(r.fecha).split('T')[0] : '';
            await registrarAuditoria(
                autor,
                'Cancelar Reserva',
                `Liberó cupo de ${r.nombre} ${r.apellido} para el turno del ${fStr} ${r.hora_inicio?.slice(0,5)}`
            );
        }

        res.json({ mensaje: "Reserva cancelada con éxito." });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: `Error al cancelar la reserva: ${err.message}` });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});