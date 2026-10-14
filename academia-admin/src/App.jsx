import { useState, useEffect, useCallback } from 'react'

const API_URL = 'https://academia-marinera.onrender.com';

const BLOQUES_HORARIOS = (() => {
  const bloques = [];
  let inicioMin = 6 * 60;
  const finLimite = 22 * 60;

  while (inicioMin + 45 <= finLimite) {
    const hIni = String(Math.floor(inicioMin / 60)).padStart(2, '0');
    const mIni = String(inicioMin % 60).padStart(2, '0');
    const finBloque = inicioMin + 45;
    const hFin = String(Math.floor(finBloque / 60)).padStart(2, '0');
    const mFin = String(finBloque % 60).padStart(2, '0');

    bloques.push({
      etiqueta: `${hIni}:${mIni} - ${hFin}:${mFin}`,
      hora_inicio: `${hIni}:${mIni}:00`,
      hora_fin: `${hFin}:${mFin}:00`
    });
    inicioMin += 45;
  }
  return bloques;
})();

function CalendarioSelector({ fechaSeleccionada, alSeleccionarFecha }) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaInicial = fechaSeleccionada ? new Date(fechaSeleccionada + 'T00:00:00') : new Date();
  const [mesVista, setMesVista] = useState(fechaInicial.getMonth());
  const [anioVista, setAnioVista] = useState(fechaInicial.getFullYear());
  const [abierto, setAbierto] = useState(false);

  const NOMBRES_MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const formatearTextoFecha = (strFecha) => {
    if (!strFecha) return 'Seleccionar fecha...';
    const partes = strFecha.split('-');
    if (partes.length !== 3) return strFecha;
    const [y, m, d] = partes.map(Number);
    const objFecha = new Date(y, m - 1, d);
    const opciones = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    return objFecha.toLocaleDateString('es-ES', opciones);
  };

  const cambiarMes = (delta) => {
    let nuevoMes = mesVista + delta;
    let nuevoAnio = anioVista;
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAnio--;
    } else if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAnio++;
    }
    setMesVista(nuevoMes);
    setAnioVista(nuevoAnio);
  };

  const primerDiaMes = new Date(anioVista, mesVista, 1).getDay();
  const offsetLunes = (primerDiaMes + 6) % 7;
  const totalDiasMes = new Date(anioVista, mesVista + 1, 0).getDate();

  const dias = [];
  for (let i = 0; i < offsetLunes; i++) dias.push(null);
  for (let dia = 1; dia <= totalDiasMes; dia++) dias.push(dia);

  const seleccionarDia = (dia) => {
    const mesStr = String(mesVista + 1).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    alSeleccionarFecha(`${anioVista}-${mesStr}-${diaStr}`);
    setAbierto(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setAbierto(!abierto)}
        style={{
          padding: '11px 14px',
          borderRadius: '10px',
          border: abierto ? '2px solid #0284c7' : '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          color: fechaSeleccionada ? '#0f172a' : '#64748b',
          fontSize: '13px',
          fontWeight: fechaSeleccionada ? '700' : '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
          height: '42px'
        }}
      >
        <span>📅 {formatearTextoFecha(fechaSeleccionada)}</span>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{abierto ? '▲' : '▼'}</span>
      </div>

      {abierto && (
        <div
          style={{
            position: 'absolute',
            top: '108%',
            left: 0,
            zIndex: 100,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
            padding: '16px',
            width: '310px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '800' }}
            >
              ‹
            </button>
            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
              {NOMBRES_MESES[mesVista]} {anioVista}
            </div>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              style={{ backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: '800' }}
            >
              ›
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '8px' }}>
            {DIAS_SEMANA.map((diaSem, idx) => (
              <span key={idx} style={{ fontSize: '11px', fontWeight: '700', color: idx >= 5 ? '#0284c7' : '#94a3b8' }}>
                {diaSem}
              </span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
            {dias.map((dia, idx) => {
              if (!dia) return <div key={idx} />;

              const fechaDia = new Date(anioVista, mesVista, dia);
              const esPasado = fechaDia < hoy;
              const mesStr = String(mesVista + 1).padStart(2, '0');
              const diaStr = String(dia).padStart(2, '0');
              const fechaString = `${anioVista}-${mesStr}-${diaStr}`;
              const esSeleccionado = fechaSeleccionada === fechaString;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={esPasado}
                  onClick={() => seleccionarDia(dia)}
                  style={{
                    padding: '7px 0',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: esSeleccionado ? '800' : '500',
                    cursor: esPasado ? 'not-allowed' : 'pointer',
                    backgroundColor: esSeleccionado ? '#0284c7' : 'transparent',
                    color: esSeleccionado ? '#ffffff' : esPasado ? '#cbd5e1' : '#1e293b'
                  }}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarUsuario({ nombre, apellido, rol }) {
  const iniciales = `${(nombre || '').charAt(0)}${(apellido || '').charAt(0)}`.toUpperCase();
  const bg = rol === 'Profesor' ? '#e0f2fe' : rol === 'Administrador' ? '#f3e8ff' : '#f1f5f9';
  const color = rol === 'Profesor' ? '#0369a1' : rol === 'Administrador' ? '#7e22ce' : '#475569';

  return (
    <div style={{
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      backgroundColor: bg,
      color: color,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '13px',
      fontWeight: '800',
      letterSpacing: '0.5px',
      marginRight: '12px',
      flexShrink: 0
    }}>
      {iniciales || 'U'}
    </div>
  );
}

function App() {
  const [usuarioLogueado, setUsuarioLogueado] = useState(() => {
    try {
      const guardado = localStorage.getItem('sesion_academia');
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const [modoVisual, setModoVisual] = useState(() => {
    try {
      const guardado = localStorage.getItem('modo_visual_academia');
      return guardado || 'admin';
    } catch {
      return 'admin';
    }
  });

  const [sidebarColapsado, setSidebarColapsado] = useState(() => {
    try {
      return localStorage.getItem('sidebar_colapsado_academia') === 'true';
    } catch {
      return false;
    }
  });

  const alternarSidebar = () => {
    setSidebarColapsado(prev => {
      const nuevo = !prev;
      localStorage.setItem('sidebar_colapsado_academia', String(nuevo));
      return nuevo;
    });
  };

  const cambiarModoVisual = (nuevoModo) => {
    setModoVisual(nuevoModo);
    localStorage.setItem('modo_visual_academia', nuevoModo);
    if (nuevoModo === 'profesor') {
      setTabActual('horarios');
    }
  };

  const [formLogin, setFormLogin] = useState({ identificador: '', password: '' });
  const [errorLogin, setErrorLogin] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(false);

  const [tabActual, setTabActual] = useState('horarios');
  const [usuarios, setUsuarios] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [auditorias, setAuditorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [sincronizando, setSincronizando] = useState(false);

  // Candados para evitar dobles toques en iPad
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [guardandoInscripcion, setGuardandoInscripcion] = useState(false);

  const [filtroEstadoHorario, setFiltroEstadoHorario] = useState('todos');
  const [filtroPeriodoHorario, setFiltroPeriodoHorario] = useState('todos');
  const [filtroEstadoAsistencia, setFiltroEstadoAsistencia] = useState('todos');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('todos');
  const [filtroAccionAuditoria, setFiltroAccionAuditoria] = useState('todos');

  const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: 'exito' });
  const notificar = (mensaje, tipo = 'exito') => {
    setToast({ visible: true, mensaje, tipo });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3500);
  };

  const [modalVoucher, setModalVoucher] = useState({ visible: false, imagen: '', alumno: '', monto: '', metodo: '', idPago: null });
  const [modalInscribir, setModalInscribir] = useState({ visible: false, clase: null, id_alumno: '' });
  const [modalPago, setModalPago] = useState({ visible: false, id_alumno: '', metodo: 'Efectivo', monto: '50.00', comprobante: '' });
  const [modalFichaAlumno, setModalFichaAlumno] = useState({ visible: false, alumno: null });

  const [editandoId, setEditandoId] = useState(null);
  const [formUsuario, setFormUsuario] = useState({ rol: 'Alumno', nombre: '', apellido: '', telefono: '', estado: true, password: '' });

  const [formHorario, setFormHorario] = useState({
    id_profesor: '',
    modalidad: 'Individual',
    capacidad_max: 1,
    fecha: '',
    bloqueIndex: 0
  });

  const autorActual = usuarioLogueado 
    ? `${usuarioLogueado.nombre} ${usuarioLogueado.apellido} (${usuarioLogueado.rol})`
    : 'Administrador';

  // Función anticaché que fuerza a Safari en iPad a traer siempre los datos más recientes
  const cargarDatos = useCallback(async (mostrarIndicador = false) => {
    if (mostrarIndicador) setSincronizando(true);
    const ts = Date.now();
    const opcionesFetch = { cache: 'no-store' };

    try {
      const [resU, resH, resP, resR, resA] = await Promise.allSettled([
        fetch(`${API_URL}/api/usuarios?t=${ts}`, opcionesFetch).then(r => r.json()),
        fetch(`${API_URL}/api/horarios?t=${ts}`, opcionesFetch).then(r => r.json()),
        fetch(`${API_URL}/api/pagos?t=${ts}`, opcionesFetch).then(r => r.json()),
        fetch(`${API_URL}/api/reservas?t=${ts}`, opcionesFetch).then(r => r.json()),
        fetch(`${API_URL}/api/auditoria?t=${ts}`, opcionesFetch).then(r => r.json()),
      ]);

      if (resU.status === 'fulfilled' && Array.isArray(resU.value)) setUsuarios(resU.value);
      if (resH.status === 'fulfilled' && Array.isArray(resH.value)) setHorarios(resH.value);
      if (resP.status === 'fulfilled' && Array.isArray(resP.value)) setPagos(resP.value);
      if (resR.status === 'fulfilled' && Array.isArray(resR.value)) setReservas(resR.value);
      if (resA.status === 'fulfilled' && Array.isArray(resA.value)) setAuditorias(resA.value);
    } catch (err) {
      console.error('Error sincronizando:', err);
    } finally {
      if (mostrarIndicador) setSincronizando(false);
    }
  }, []);

  // Carga inicial + auto-sincronización cada 15s + actualización al volver de WhatsApp
  useEffect(() => {
    if (!usuarioLogueado) return;

    cargarDatos();

    const intervalo = setInterval(() => {
      cargarDatos(false);
    }, 15000);

    const alRecuperarFoco = () => {
      if (document.visibilityState === 'visible') {
        cargarDatos(false);
      }
    };

    window.addEventListener('focus', alRecuperarFoco);
    document.addEventListener('visibilitychange', alRecuperarFoco);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', alRecuperarFoco);
      document.removeEventListener('visibilitychange', alRecuperarFoco);
    };
  }, [usuarioLogueado, cargarDatos]);

  // Recargar automáticamente al cambiar de pestaña en el menú lateral
  const cambiarTab = (nuevoTab) => {
    setTabActual(nuevoTab);
    setBusqueda('');
    cargarDatos(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    setCargandoLogin(true);

    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formLogin)
      });
      const data = await res.json();

      if (res.ok && data.usuario) {
        setUsuarioLogueado(data.usuario);
        localStorage.setItem('sesion_academia', JSON.stringify(data.usuario));
        if (data.usuario.rol === 'Profesor') {
          setModoVisual('profesor');
          localStorage.setItem('modo_visual_academia', 'profesor');
        } else {
          setModoVisual('admin');
          localStorage.setItem('modo_visual_academia', 'admin');
        }
        setTabActual('horarios');
      } else {
        setErrorLogin(data.error || 'Credenciales inválidas.');
      }
    } catch {
      setErrorLogin('Error al conectar con el servidor.');
    } finally {
      setCargandoLogin(false);
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('sesion_academia');
    localStorage.removeItem('modo_visual_academia');
    setUsuarioLogueado(null);
    setFormLogin({ identificador: '', password: '' });
  };

  const formatearFechaTabla = (fechaStr) => {
    if (!fechaStr) return '';
    const partes = fechaStr.split('T')[0].split('-');
    if (partes.length !== 3) return fechaStr;
    const [y, m, d] = partes.map(Number);
    const fecha = new Date(y, m - 1, d);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${dias[fecha.getDay()]} ${d} ${meses[m - 1]} ${y}`;
  };

  const handleCambioModalidad = (nuevaModalidad) => {
    let capacidad = 1;
    if (nuevaModalidad === 'Individual') capacidad = 1;
    else if (nuevaModalidad === 'Pareja' || nuevaModalidad === 'Clase Compartida') capacidad = 2;
    else if (nuevaModalidad === 'Grupal') capacidad = 8;
    else if (nuevaModalidad === 'Otros') capacidad = 999;

    setFormHorario({ ...formHorario, modalidad: nuevaModalidad, capacidad_max: capacidad });
  };

  const abrirWhatsApp = (telefono, mensaje) => {
    if (!telefono) {
      notificar('El alumno no tiene teléfono registrado', 'error');
      return;
    }

    const telTexto = String(telefono).trim();
    let telFinal = '';

    if (telTexto.startsWith('+')) {
      telFinal = telTexto.replace(/\D/g, '');
    } else {
      const soloNumeros = telTexto.replace(/\D/g, '');
      if (soloNumeros.length === 9) {
        telFinal = `51${soloNumeros}`;
      } else {
        telFinal = soloNumeros;
      }
    }

    const url = `https://wa.me/${telFinal}?text=${encodeURIComponent(mensaje)}`;

    const esDispositivoApple = 
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (esDispositivoApple) {
      setTimeout(() => {
        window.location.href = url;
      }, 150);
    } else {
      const ventana = window.open(url, '_blank');
      if (!ventana || ventana.closed || typeof ventana.closed === 'undefined') {
        window.location.href = url;
      }
    }
  };

  const exportarCSV = (filas, columnas, nombreArchivo) => {
    if (!filas || filas.length === 0) {
      notificar('No hay registros para exportar', 'error');
      return;
    }

    const encabezados = columnas.map(c => `"${c.titulo}"`).join(';');
    const lineas = filas.map(fila => {
      return columnas.map(c => {
        const val = typeof c.obtener === 'function' ? c.obtener(fila) : fila[c.campo];
        return `"${String(val ?? '').replace(/"/g, '""')}"`;
      }).join(';');
    });

    const csvContenido = '\uFEFF' + [encabezados, ...lineas].join('\r\n');
    const blob = new Blob([csvContenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notificar('Reporte Excel (.csv) descargado con éxito');
  };

  const vaciarHistorialPagos = async () => {
    const seguro = window.confirm(
      '⚠️ ¿Estás completamente seguro de vaciar el historial de pagos?\n\n' +
      'Asegúrate de haber exportado tu reporte en Excel primero. Esta acción reiniciará los registros financieros a cero.'
    );
    if (!seguro) return;

    try {
      const res = await fetch(`${API_URL}/api/pagos/todos?autor=${encodeURIComponent(autorActual)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPagos([]);
        await cargarDatos();
        notificar('Historial de finanzas limpiado con éxito');
      } else {
        notificar('No se pudo vaciar el historial', 'error');
      }
    } catch {
      notificar('Error de conexión al limpiar finanzas', 'error');
    }
  };

  const vaciarHistorialAuditoria = async () => {
    const seguro = window.confirm(
      '⚠️ ¿Deseas vaciar la bitácora de auditoría?\n\n' +
      'Se borrarán todos los eventos pasados para liberar espacio.'
    );
    if (!seguro) return;

    try {
      const res = await fetch(`${API_URL}/api/auditoria/todos?autor=${encodeURIComponent(autorActual)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setAuditorias([]);
        await cargarDatos();
        notificar('Bitácora de eventos vaciada');
      } else {
        notificar('No se pudo vaciar la auditoría', 'error');
      }
    } catch {
      notificar('Error al vaciar bitácora', 'error');
    }
  };

  const alternarEstadoUsuario = async (usuario) => {
    const nuevoEstado = !usuario.estado;
    // Actualización visual inmediata
    setUsuarios(prev => prev.map(u => u.id_usuario === usuario.id_usuario ? { ...u, estado: nuevoEstado } : u));

    try {
      const res = await fetch(`${API_URL}/api/usuarios/${usuario.id_usuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rol: usuario.rol,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          telefono: usuario.telefono,
          estado: nuevoEstado,
          autor: autorActual
        })
      });
      if (res.ok) {
        await cargarDatos();
        notificar(`${usuario.nombre} ahora está ${nuevoEstado ? 'Activo' : 'Inactivo'}`);
      } else {
        await cargarDatos();
        notificar('No se pudo cambiar el estado', 'error');
      }
    } catch {
      await cargarDatos();
      notificar('Error de conexión', 'error');
    }
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    if (guardandoUsuario) return;
    setGuardandoUsuario(true);

    const url = editandoId ? `${API_URL}/api/usuarios/${editandoId}` : `${API_URL}/api/usuarios`;
    const method = editandoId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formUsuario, autor: autorActual })
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (editandoId) {
          setUsuarios(prev => prev.map(u => u.id_usuario === editandoId ? { ...u, ...data } : u));
        } else if (data && data.id_usuario) {
          setUsuarios(prev => [data, ...prev]);
        }
        setFormUsuario({ rol: 'Alumno', nombre: '', apellido: '', telefono: '', estado: true, password: '' });
        setEditandoId(null);
        await cargarDatos();
        notificar(editandoId ? 'Usuario actualizado con éxito' : 'Usuario registrado con éxito');
      } else {
        notificar(data.error || 'Error al guardar usuario', 'error');
      }
    } catch {
      notificar('Error de conexión al guardar usuario', 'error');
    } finally {
      setGuardandoUsuario(false);
    }
  };

  const eliminarUsuario = async (id, nombre) => {
    if (!window.confirm(`¿Confirmas la eliminación de ${nombre}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/usuarios/${id}?autor=${encodeURIComponent(autorActual)}`, { method: 'DELETE' });
      const respuesta = await res.json().catch(() => ({}));
      if (res.ok) {
        setUsuarios(prev => prev.filter(u => u.id_usuario !== id));
        await cargarDatos();
        notificar('Usuario eliminado correctamente');
      } else {
        notificar(respuesta.error || 'Error al eliminar usuario', 'error');
      }
    } catch {
      notificar('Error de conexión con el servidor', 'error');
    }
  };

  const guardarHorario = async (e) => {
    e.preventDefault();
    if (guardandoHorario) return;

    if (!formHorario.fecha) {
      notificar('Selecciona una fecha en el calendario', 'error');
      return;
    }

    setGuardandoHorario(true);
    const bloque = BLOQUES_HORARIOS[formHorario.bloqueIndex];

    try {
      const res = await fetch(`${API_URL}/api/horarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_profesor: formHorario.id_profesor,
          modalidad: formHorario.modalidad,
          capacidad_max: Number(formHorario.capacidad_max),
          fecha: formHorario.fecha,
          hora_inicio: bloque.hora_inicio,
          hora_fin: bloque.hora_fin,
          autor: autorActual
        })
      });

      const respuesta = await res.json().catch(() => ({}));
      if (res.ok) {
        const profeObj = profesores.find(p => String(p.id_usuario) === String(formHorario.id_profesor));
        const horarioNuevo = {
          ...respuesta,
          fecha: respuesta.fecha ? String(respuesta.fecha).split('T')[0] : formHorario.fecha,
          estado: respuesta.estado || 'Disponible',
          profesor_nombre: respuesta.profesor_nombre || profeObj?.nombre || '',
          profesor_apellido: respuesta.profesor_apellido || profeObj?.apellido || ''
        };

        // Insertar inmediatamente en la tabla en vivo y limpiar filtros que puedan ocultarlo
        setHorarios(prev => [...prev, horarioNuevo]);
        setFiltroEstadoHorario('todos');
        setFiltroPeriodoHorario('todos');
        setFormHorario({ id_profesor: '', modalidad: 'Individual', capacidad_max: 1, fecha: '', bloqueIndex: 0 });

        await cargarDatos();
        notificar('Clase publicada con éxito');
      } else {
        notificar(respuesta.error || 'No se pudo registrar la clase', 'error');
      }
    } catch {
      notificar('Error al programar la clase', 'error');
    } finally {
      setGuardandoHorario(false);
    }
  };

  const eliminarHorario = async (id) => {
    if (!window.confirm('¿Deseas eliminar esta clase del calendario? Se liberarán las reservas asociadas.')) return;
    try {
      setHorarios(prev => prev.filter(h => h.id_horario !== id));
      const res = await fetch(`${API_URL}/api/horarios/${id}?autor=${encodeURIComponent(autorActual)}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarDatos();
        notificar('Clase eliminada del calendario');
      } else {
        await cargarDatos();
        notificar('No se pudo eliminar la clase', 'error');
      }
    } catch {
      await cargarDatos();
      notificar('Error al eliminar clase', 'error');
    }
  };

  const confirmarInscripcionDirecta = async () => {
    if (guardandoInscripcion) return;
    if (!modalInscribir.id_alumno) {
      notificar('Selecciona a un alumno para inscribir', 'error');
      return;
    }

    setGuardandoInscripcion(true);
    try {
      const res = await fetch(`${API_URL}/api/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_alumno: modalInscribir.id_alumno,
          id_horario: modalInscribir.clase.id_horario,
          autor: autorActual
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const alumno = usuarios.find(u => String(u.id_usuario) === String(modalInscribir.id_alumno));
        const c = modalInscribir.clase;
        setModalInscribir({ visible: false, clase: null, id_alumno: '' });
        await cargarDatos();
        notificar(`¡${alumno?.nombre || 'Alumno'} inscrito correctamente!`);

        if (alumno) {
          const nombreProfesorCompleto = c.profesor_nombre
            ? `${c.profesor_nombre} ${c.profesor_apellido || ''}`.trim()
            : 'Profesor Asignado';

          const mensajeWsp = 
`¡Hola, ${alumno.nombre}!

Tu clase de marinera ha sido agendada con éxito:

*Modalidad:* ${c.modalidad}
*Fecha:* ${formatearFechaTabla(c.fecha)}
*Horario:* ${c.hora_inicio?.slice(0, 5)} - ${c.hora_fin?.slice(0, 5)} hrs
*Profesor:* ${nombreProfesorCompleto}

*Recomendación:* Por favor llega 10 minutos antes para el calentamiento previo.

¡Nos vemos en clase! 💃`;

          abrirWhatsApp(alumno.telefono, mensajeWsp);
        }
      } else {
        notificar(data.error || 'No se pudo inscribir al alumno', 'error');
      }
    } catch {
      notificar('Error de red al procesar la inscripción', 'error');
    } finally {
      setGuardandoInscripcion(false);
    }
  };

  const registrarNuevoPago = async (e) => {
    e.preventDefault();
    if (guardandoPago) return;

    if (!modalPago.id_alumno) {
      notificar('Selecciona al alumno que realizó el pago', 'error');
      return;
    }

    setGuardandoPago(true);
    try {
      const res = await fetch(`${API_URL}/api/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_alumno: modalPago.id_alumno,
          metodo: modalPago.metodo,
          monto: parseFloat(modalPago.monto),
          comprobante_url: modalPago.comprobante || (modalPago.metodo === 'Efectivo' ? 'Pago presencial en recepción' : 'Comprobante verificado'),
          estado: 'Confirmado',
          autor: autorActual
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        // Actualizar la lista de pagos en pantalla al instante sin duplicar si ya existía
        if (data && data.id_pago) {
          setPagos(prev => {
            const yaEsta = prev.some(p => p.id_pago === data.id_pago);
            return yaEsta ? prev : [data, ...prev];
          });
        }
        setModalPago({ visible: false, id_alumno: '', metodo: 'Efectivo', monto: '50.00', comprobante: '' });
        await cargarDatos();
        notificar('Pago ingresado y registrado con éxito');
      } else {
        notificar(data.error || 'Error al registrar pago', 'error');
      }
    } catch {
      notificar('Error al conectar con el servidor', 'error');
    } finally {
      setGuardandoPago(false);
    }
  };

  const actualizarEstadoPago = async (idPago, nuevoEstado) => {
    setPagos(prev => prev.map(p => p.id_pago === idPago ? { ...p, estado: nuevoEstado } : p));
    try {
      const res = await fetch(`${API_URL}/api/pagos/${idPago}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, autor: autorActual })
      });
      if (res.ok) {
        await cargarDatos();
        notificar(`Pago marcado como ${nuevoEstado}`);
      } else {
        await cargarDatos();
        notificar('Error al actualizar estado del pago', 'error');
      }
    } catch {
      await cargarDatos();
      notificar('Error de conexión', 'error');
    }
  };

  const eliminarPago = async (idPago) => {
    if (!window.confirm('¿Deseas eliminar este registro de pago del sistema?')) return;
    try {
      setPagos(prev => prev.filter(p => p.id_pago !== idPago));
      const res = await fetch(`${API_URL}/api/pagos/${idPago}?autor=${encodeURIComponent(autorActual)}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarDatos();
        notificar('Registro de pago eliminado correctamente');
      } else {
        await cargarDatos();
        notificar('No se pudo eliminar el registro', 'error');
      }
    } catch {
      await cargarDatos();
      notificar('Error de conexión', 'error');
    }
  };

  const actualizarAsistencia = async (idReserva, estadoAsistencia) => {
    setReservas(prev => prev.map(r => r.id_reserva === idReserva ? { ...r, estado_asistencia: estadoAsistencia } : r));
    try {
      const res = await fetch(`${API_URL}/api/reservas/${idReserva}/asistencia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_asistencia: estadoAsistencia, autor: autorActual })
      });
      if (res.ok) {
        await cargarDatos();
        notificar(`Asistencia registrada: ${estadoAsistencia}`);
      } else {
        await cargarDatos();
        notificar('No se pudo guardar la asistencia', 'error');
      }
    } catch {
      await cargarDatos();
      notificar('Error de conexión', 'error');
    }
  };

  const eliminarReserva = async (idReserva) => {
    if (!window.confirm('¿Deseas cancelar y eliminar esta reserva?')) return;
    try {
      setReservas(prev => prev.filter(r => r.id_reserva !== idReserva));
      const res = await fetch(`${API_URL}/api/reservas/${idReserva}?autor=${encodeURIComponent(autorActual)}`, { method: 'DELETE' });
      if (res.ok) {
        await cargarDatos();
        notificar('Reserva cancelada y cupo liberado');
      } else {
        await cargarDatos();
      }
    } catch {
      await cargarDatos();
      notificar('Error de conexión', 'error');
    }
  };

  const esAdminReal = usuarioLogueado && usuarioLogueado.rol === 'Administrador';
  const enModoAdmin = esAdminReal && modoVisual === 'admin';
  const enModoProfesor = !enModoAdmin;

  const profesores = usuarios.filter(u => u.rol === 'Profesor' || u.rol === 'Administrador');
  const alumnos = usuarios.filter(u => u.rol === 'Alumno' && u.estado);

  const ahora = new Date();
  const yActual = ahora.getFullYear();
  const mActual = String(ahora.getMonth() + 1).padStart(2, '0');
  const dActual = String(ahora.getDate()).padStart(2, '0');

  const hoyLocalStr = `${yActual}-${mActual}-${dActual}`;
  const mesActualStr = `${yActual}-${mActual}`;

  const diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
  const inicioSemana = new Date(ahora);
  inicioSemana.setDate(ahora.getDate() - diaSemana);
  inicioSemana.setHours(0, 0, 0, 0);

  const finSemana = new Date(inicioSemana);
  finSemana.setDate(inicioSemana.getDate() + 6);
  finSemana.setHours(23, 59, 59, 999);

  const horariosFiltrados = horarios.filter(h => {
    if (enModoProfesor && usuarioLogueado.rol === 'Profesor' && String(h.id_profesor) !== String(usuarioLogueado.id_usuario)) {
      return false;
    }
    const txt = busqueda.toLowerCase();
    const profe = `${h.profesor_nombre || ''} ${h.profesor_apellido || ''}`.toLowerCase();
    const coincideTexto = (h.fecha && h.fecha.includes(txt)) || (h.modalidad && h.modalidad.toLowerCase().includes(txt)) || profe.includes(txt) || (h.estado && h.estado.toLowerCase().includes(txt));
    const coincideChip = filtroEstadoHorario === 'todos' || h.estado === filtroEstadoHorario;

    let coincidePeriodo = true;
    if (filtroPeriodoHorario === 'semana' && h.fecha) {
      const fClase = new Date(h.fecha.split('T')[0] + 'T00:00:00');
      coincidePeriodo = fClase >= inicioSemana && fClase <= finSemana;
    } else if (filtroPeriodoHorario === 'mes' && h.fecha) {
      coincidePeriodo = h.fecha.startsWith(mesActualStr);
    }

    return coincideTexto && coincideChip && coincidePeriodo;
  });

  const reservasFiltradas = reservas.filter(r => {
    if (enModoProfesor && usuarioLogueado.rol === 'Profesor' && String(r.id_profesor) !== String(usuarioLogueado.id_usuario)) {
      return false;
    }
    const txt = busqueda.toLowerCase();
    const alumno = `${r.alumno_nombre || ''} ${r.alumno_apellido || ''}`.toLowerCase();
    const coincideTexto = alumno.includes(txt) || (r.clase_fecha && r.clase_fecha.includes(txt)) || (r.estado_asistencia && r.estado_asistencia.toLowerCase().includes(txt));
    
    let coincideChip = true;
    if (filtroEstadoAsistencia === 'Asistio') {
      coincideChip = r.estado_asistencia === 'Asistio' || r.estado_asistencia === 'Asistió';
    } else if (filtroEstadoAsistencia === 'Falto') {
      coincideChip = r.estado_asistencia === 'Falto' || r.estado_asistencia === 'Faltó';
    } else if (filtroEstadoAsistencia === 'Pendiente') {
      coincideChip = r.estado_asistencia === 'Pendiente';
    }
    return coincideTexto && coincideChip;
  });

  const pagosFiltrados = pagos.filter(p => {
    const txt = busqueda.toLowerCase();
    const alumno = `${p.alumno_nombre || ''} ${p.alumno_apellido || ''}`.toLowerCase();
    const coincideTexto = alumno.includes(txt) || (p.metodo && p.metodo.toLowerCase().includes(txt));
    let coincideChip = true;
    if (filtroMetodoPago !== 'todos') {
      if (filtroMetodoPago === 'Digitales') coincideChip = p.metodo === 'Yape' || p.metodo === 'Plin';
      else coincideChip = p.metodo === filtroMetodoPago;
    }
    return coincideTexto && coincideChip;
  });

  const usuariosFiltrados = usuarios.filter(u => {
    const txt = busqueda.toLowerCase();
    const nombre = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
    return nombre.includes(txt) || (u.rol && u.rol.toLowerCase().includes(txt));
  });

  const auditoriasFiltradas = auditorias.filter(a => {
    const txt = busqueda.toLowerCase();
    const coincideTexto = (a.usuario_nombre && a.usuario_nombre.toLowerCase().includes(txt)) ||
                          (a.accion && a.accion.toLowerCase().includes(txt)) ||
                          (a.detalle && a.detalle.toLowerCase().includes(txt)) ||
                          (a.fecha && a.fecha.includes(txt));
    const coincideChip = filtroAccionAuditoria === 'todos' || a.accion === filtroAccionAuditoria;
    return coincideTexto && coincideChip;
  });

  const totalAlumnos = alumnos.length;
  const clasesDisponibles = horariosFiltrados.filter(h => h.estado === 'Disponible').length;
  const totalReservas = reservasFiltradas.length;
  const totalAsistencias = reservasFiltradas.filter(r => r.estado_asistencia === 'Asistio' || r.estado_asistencia === 'Asistió').length;

  const pagosConfirmados = pagos.filter(p => p.estado === 'Confirmado');

  const ingresosHoy = pagosConfirmados
    .filter(p => p.fecha_pago && p.fecha_pago.split(' ')[0] === hoyLocalStr)
    .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  const ingresosSemana = pagosConfirmados
    .filter(p => {
      if (!p.fecha_pago) return false;
      const partes = p.fecha_pago.split(' ')[0].split('-').map(Number);
      const fechaP = new Date(partes[0], partes[1] - 1, partes[2]);
      return fechaP >= inicioSemana && fechaP <= ahora;
    })
    .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  const ingresosMes = pagosConfirmados
    .filter(p => p.fecha_pago && p.fecha_pago.startsWith(mesActualStr))
    .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  const totalPendientesMonto = pagos
    .filter(p => p.estado === 'Pendiente')
    .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  const totalYapePlin = pagosConfirmados
    .filter(p => p.metodo === 'Yape' || p.metodo === 'Plin')
    .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  const totalEfectivo = pagosConfirmados
    .filter(p => p.metodo === 'Efectivo')
    .reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

  const inputStyle = {
    padding: '11px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    height: '42px'
  };

  if (!usuarioLogueado) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '40px 36px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '18px',
            backgroundColor: '#0284c7',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '16px',
            boxShadow: '0 10px 20px rgba(2, 132, 199, 0.3)'
          }}>
            💃
          </div>

          <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>
            Academia de Marinera
          </h2>
          <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b' }}>
            Portal del Administrador y Docentes
          </p>

          {errorLogin && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '18px',
              textAlign: 'left'
            }}>
              ⚠️ {errorLogin}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Número de Celular
              </label>
              <input
                type="text"
                placeholder="Ingresa tu número de celular..."
                required
                value={formLogin.identificador}
                onChange={(e) => setFormLogin({ ...formLogin, identificador: e.target.value })}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                Contraseña
              </label>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                required
                value={formLogin.password}
                onChange={(e) => setFormLogin({ ...formLogin, password: e.target.value })}
                style={{ ...inputStyle, width: '100%' }}
              />
              <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                💡 Clave inicial por defecto: <strong>123456</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={cargandoLogin}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: cargandoLogin ? 'wait' : 'pointer',
                marginTop: '10px',
                boxShadow: '0 6px 16px rgba(2, 132, 199, 0.35)'
              }}
            >
              {cargandoLogin ? 'Iniciando sesión...' : 'Ingresar a la Plataforma ➔'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#f8fafc', color: '#0f172a' }}>
      
      {toast.visible && (
        <div style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9999,
          backgroundColor: toast.tipo === 'exito' ? '#0f172a' : '#dc2626',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '12px',
          boxShadow: '0 14px 32px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: '700'
        }}>
          <span>{toast.tipo === 'exito' ? '✅' : '⚠️'}</span>
          <span>{toast.mensaje}</span>
        </div>
      )}

      {/* SIDEBAR LATERAL COLAPSABLE */}
      <aside style={{
        width: sidebarColapsado ? '72px' : '260px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: sidebarColapsado ? '20px 8px' : '24px 18px',
        flexShrink: 0,
        transition: 'all 0.25s ease',
        boxSizing: 'border-box'
      }}>
        <div>
          <div style={{
            display: 'flex',
            flexDirection: sidebarColapsado ? 'column' : 'row',
            alignItems: 'center',
            justifyContent: sidebarColapsado ? 'center' : 'space-between',
            paddingBottom: '20px',
            borderBottom: '1px solid #1e293b',
            marginBottom: '20px',
            gap: sidebarColapsado ? '12px' : '10px'
          }}>
            {!sidebarColapsado ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: enModoAdmin ? '#0284c7' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {enModoAdmin ? '💃' : '👟'}
                </div>
                <div>
                  <div style={{ fontWeight: '900', fontSize: '15px', letterSpacing: '-0.02em', color: '#ffffff', whiteSpace: 'nowrap' }}>ACADEMIA PRO</div>
                  <div style={{ fontSize: '11px', color: enModoAdmin ? '#38bdf8' : '#86efac', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                    {enModoAdmin ? 'MODO ADMIN' : 'MODO PISTA'}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: enModoAdmin ? '#0284c7' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}
                title={enModoAdmin ? 'Academia Pro (Admin)' : 'Academia Pro (Pista)'}
              >
                {enModoAdmin ? '💃' : '👟'}
              </div>
            )}

            <button
              type="button"
              onClick={alternarSidebar}
              title={sidebarColapsado ? "Expandir menú lateral" : "Minimizar menú lateral"}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '900',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.2s ease'
              }}
            >
              {sidebarColapsado ? '▶' : '◀'}
            </button>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { id: 'horarios', label: enModoProfesor ? 'Mis Clases Asignadas' : 'Calendario de Clases', icon: '📅', visible: true },
              { id: 'reservas', label: enModoProfesor ? 'Mi Asistencia (Pista)' : 'Control Asistencia', icon: '📋', visible: true },
              { id: 'pagos', label: 'Abonos y Finanzas', icon: '💳', visible: enModoAdmin },
              { id: 'usuarios', label: 'Directorio Personas', icon: '👥', visible: enModoAdmin },
              { id: 'auditoria', label: 'Historial y Auditoría', icon: '📜', visible: enModoAdmin },
            ].filter(item => item.visible).map(item => {
              const activo = tabActual === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => cambiarTab(item.id)}
                  title={sidebarColapsado ? item.label : ''}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarColapsado ? 'center' : 'flex-start',
                    gap: '12px',
                    padding: sidebarColapsado ? '12px 0' : '12px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: activo ? '800' : '600',
                    backgroundColor: activo ? (enModoAdmin ? '#0284c7' : '#16a34a') : 'transparent',
                    color: activo ? '#ffffff' : '#94a3b8',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    width: '100%'
                  }}
                >
                  <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                  {!sidebarColapsado && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          padding: sidebarColapsado ? '12px 6px' : '14px',
          borderRadius: '12px',
          border: '1px solid #334155',
          textAlign: sidebarColapsado ? 'center' : 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarColapsado ? 'center' : 'flex-start',
            gap: '8px',
            fontSize: '12px',
            fontWeight: '700',
            color: '#34d399'
          }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#34d399', flexShrink: 0 }}></span>
            {!sidebarColapsado && <span>Servidor En Línea</span>}
          </div>
          {!sidebarColapsado && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              {enModoAdmin ? 'Control Global y Financiero' : 'Vista Rápida para Ensayos'}
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, transition: 'all 0.25s ease' }}>
        
        {/* TOPBAR */}
        <header style={{
          backgroundColor: '#ffffff',
          padding: '14px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
            <span style={{ fontWeight: '600' }}>Plataforma</span>
            <span>›</span>
            <span style={{ fontWeight: '800', color: enModoAdmin ? '#0284c7' : '#16a34a' }}>
              {tabActual === 'horarios' && (enModoProfesor ? 'Mis Clases Asignadas' : 'Horarios y Turnos')}
              {tabActual === 'reservas' && (enModoProfesor ? 'Mi Registro de Asistencia' : 'Control de Asistencia')}
              {tabActual === 'pagos' && 'Abonos y Finanzas'}
              {tabActual === 'usuarios' && 'Directorio de Personas'}
              {tabActual === 'auditoria' && 'Historial de Cambios y Auditoría'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {esAdminReal && (
              <div style={{
                display: 'inline-flex',
                backgroundColor: '#f1f5f9',
                padding: '4px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1'
              }}>
                <button
                  type="button"
                  onClick={() => cambiarModoVisual('admin')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: enModoAdmin ? '#0284c7' : 'transparent',
                    color: enModoAdmin ? '#ffffff' : '#64748b',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>👑</span> Vista Admin
                </button>
                <button
                  type="button"
                  onClick={() => cambiarModoVisual('profesor')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: !enModoAdmin ? '#16a34a' : 'transparent',
                    color: !enModoAdmin ? '#ffffff' : '#64748b',
                    fontWeight: '800',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>👟</span> Modo Pista / iPad
                </button>
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder={`Buscar en ${tabActual}...`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{
                  ...inputStyle,
                  width: '195px',
                  paddingLeft: '34px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '11px', fontSize: '13px', color: '#94a3b8' }}>🔍</span>
            </div>

            {/* BOTÓN DE SINCRONIZACIÓN RÁPIDA (Evita tener que salir de la cuenta en iPad) */}
            <button
              type="button"
              onClick={() => {
                cargarDatos(true);
                notificar('Datos sincronizados al instante');
              }}
              title="Actualizar datos en vivo"
              style={{
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span>🔄</span> {sincronizando ? 'Actualizando...' : 'Actualizar'}
            </button>

            {/* PERFIL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: enModoAdmin ? '#0284c7' : '#16a34a', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800' }}>
                {usuarioLogueado.nombre?.charAt(0)}{usuarioLogueado.apellido?.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>
                  {usuarioLogueado.nombre} {usuarioLogueado.apellido}
                </div>
                <div style={{ fontSize: '10px', color: enModoAdmin ? '#0284c7' : '#16a34a', fontWeight: '800' }}>
                  ● {enModoAdmin ? 'Administrador' : 'Modo Docente'}
                </div>
              </div>
            </div>

            <button
              onClick={cerrarSesion}
              title="Cerrar Sesión"
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>🚪</span> Salir
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '22px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-0.02em', color: '#0f172a', margin: '0 0 4px 0' }}>
              {tabActual === 'horarios' && (enModoProfesor ? 'Mis Clases Asignadas' : 'Programación y Horarios')}
              {tabActual === 'reservas' && (enModoProfesor ? 'Control de Asistencia de mis Alumnos' : 'Control de Asistencia')}
              {tabActual === 'pagos' && 'Abonos, Finanzas y Comprobantes'}
              {tabActual === 'usuarios' && 'Directorio de Personas'}
              {tabActual === 'auditoria' && 'Registro de Seguridad y Auditoría Operativa'}
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {tabActual === 'horarios' && (enModoProfesor ? 'Consulta tus horarios programados y los cupos disponibles.' : 'Publica turnos, asigna alumnos directamente y notifícalos por WhatsApp.')}
              {tabActual === 'reservas' && 'Valida en tiempo real la llegada y estado de asistencia de cada alumno agendado.'}
              {tabActual === 'pagos' && 'Monitorea los ingresos del día, semana y mes con métodos oficiales: Yape, Plin y Efectivo.'}
              {tabActual === 'usuarios' && 'Administra alumnos, profesores y su estado de acceso al sistema.'}
              {tabActual === 'auditoria' && 'Supervisa qué acciones y cambios realizó cada administrador o docente en tiempo real.'}
            </p>
          </div>

          {/* TARJETAS DE MÉTRICAS */}
          {tabActual !== 'pagos' && tabActual !== 'auditoria' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Alumnos Activos', valor: totalAlumnos, nota: 'Padrón oficial', color: '#0284c7', bg: '#f0f9ff', icon: '👥' },
                { label: 'Clases con Cupo', valor: clasesDisponibles, nota: enModoProfesor ? 'Tus turnos libres' : 'Abiertas en App', color: '#16a34a', bg: '#f0fdf4', icon: '📅' },
                { label: 'Reservas Totales', valor: totalReservas, nota: 'Pases asegurados', color: '#7c3aed', bg: '#faf5ff', icon: '💃' },
                { label: 'Asistencias', valor: totalAsistencias, nota: 'Verificadas', color: '#ea580c', bg: '#fff7ed', icon: '✅' },
              ].map((kpi, idx) => (
                <div key={idx} style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>{kpi.valor}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', fontWeight: '600' }}>{kpi.nota}</div>
                  </div>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: kpi.bg, color: kpi.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                    {kpi.icon}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VISTA 1: HORARIOS */}
          {tabActual === 'horarios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {enModoAdmin && (
                <div style={{
                  backgroundColor: '#ffffff',
                  padding: '20px 24px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                  position: 'relative',
                  zIndex: 30
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ fontSize: '16px' }}>➕</span>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Habilitar Nuevo Turno de Clase</h3>
                  </div>

                  <form onSubmit={guardarHorario} style={{
                    display: 'grid',
                    gridTemplateColumns: formHorario.modalidad === 'Grupal' 
                      ? 'repeat(auto-fit, minmax(150px, 1fr))' 
                      : 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '12px',
                    alignItems: 'flex-end'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Profesor</label>
                      <select required value={formHorario.id_profesor} onChange={(e) => setFormHorario({...formHorario, id_profesor: e.target.value})} style={{ ...inputStyle, width: '100%' }}>
                        <option value="">Seleccionar Profesor...</option>
                        {profesores.map(p => (
                          <option key={p.id_usuario} value={p.id_usuario}>{p.nombre} {p.apellido}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Modalidad</label>
                      <select value={formHorario.modalidad} onChange={(e) => handleCambioModalidad(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                        <option value="Individual">Individual (1 cupo)</option>
                        <option value="Pareja">Pareja (2 cupos)</option>
                        <option value="Clase Compartida">Clase Compartida (2 cupos)</option>
                        <option value="Grupal">Grupal (Aforo Personalizado)</option>
                        <option value="Otros">Otros (Ilimitado / Evento)</option>
                      </select>
                    </div>

                    {formHorario.modalidad === 'Grupal' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#0284c7' }}>Aforo Máx.</label>
                        <input
                          type="number"
                          min="3"
                          max="60"
                          required
                          value={formHorario.capacidad_max}
                          onChange={(e) => setFormHorario({ ...formHorario, capacidad_max: e.target.value })}
                          style={{ ...inputStyle, width: '100%', fontWeight: '800', textAlign: 'center' }}
                        />
                      </div>
                    )}

                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Fecha</label>
                      <CalendarioSelector
                        fechaSeleccionada={formHorario.fecha}
                        alSeleccionarFecha={(fechaElegida) => setFormHorario({ ...formHorario, fecha: fechaElegida })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Bloque Horario</label>
                      <select value={formHorario.bloqueIndex} onChange={(e) => setFormHorario({...formHorario, bloqueIndex: Number(e.target.value)})} style={{ ...inputStyle, width: '100%' }}>
                        {BLOQUES_HORARIOS.map((bloque, index) => (
                          <option key={index} value={index}>{bloque.etiqueta}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={guardandoHorario}
                        style={{
                          width: '100%',
                          padding: '11px',
                          backgroundColor: guardandoHorario ? '#94a3b8' : '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: guardandoHorario ? 'wait' : 'pointer',
                          fontWeight: '800',
                          fontSize: '13px',
                          height: '42px'
                        }}
                      >
                        {guardandoHorario ? 'Publicando...' : 'Publicar Turno'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', width: '100%' }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px' }}>
                      Turnos Programados ({horariosFiltrados.length})
                    </span>
                    
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'Disponible', label: '🟢 Disponibles' },
                        { id: 'Ocupado', label: '🔴 Ocupados' },
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => setFiltroEstadoHorario(chip.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '14px',
                            border: '1px solid',
                            borderColor: filtroEstadoHorario === chip.id ? '#0284c7' : '#e2e8f0',
                            backgroundColor: filtroEstadoHorario === chip.id ? '#e0f2fe' : '#ffffff',
                            color: filtroEstadoHorario === chip.id ? '#0369a1' : '#64748b',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'inline-flex', gap: '6px', marginLeft: '6px', borderLeft: '1px solid #cbd5e1', paddingLeft: '10px' }}>
                      {[
                        { id: 'todos', label: '🌐 Todo' },
                        { id: 'semana', label: '📅 Esta Semana' },
                        { id: 'mes', label: '🗓️ Este Mes' },
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => setFiltroPeriodoHorario(chip.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: filtroPeriodoHorario === chip.id ? '#0f172a' : '#e2e8f0',
                            backgroundColor: filtroPeriodoHorario === chip.id ? '#0f172a' : '#ffffff',
                            color: filtroPeriodoHorario === chip.id ? '#ffffff' : '#64748b',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '700' }}>● Sincronización activa</span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '780px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>DÍA Y FECHA</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>HORARIO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>MODALIDAD</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>PROFESOR</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>ESTADO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horariosFiltrados.map(h => {
                        const inscritos = reservas.filter(r => String(r.id_horario) === String(h.id_horario));
                        const cuposOcupados = inscritos.length;
                        const cuposLibres = Math.max(0, h.capacidad_max - cuposOcupados);
                        const lleno = cuposLibres <= 0 && h.modalidad !== 'Otros';

                        return (
                          <tr key={h.id_horario} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 22px', fontWeight: '800', color: '#0f172a', whiteSpace: 'nowrap' }}>
                              {formatearFechaTabla(h.fecha)}
                            </td>
                            <td style={{ padding: '14px 22px', fontWeight: '700', color: '#0284c7' }}>
                              {h.hora_inicio?.slice(0, 5)} - {h.hora_fin?.slice(0, 5)}
                            </td>
                            <td style={{ padding: '14px 22px' }}>
                              <span style={{ 
                                backgroundColor: h.modalidad === 'Grupal' ? '#e0f2fe' : '#f1f5f9', 
                                color: h.modalidad === 'Grupal' ? '#0369a1' : '#334155',
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                fontSize: '12px', 
                                fontWeight: '700' 
                              }}>
                                {h.modalidad} ({cuposOcupados}/{h.modalidad === 'Otros' ? '∞' : h.capacidad_max})
                              </span>
                            </td>
                            <td style={{ padding: '14px 22px', fontWeight: '600' }}>
                              {h.profesor_nombre ? `${h.profesor_nombre} ${h.profesor_apellido}` : 'Sin asignar'}
                            </td>
                            <td style={{ padding: '14px 22px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: !lleno ? '#dcfce7' : '#fee2e2',
                                color: !lleno ? '#166534' : '#991b1b',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '800'
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: !lleno ? '#16a34a' : '#dc2626' }}></span>
                                {!lleno ? `${cuposLibres} libres` : 'Lleno'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 22px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  disabled={lleno}
                                  onClick={() => setModalInscribir({ visible: true, clase: h, id_alumno: '' })}
                                  style={{
                                    backgroundColor: lleno ? '#f1f5f9' : '#0284c7',
                                    color: lleno ? '#94a3b8' : '#ffffff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: lleno ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  ➕ Asignar Alumno
                                </button>
                                {enModoAdmin && (
                                  <button
                                    onClick={() => eliminarHorario(h.id_horario)}
                                    style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                  >
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: ASISTENCIA */}
          {tabActual === 'reservas' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: '800', fontSize: '15px' }}>
                    {enModoProfesor ? 'Lista de Asistencia de mis Alumnos' : 'Control de Asistencia Global'} ({reservasFiltradas.length})
                  </span>
                  
                  <div style={{ display: 'inline-flex', gap: '6px', marginLeft: '12px' }}>
                    {[
                      { id: 'todos', label: 'Todos' },
                      { id: 'Pendiente', label: '🟡 Pendientes' },
                      { id: 'Asistio', label: '🟢 Asistieron' },
                      { id: 'Falto', label: '🔴 Faltaron' },
                    ].map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => setFiltroEstadoAsistencia(chip.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '14px',
                          border: '1px solid',
                          borderColor: filtroEstadoAsistencia === chip.id ? '#0284c7' : '#e2e8f0',
                          backgroundColor: filtroEstadoAsistencia === chip.id ? '#e0f2fe' : '#ffffff',
                          color: filtroEstadoAsistencia === chip.id ? '#0369a1' : '#64748b',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => exportarCSV(
                    reservasFiltradas,
                    [
                      { titulo: 'Código Pase', obtener: (r) => `#CUP-${String(r.id_reserva).slice(-4).toUpperCase()}` },
                      { titulo: 'Alumno', obtener: (r) => `${r.alumno_nombre} ${r.alumno_apellido}` },
                      { titulo: 'Teléfono', campo: 'alumno_telefono' },
                      { titulo: 'Fecha Clase', campo: 'clase_fecha' },
                      { titulo: 'Horario', obtener: (r) => `${r.hora_inicio?.slice(0, 5)} - ${r.hora_fin?.slice(0, 5)}` },
                      { titulo: 'Modalidad', campo: 'modalidad' },
                      { titulo: 'Profesor', obtener: (r) => `${r.profesor_nombre || ''} ${r.profesor_apellido || ''}`.trim() },
                      { titulo: 'Estado Asistencia', campo: 'estado_asistencia' },
                      { titulo: 'Estado Pago', obtener: (r) => r.estado_pago || 'Sin registrar' }
                    ],
                    'Reporte_Asistencia'
                  )}
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#0284c7',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📊</span> Exportar a Excel (.csv)
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '820px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>ALUMNO</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>FECHA CLASE</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>HORARIO</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>PROFESOR</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>ASISTENCIA</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>CONTROL Y WSP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No hay alumnos registrados con el filtro seleccionado.
                        </td>
                      </tr>
                    ) : (
                      reservasFiltradas.map(r => (
                        <tr key={r.id_reserva} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 22px', display: 'flex', alignItems: 'center' }}>
                            <AvatarUsuario nombre={r.alumno_nombre} apellido={r.alumno_apellido} rol="Alumno" />
                            <div>
                              <div style={{ fontWeight: '800', color: '#0f172a' }}>{r.alumno_nombre} {r.alumno_apellido}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>📱 {r.alumno_telefono || 'Sin teléfono'}</div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 22px', fontWeight: '700', color: '#334155' }}>
                            {formatearFechaTabla(r.clase_fecha)}
                          </td>
                          <td style={{ padding: '14px 22px', fontWeight: '700', color: '#0284c7' }}>
                            {r.hora_inicio?.slice(0, 5)} - {r.hora_fin?.slice(0, 5)}
                          </td>
                          <td style={{ padding: '14px 22px', fontWeight: '600' }}>
                            {r.profesor_nombre ? `${r.profesor_nombre} ${r.profesor_apellido}` : 'Sin profesor'}
                          </td>
                          <td style={{ padding: '14px 22px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: r.estado_asistencia === 'Asistio' || r.estado_asistencia === 'Asistió' ? '#dcfce7' : r.estado_asistencia === 'Falto' || r.estado_asistencia === 'Faltó' ? '#fee2e2' : '#fef9c3',
                              color: r.estado_asistencia === 'Asistio' || r.estado_asistencia === 'Asistió' ? '#166534' : r.estado_asistencia === 'Falto' || r.estado_asistencia === 'Faltó' ? '#991b1b' : '#854d0e',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '800'
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: r.estado_asistencia === 'Asistio' || r.estado_asistencia === 'Asistió' ? '#16a34a' : r.estado_asistencia === 'Falto' || r.estado_asistencia === 'Faltó' ? '#dc2626' : '#ca8a04' }}></span>
                              {r.estado_asistencia}
                            </span>
                          </td>
                          <td style={{ padding: '14px 22px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <button
                                onClick={() => {
                                  const msg = 
`¡Hola, ${r.alumno_nombre}!

Te recordamos tu ensayo de marinera programado para hoy:

*Modalidad:* ${r.modalidad}
*Hora:* ${r.hora_inicio?.slice(0, 5)} - ${r.hora_fin?.slice(0, 5)} hrs

¡Te esperamos puntual en la academia! 💃`;

                                  abrirWhatsApp(r.alumno_telefono, msg);
                                }}
                                style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                              >
                                📲 WSP
                              </button>

                              {r.estado_asistencia === 'Pendiente' ? (
                                <>
                                  <button
                                    onClick={() => actualizarAsistencia(r.id_reserva, 'Asistio')}
                                    style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    Asistió
                                  </button>
                                  <button
                                    onClick={() => actualizarAsistencia(r.id_reserva, 'Falto')}
                                    style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    Faltó
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => actualizarAsistencia(r.id_reserva, 'Pendiente')}
                                  style={{ backgroundColor: '#f1f5f9', color: '#0284c7', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  Deshacer
                                </button>
                              )}
                              {enModoAdmin && (
                                <button
                                  onClick={() => eliminarReserva(r.id_reserva)}
                                  style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                  title="Liberar cupo"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 3: USUARIOS */}
          {tabActual === 'usuarios' && enModoAdmin && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '22px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '16px' }}>👤</span>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800' }}>{editandoId ? 'Editar Persona' : 'Registrar Persona'}</h3>
                </div>
                <form onSubmit={guardarUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Tipo de Rol</label>
                    <select value={formUsuario.rol} onChange={(e) => setFormUsuario({...formUsuario, rol: e.target.value})} style={{ ...inputStyle, width: '100%' }}>
                      <option value="Alumno">Alumno</option>
                      <option value="Profesor">Profesor</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Nombre</label>
                    <input type="text" placeholder="Ej. Carlos" required value={formUsuario.nombre} onChange={(e) => setFormUsuario({...formUsuario, nombre: e.target.value})} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Apellido</label>
                    <input type="text" placeholder="Ej. Mendoza" required value={formUsuario.apellido} onChange={(e) => setFormUsuario({...formUsuario, apellido: e.target.value})} style={{ ...inputStyle, width: '100%' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Teléfono Celular</label>
                    <input 
                      type="text" 
                      placeholder="Ingresa tu número de celular..." 
                      required 
                      value={formUsuario.telefono} 
                      onChange={(e) => setFormUsuario({...formUsuario, telefono: e.target.value})} 
                      style={{ ...inputStyle, width: '100%' }} 
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                      💡 Para el extranjero, incluye el <strong>+</strong> y prefijo (ej. +1 USA, +34 España).
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                      Contraseña {editandoId ? '(Opcional al editar)' : ''}
                    </label>
                    <input 
                      type="text" 
                      placeholder="Por defecto: 123456" 
                      value={formUsuario.password} 
                      onChange={(e) => setFormUsuario({...formUsuario, password: e.target.value})} 
                      style={{ ...inputStyle, width: '100%' }} 
                    />
                  </div>

                  {editandoId && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Estado en Sistema</label>
                      <select
                        value={formUsuario.estado ? 'true' : 'false'}
                        onChange={(e) => setFormUsuario({...formUsuario, estado: e.target.value === 'true'})}
                        style={{ ...inputStyle, width: '100%' }}
                      >
                        <option value="true">🟢 Activo (Puede usar el sistema)</option>
                        <option value="false">🔴 Inactivo (Sin acceso / Retirado)</option>
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={guardandoUsuario}
                    style={{
                      padding: '12px',
                      backgroundColor: guardandoUsuario ? '#94a3b8' : (editandoId ? '#16a34a' : '#0284c7'),
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      cursor: guardandoUsuario ? 'wait' : 'pointer',
                      fontWeight: '800',
                      fontSize: '13px',
                      marginTop: '6px'
                    }}
                  >
                    {guardandoUsuario ? 'Guardando...' : (editandoId ? 'Actualizar Datos' : 'Guardar en Sistema')}
                  </button>
                  {editandoId && (
                    <button type="button" onClick={() => { setEditandoId(null); setFormUsuario({ rol: 'Alumno', nombre: '', apellido: '', telefono: '', estado: true, password: '' }); }} style={{ padding: '10px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                      Cancelar Edición
                    </button>
                  )}
                </form>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '650px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>USUARIO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>ROL</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>TELÉFONO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>ESTADO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>FICHA Y ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosFiltrados.map(u => (
                        <tr key={u.id_usuario} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '14px 22px', display: 'flex', alignItems: 'center' }}>
                            <AvatarUsuario nombre={u.nombre} apellido={u.apellido} rol={u.rol} />
                            <div>
                              <div style={{ fontWeight: '800', color: '#0f172a' }}>{u.nombre} {u.apellido}</div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 22px' }}>
                            <span style={{
                              backgroundColor: u.rol === 'Profesor' ? '#e0f2fe' : u.rol === 'Administrador' ? '#f3e8ff' : '#f1f5f9',
                              color: u.rol === 'Profesor' ? '#0369a1' : u.rol === 'Administrador' ? '#7e22ce' : '#334155',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '800'
                            }}>
                              {u.rol}
                            </span>
                          </td>
                          <td style={{ padding: '14px 22px', color: '#64748b', fontSize: '13px' }}>{u.telefono}</td>
                          
                          <td style={{ padding: '14px 22px' }}>
                            <button
                              onClick={() => alternarEstadoUsuario(u)}
                              title="Toca para cambiar estado"
                              style={{
                                backgroundColor: u.estado ? '#dcfce7' : '#fee2e2',
                                color: u.estado ? '#166534' : '#991b1b',
                                border: `1px solid ${u.estado ? '#86efac' : '#fca5a5'}`,
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{u.estado ? '🟢 Activo' : '🔴 Inactivo'}</span>
                            </button>
                          </td>

                          <td style={{ padding: '14px 22px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              {u.rol === 'Alumno' && (
                                <button
                                  onClick={() => setModalFichaAlumno({ visible: true, alumno: u })}
                                  style={{ backgroundColor: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                >
                                  📁 Ver Ficha
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditandoId(u.id_usuario);
                                  setFormUsuario({ rol: u.rol, nombre: u.nombre, apellido: u.apellido, telefono: u.telefono, estado: u.estado, password: '' });
                                }}
                                style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                              >
                                Editar
                              </button>

                              <button onClick={() => eliminarUsuario(u.id_usuario, `${u.nombre} ${u.apellido}`)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 4: ABONOS Y FINANZAS */}
          {tabActual === 'pagos' && enModoAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  📈 Resumen Financiero y Recaudación
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '14px' }}>
                  <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos de Hoy</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#15803d', marginTop: '4px' }}>S/ {ingresosHoy.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>Confirmados del día</div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos de la Semana</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#0369a1', marginTop: '4px' }}>S/ {ingresosSemana.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>Desde el lunes en curso</div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ingresos del Mes</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#6d28d9', marginTop: '4px' }}>S/ {ingresosMes.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>Total acumulado mensual</div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '18px 20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Por Conciliar (Pendientes)</div>
                    <div style={{ fontSize: '26px', fontWeight: '900', color: '#a16207', marginTop: '4px' }}>S/ {totalPendientesMonto.toFixed(2)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', fontWeight: '600' }}>En espera de validación</div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Recaudación por Canal:
                  </span>

                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#faf5ff', color: '#7e22ce', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>📱 Yape / Plin:</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>S/ {totalYapePlin.toFixed(2)}</strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '800' }}>💵 Efectivo:</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>S/ {totalEfectivo.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABLA DE PAGOS */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '800', fontSize: '15px' }}>Historial de Transacciones ({pagosFiltrados.length})</span>
                    
                    <div style={{ display: 'inline-flex', gap: '6px', marginLeft: '12px' }}>
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'Efectivo', label: '💵 Efectivo' },
                        { id: 'Digitales', label: '📱 Yape / Plin' },
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => setFiltroMetodoPago(chip.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '14px',
                            border: '1px solid',
                            borderColor: filtroMetodoPago === chip.id ? '#0284c7' : '#e2e8f0',
                            backgroundColor: filtroMetodoPago === chip.id ? '#e0f2fe' : '#ffffff',
                            color: filtroMetodoPago === chip.id ? '#0369a1' : '#64748b',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button
                      onClick={() => exportarCSV(
                        pagosFiltrados,
                        [
                          { titulo: 'Fecha y Hora', campo: 'fecha_pago' },
                          { titulo: 'Alumno', obtener: (p) => `${p.alumno_nombre} ${p.alumno_apellido}` },
                          { titulo: 'Teléfono', campo: 'alumno_telefono' },
                          { titulo: 'Método', campo: 'metodo' },
                          { titulo: 'Monto (S/)', obtener: (p) => parseFloat(p.monto).toFixed(2) },
                          { titulo: 'Estado', campo: 'estado' },
                          { titulo: 'Comprobante', obtener: (p) => p.comprobante_url?.startsWith('data:image') ? 'Foto Adjunta' : p.comprobante_url }
                        ],
                        'Reporte_Finanzas'
                      )}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#0284c7',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>📊</span> Exportar Excel (.csv)
                    </button>

                    <button
                      onClick={vaciarHistorialPagos}
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title="Reinicia y vacía todos los registros de finanzas"
                    >
                      <span>🗑️</span> Limpiar Mes
                    </button>

                    <button
                      onClick={() => setModalPago({ visible: true, id_alumno: '', metodo: 'Efectivo', monto: '50.00', comprobante: '' })}
                      style={{
                        backgroundColor: '#16a34a',
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>➕</span> Registrar Pago (Counter)
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>FECHA Y HORA</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>ALUMNO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>MÉTODO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>MONTO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>COMPROBANTE</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>ESTADO</th>
                        <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>ACCIONES Y RECIBO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                            No hay abonos registrados en este periodo.
                          </td>
                        </tr>
                      ) : (
                        pagosFiltrados.map(p => {
                          const tieneFoto = p.comprobante_url && (p.comprobante_url.startsWith('data:image') || p.comprobante_url.startsWith('http'));

                          return (
                            <tr key={p.id_pago} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '14px 22px', color: '#64748b', fontSize: '12px' }}>{p.fecha_pago}</td>
                              <td style={{ padding: '14px 22px', display: 'flex', alignItems: 'center' }}>
                                <AvatarUsuario nombre={p.alumno_nombre} apellido={p.alumno_apellido} rol="Alumno" />
                                <div>
                                  <div style={{ fontWeight: '800' }}>{p.alumno_nombre} {p.alumno_apellido}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>📱 {p.alumno_telefono}</div>
                                </div>
                              </td>
                              <td style={{ padding: '14px 22px', fontWeight: '800', color: '#0284c7' }}>{p.metodo}</td>
                              <td style={{ padding: '14px 22px', fontWeight: '900', color: '#0f172a' }}>S/ {parseFloat(p.monto).toFixed(2)}</td>
                              <td style={{ padding: '14px 22px' }}>
                                {tieneFoto ? (
                                  <button
                                    onClick={() => setModalVoucher({
                                      visible: true,
                                      imagen: p.comprobante_url,
                                      alumno: `${p.alumno_nombre} ${p.alumno_apellido}`,
                                      monto: p.monto,
                                      metodo: p.metodo,
                                      idPago: p.id_pago
                                    })}
                                    style={{
                                      backgroundColor: '#e0f2fe',
                                      color: '#0284c7',
                                      border: '1px solid #bae6fd',
                                      borderRadius: '8px',
                                      padding: '6px 12px',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                  >
                                    <span>📷</span> Ver Voucher
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                    {p.comprobante_url || (p.metodo === 'Efectivo' ? 'Pago el mismo día de la clase' : 'Sin archivo')}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '14px 22px' }}>
                                <span style={{ backgroundColor: p.estado === 'Confirmado' ? '#dcfce7' : p.estado === 'Pendiente' ? '#fef9c3' : '#fee2e2', color: p.estado === 'Confirmado' ? '#166534' : p.estado === 'Pendiente' ? '#854d0e' : '#991b1b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                                  {p.estado}
                                </span>
                              </td>
                              <td style={{ padding: '14px 22px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    onClick={() => {
                                      const msgRecibo = 
`¡Hola, ${p.alumno_nombre}!

Te confirmamos la recepción de tu pago:

*Monto:* S/ ${parseFloat(p.monto).toFixed(2)}
*Método:* ${p.metodo}
*Estado:* Confirmado

¡Muchas gracias por entrenar con nosotros! 💃`;

                                      abrirWhatsApp(p.alumno_telefono, msgRecibo);
                                    }}
                                    style={{ backgroundColor: '#f1f5f9', color: '#0284c7', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                    📲 Recibo
                                  </button>

                                  {p.estado === 'Pendiente' ? (
                                    <>
                                      <button onClick={() => actualizarEstadoPago(p.id_pago, 'Confirmado')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>Confirmar</button>
                                      <button onClick={() => actualizarEstadoPago(p.id_pago, 'Rechazado')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>Rechazar</button>
                                    </>
                                  ) : (
                                    <button onClick={() => actualizarEstadoPago(p.id_pago, 'Pendiente')} style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontWeight: '700' }}>
                                      Deshacer
                                    </button>
                                  )}

                                  <button
                                    onClick={() => eliminarPago(p.id_pago)}
                                    style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                                    title="Borrar registro de pago"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 5: AUDITORÍA */}
          {tabActual === 'auditoria' && enModoAdmin && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '800', fontSize: '15px' }}>Bitácora de Acciones ({auditoriasFiltradas.length})</span>
                  
                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                    {[
                      { id: 'todos', label: 'Todas las acciones' },
                      { id: 'Crear Horario', label: '📅 Clases Creadas' },
                      { id: 'Eliminar Horario', label: '🗑️ Clases Eliminadas' },
                      { id: 'Confirmar Pago', label: '💳 Pagos Aprobados' },
                      { id: 'Marcar Asistencia', label: '✅ Asistencias' },
                    ].map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => setFiltroAccionAuditoria(chip.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '14px',
                          border: '1px solid',
                          borderColor: filtroAccionAuditoria === chip.id ? '#0284c7' : '#e2e8f0',
                          backgroundColor: filtroAccionAuditoria === chip.id ? '#e0f2fe' : '#ffffff',
                          color: filtroAccionAuditoria === chip.id ? '#0369a1' : '#64748b',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => exportarCSV(
                      auditoriasFiltradas,
                      [
                        { titulo: 'Fecha y Hora', campo: 'fecha' },
                        { titulo: 'Responsable', campo: 'usuario_nombre' },
                        { titulo: 'Acción Realizada', campo: 'accion' },
                        { titulo: 'Detalle del Cambio', campo: 'detalle' }
                      ],
                      'Reporte_Auditoria_Seguridad'
                    )}
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#0284c7',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>📊</span> Exportar Bitácora (.csv)
                  </button>

                  <button
                    onClick={vaciarHistorialAuditoria}
                    style={{
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title="Vacía todo el registro de auditoría"
                  >
                    <span>🗑️</span> Vaciar Bitácora
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700', width: '170px' }}>FECHA Y HORA</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700', width: '220px' }}>RESPONSABLE</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700', width: '160px' }}>ACCIÓN</th>
                      <th style={{ padding: '14px 22px', fontSize: '12px', fontWeight: '700' }}>DETALLE DEL EVENTO</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoriasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                          No hay registros de auditoría en la bitácora.
                        </td>
                      </tr>
                    ) : (
                      auditoriasFiltradas.map(a => {
                        const esEliminar = a.accion.includes('Eliminar') || a.accion.includes('Cancelar') || a.accion.includes('Limpieza') || a.accion.includes('Cierre');
                        const esConfirmar = a.accion.includes('Confirmar') || a.accion.includes('Crear');

                        return (
                          <tr key={a.id_auditoria} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 22px', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                              {a.fecha}
                            </td>
                            <td style={{ padding: '14px 22px', fontWeight: '800', color: '#0f172a' }}>
                              {a.usuario_nombre}
                            </td>
                            <td style={{ padding: '14px 22px' }}>
                              <span style={{
                                backgroundColor: esEliminar ? '#fee2e2' : esConfirmar ? '#dcfce7' : '#e0f2fe',
                                color: esEliminar ? '#991b1b' : esConfirmar ? '#166534' : '#0369a1',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '800',
                                display: 'inline-block'
                              }}>
                                {a.accion}
                              </span>
                            </td>
                            <td style={{ padding: '14px 22px', fontSize: '13px', color: '#334155' }}>
                              {a.detalle}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL 1: ASIGNAR ALUMNO */}
      {modalInscribir.visible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '26px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.2)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              💃 Asignar Alumno a Clase
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              El alumno quedará registrado en este turno y se le enviará la confirmación a su WhatsApp.
            </p>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '13px' }}>
              <div>📅 <strong style={{ color: '#0f172a' }}>Fecha:</strong> {formatearFechaTabla(modalInscribir.clase?.fecha)}</div>
              <div style={{ marginTop: '4px' }}>⏰ <strong style={{ color: '#0f172a' }}>Horario:</strong> {modalInscribir.clase?.hora_inicio?.slice(0,5)} - {modalInscribir.clase?.hora_fin?.slice(0,5)}</div>
              <div style={{ marginTop: '4px' }}>💃 <strong style={{ color: '#0f172a' }}>Modalidad:</strong> {modalInscribir.clase?.modalidad}</div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                Selecciona al Alumno:
              </label>
              <select
                value={modalInscribir.id_alumno}
                onChange={(e) => setModalInscribir({ ...modalInscribir, id_alumno: e.target.value })}
                style={{ ...inputStyle, width: '100%' }}
              >
                <option value="">Elegir alumno registrado...</option>
                {alumnos.map(a => (
                  <option key={a.id_usuario} value={a.id_usuario}>
                    {a.nombre} {a.apellido} ({a.telefono || 'Sin celular'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => setModalInscribir({ visible: false, clase: null, id_alumno: '' })}
                style={{ flex: 1, padding: '11px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                disabled={guardandoInscripcion}
                onClick={confirmarInscripcionDirecta}
                style={{
                  flex: 1.6,
                  padding: '11px',
                  backgroundColor: guardandoInscripcion ? '#94a3b8' : '#0284c7',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '800',
                  color: '#ffffff',
                  cursor: guardandoInscripcion ? 'wait' : 'pointer'
                }}
              >
                {guardandoInscripcion ? 'Inscribiendo...' : 'Inscribir y Notificar 📲'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR PAGO */}
      {modalPago.visible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', padding: '26px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.2)' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
              💳 Registrar Abono / Pago
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              Ingresa los abonos recibidos en counter o capturas de Yape/Plin ya validadas.
            </p>

            <form onSubmit={registrarNuevoPago} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Alumno</label>
                <select
                  required
                  value={modalPago.id_alumno}
                  onChange={(e) => setModalPago({ ...modalPago, id_alumno: e.target.value })}
                  style={{ ...inputStyle, width: '100%' }}
                >
                  <option value="">Selecciona Alumno...</option>
                  {alumnos.map(a => (
                    <option key={a.id_usuario} value={a.id_usuario}>{a.nombre} {a.apellido}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Método de Pago</label>
                  <select
                    value={modalPago.metodo}
                    onChange={(e) => setModalPago({ ...modalPago, metodo: e.target.value })}
                    style={{ ...inputStyle, width: '100%' }}
                  >
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Yape">📱 Yape</option>
                    <option value="Plin">📱 Plin</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>Monto (S/)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={modalPago.monto}
                    onChange={(e) => setModalPago({ ...modalPago, monto: e.target.value })}
                    style={{ ...inputStyle, width: '100%', fontWeight: '800' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '700', color: '#475569' }}>
                  {modalPago.metodo === 'Efectivo' ? 'Detalle / Nro. Recibo (Opcional)' : 'Nro. de Operación / Ref. Yape o Plin'}
                </label>
                <input
                  type="text"
                  placeholder={modalPago.metodo === 'Efectivo' ? 'Recibo #0012 en caja' : 'Ej. Op. 483921'}
                  value={modalPago.comprobante}
                  onChange={(e) => setModalPago({ ...modalPago, comprobante: e.target.value })}
                  style={{ ...inputStyle, width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  disabled={guardandoPago}
                  onClick={() => setModalPago({ ...modalPago, visible: false })}
                  style={{ flex: 1, padding: '11px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPago}
                  style={{
                    flex: 1.5,
                    padding: '11px',
                    backgroundColor: guardandoPago ? '#94a3b8' : '#16a34a',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '800',
                    color: '#ffffff',
                    cursor: guardandoPago ? 'wait' : 'pointer'
                  }}
                >
                  {guardandoPago ? 'Guardando...' : 'Guardar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VISOR DE VOUCHERS */}
      {modalVoucher.visible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            padding: '24px',
            width: '100%',
            maxWidth: '460px',
            maxHeight: '90vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: '#0f172a' }}>Comprobante de Pago</h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Alumno: <strong>{modalVoucher.alumno}</strong></div>
              </div>
              <button
                onClick={() => setModalVoucher({ visible: false, imagen: '', alumno: '', monto: '', metodo: '', idPago: null })}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', fontWeight: '800', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
              <span>Método: <strong style={{ color: '#0284c7' }}>{modalVoucher.metodo}</strong></span>
              <span>Monto: <strong style={{ color: '#0f172a' }}>S/ {parseFloat(modalVoucher.monto || 0).toFixed(2)}</strong></span>
            </div>

            <div style={{
              flex: 1,
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '260px'
            }}>
              <img
                src={modalVoucher.imagen}
                alt="Comprobante de pago"
                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                type="button"
                onClick={() => setModalVoucher({ visible: false, imagen: '', alumno: '', monto: '', metodo: '', idPago: null })}
                style={{ flex: 1, padding: '11px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
              >
                Cerrar
              </button>

              {modalVoucher.idPago && (
                <button
                  type="button"
                  onClick={() => {
                    actualizarEstadoPago(modalVoucher.idPago, 'Confirmado');
                    setModalVoucher({ visible: false, imagen: '', alumno: '', monto: '', metodo: '', idPago: null });
                  }}
                  style={{ flex: 1.6, padding: '11px', backgroundColor: '#16a34a', border: 'none', borderRadius: '8px', fontWeight: '800', color: '#ffffff', cursor: 'pointer' }}
                >
                  ✓ Validar y Confirmar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: FICHA ALUMNO */}
      {modalFichaAlumno.visible && modalFichaAlumno.alumno && (() => {
        const alum = modalFichaAlumno.alumno;
        const misClases = reservas.filter(r => String(r.id_alumno) === String(alum.id_usuario));
        
        const nombreCompletoAlum = `${alum.nombre} ${alum.apellido}`.trim().toLowerCase();
        const misPagos = pagos.filter(p => {
          const coincideId = p.id_alumno && String(p.id_alumno) === String(alum.id_usuario);
          const coincideNombre = `${p.alumno_nombre || ''} ${p.alumno_apellido || ''}`.trim().toLowerCase() === nombreCompletoAlum;
          return coincideId || coincideNombre;
        });

        const asistidas = misClases.filter(r => r.estado_asistencia === 'Asistio' || r.estado_asistencia === 'Asistió').length;
        const faltas = misClases.filter(r => r.estado_asistencia === 'Falto' || r.estado_asistencia === 'Faltó').length;
        const totalInvertido = misPagos.filter(p => p.estado === 'Confirmado').reduce((acc, p) => acc + parseFloat(p.monto || 0), 0);

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '90vh',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '900' }}>
                    {alum.nombre?.charAt(0)}{alum.apellido?.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>
                      {alum.nombre} {alum.apellido}
                    </h2>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      📱 {alum.telefono} • Estado: <strong style={{ color: alum.estado ? '#16a34a' : '#dc2626' }}>{alum.estado ? 'Activo' : 'Inactivo'}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setModalFichaAlumno({ visible: false, alumno: null })}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', fontSize: '14px', cursor: 'pointer', fontWeight: '800', color: '#64748b' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '16px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f0f9ff', padding: '12px', borderRadius: '10px', border: '1px solid #e0f2fe', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#0369a1' }}>CLASES TOTALES</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#0284c7', marginTop: '2px' }}>{misClases.length}</div>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#15803d' }}>ASISTENCIAS</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>{asistidas}</div>
                </div>
                <div style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '10px', border: '1px solid #fecaca', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#991b1b' }}>FALTAS</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>{faltas}</div>
                </div>
                <div style={{ backgroundColor: '#faf5ff', padding: '12px', borderRadius: '10px', border: '1px solid #f3e8ff', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: '#6d28d9' }}>TOTAL PAGADO</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#7c3aed', marginTop: '2px' }}>S/ {totalInvertido.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                  📅 Historial de Ensayos Asignados ({misClases.length})
                </h4>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px' }}>Fecha</th>
                        <th style={{ padding: '8px 12px' }}>Horario</th>
                        <th style={{ padding: '8px 12px' }}>Profesor</th>
                        <th style={{ padding: '8px 12px' }}>Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {misClases.length === 0 ? (
                        <tr><td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>Sin historial de clases aún.</td></tr>
                      ) : (
                        misClases.map(c => (
                          <tr key={c.id_reserva} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontWeight: '700' }}>{formatearFechaTabla(c.clase_fecha)}</td>
                            <td style={{ padding: '8px 12px', color: '#0284c7' }}>{c.hora_inicio?.slice(0,5)} - {c.hora_fin?.slice(0,5)}</td>
                            <td style={{ padding: '8px 12px' }}>{c.profesor_nombre || 'Por asignar'}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                backgroundColor: c.estado_asistencia === 'Asistio' ? '#dcfce7' : c.estado_asistencia === 'Falto' ? '#fee2e2' : '#fef9c3',
                                color: c.estado_asistencia === 'Asistio' ? '#166534' : c.estado_asistencia === 'Falto' ? '#991b1b' : '#854d0e',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '800'
                              }}>
                                {c.estado_asistencia}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ margin: '14px 0 8px 0', fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                  💳 Historial de Pagos y Abonos ({misPagos.length})
                </h4>

                <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 12px' }}>Fecha</th>
                        <th style={{ padding: '8px 12px' }}>Método</th>
                        <th style={{ padding: '8px 12px' }}>Monto</th>
                        <th style={{ padding: '8px 12px' }}>Comprobante</th>
                        <th style={{ padding: '8px 12px' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {misPagos.length === 0 ? (
                        <tr><td colSpan="5" style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>No registra pagos aún.</td></tr>
                      ) : (
                        misPagos.map(p => {
                          const tieneFoto = p.comprobante_url && (p.comprobante_url.startsWith('data:image') || p.comprobante_url.startsWith('http'));
                          return (
                            <tr key={p.id_pago} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px' }}>{p.fecha_pago}</td>
                              <td style={{ padding: '8px 12px', fontWeight: '700' }}>{p.metodo}</td>
                              <td style={{ padding: '8px 12px', fontWeight: '800', color: '#0f172a' }}>S/ {parseFloat(p.monto).toFixed(2)}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {tieneFoto ? (
                                  <button
                                    onClick={() => setModalVoucher({
                                      visible: true,
                                      imagen: p.comprobante_url,
                                      alumno: `${alum.nombre} ${alum.apellido}`,
                                      monto: p.monto,
                                      metodo: p.metodo,
                                      idPago: p.id_pago
                                    })}
                                    style={{
                                      backgroundColor: '#e0f2fe',
                                      color: '#0284c7',
                                      border: '1px solid #bae6fd',
                                      borderRadius: '6px',
                                      padding: '3px 8px',
                                      fontSize: '10px',
                                      fontWeight: '800',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    📷 Ver Voucher
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                                    {p.comprobante_url || 'Sin voucher'}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  backgroundColor: p.estado === 'Confirmado' ? '#dcfce7' : '#fef9c3',
                                  color: p.estado === 'Confirmado' ? '#166534' : '#854d0e',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '10px',
                                  fontWeight: '800'
                                }}>
                                  {p.estado}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setModalFichaAlumno({ visible: false, alumno: null })}
                  style={{ padding: '9px 18px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  )
}

export default App