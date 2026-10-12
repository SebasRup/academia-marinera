import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator, 
  StatusBar, 
  RefreshControl, 
  Alert, 
  Modal, 
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

const warnOriginal = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && (
    args[0].includes('SafeAreaView') || 
    args[0].includes('expo-image-picker') || 
    args[0].includes('MediaTypeOptions') ||
    args[0].includes('deprecated')
  )) {
    return;
  }
  warnOriginal(...args);
};

const API_URL = 'https://academia-marinera.onrender.com';

const formatearFechaPeruana = (fechaStr, incluirDiaSemana = true) => {
  if (!fechaStr) return '';
  const partes = fechaStr.split('T')[0].split('-');
  if (partes.length !== 3) return fechaStr;
  const [y, m, d] = partes.map(Number);
  const dia = String(d).padStart(2, '0');
  const mes = String(m).padStart(2, '0');
  
  if (!incluirDiaSemana) {
    return `${dia}/${mes}/${y}`;
  }
  const fechaObj = new Date(y, m - 1, d);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return `${dias[fechaObj.getDay()]} ${dia}/${mes}/${y}`;
};

const obtenerIconoModalidad = (modalidad) => {
  if (!modalidad) return '💃';
  if (modalidad === 'Individual' || modalidad === 'Particular') return '💃';
  if (modalidad === 'Pareja') return '💃🕺';
  if (modalidad === 'Grupal' || modalidad === 'Clase Compartida') return '👥🎶';
  return '👒';
};

export default function App() {
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [celularLogin, setCelularLogin] = useState('');
  const [cargandoLogin, setCargandoLogin] = useState(false);

  const [tabActual, setTabActual] = useState('explorar');
  const [clases, setClases] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const [modalReservaVisible, setModalReservaVisible] = useState(false);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [conCompanero, setConCompanero] = useState(false);
  const [companeroSeleccionado, setCompaneroSeleccionado] = useState(null);
  const [busquedaCompanero, setBusquedaCompanero] = useState('');

  const [reservaParaPagar, setReservaParaPagar] = useState(null);
  const [modalPagoVisible, setModalPagoVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Yape');
  const [fotoVoucherUri, setFotoVoucherUri] = useState(null);
  const [fotoVoucherBase64, setFotoVoucherBase64] = useState(null);

  const cargarDatos = async () => {
    try {
      const resClases = await fetch(`${API_URL}/api/horarios`);
      const dataClases = await resClases.json();
      setClases(Array.isArray(dataClases) ? dataClases : []);

      const resReservas = await fetch(`${API_URL}/api/reservas`);
      const dataReservas = await resReservas.json();
      setReservas(Array.isArray(dataReservas) ? dataReservas : []);

      const resPagos = await fetch(`${API_URL}/api/pagos`);
      const dataPagos = await resPagos.json();
      setPagos(Array.isArray(dataPagos) ? dataPagos : []);

      const resUsuarios = await fetch(`${API_URL}/api/usuarios`);
      const dataUsuarios = await resUsuarios.json();
      if (Array.isArray(dataUsuarios)) {
        setAlumnos(dataUsuarios.filter(u => u && u.rol === 'Alumno' && u.estado));
      }
    } catch {
      Alert.alert('Aviso de Red', 'No se pudo sincronizar con el servidor.');
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useEffect(() => {
    if (usuarioLogueado) {
      cargarDatos();
    }
  }, [usuarioLogueado]);

  const onRefresh = () => {
    setRefrescando(true);
    cargarDatos();
  };

  const handleLoginMovil = async () => {
    const celLimpio = celularLogin.trim();
    if (!celLimpio) {
      Alert.alert('Celular requerido', 'Por favor ingresa tu número de celular registrado.');
      return;
    }

    setCargandoLogin(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identificador: celLimpio,
          solo_celular: true
        })
      });
      const data = await res.json();

      if (res.ok && data.usuario) {
        setUsuarioLogueado(data.usuario);
        setCelularLogin('');
      } else {
        Alert.alert('Acceso', data.error || 'Número de celular no registrado en el padrón.');
      }
    } catch {
      Alert.alert('Error', 'No se pudo conectar con el servidor.');
    } finally {
      setCargandoLogin(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Deseas salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, salir', 
          style: 'destructive',
          onPress: () => {
            setUsuarioLogueado(null);
            setTabActual('explorar');
          }
        }
      ]
    );
  };

  const copiarAlPortapapeles = async (texto, etiqueta) => {
    await Clipboard.setStringAsync(texto);
    Alert.alert('¡Copiado! 📋', `${etiqueta}: ${texto}`);
  };

  const seleccionarFotoDeGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Necesitamos acceso a tus fotos para adjuntar el voucher.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.25,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets && resultado.assets.length > 0) {
      const asset = resultado.assets[0];
      setFotoVoucherUri(asset.uri);
      setFotoVoucherBase64(`data:image/jpeg;base64,${asset.base64}`);
    }
  };

  const obtenerEstadoClase = (horario) => {
    const inscritos = reservas.filter(r => String(r.id_horario) === String(horario.id_horario));
    
    const yaInscrito = usuarioLogueado 
      ? inscritos.some(r => String(r.id_alumno) === String(usuarioLogueado.id_usuario))
      : false;

    const esIlimitado = horario.modalidad === 'Otros' || horario.capacidad_max >= 900;
    const cuposOcupados = inscritos.length;
    const cuposRestantes = esIlimitado ? 999 : Math.max(0, horario.capacidad_max - cuposOcupados);
    const estaLleno = !esIlimitado && (cuposRestantes <= 0 || horario.estado !== 'Disponible');

    return {
      yaInscrito,
      cuposRestantes,
      cuposOcupados,
      estaLleno,
      esIlimitado
    };
  };

  const abrirModalReserva = (clase) => {
    setClaseSeleccionada(clase);
    setConCompanero(false);
    setCompaneroSeleccionado(null);
    setBusquedaCompanero('');
    setModalReservaVisible(true);
  };

  const confirmarReserva = async () => {
    if (!usuarioLogueado) return;

    const esPareja = claseSeleccionada.modalidad === 'Pareja';

    if (esPareja && conCompanero && !companeroSeleccionado) {
      Alert.alert('Pareja requerida', 'Por favor busca a tu pareja de baile y selecciónala.');
      return;
    }

    setProcesando(true);
    try {
      const payload = {
        id_alumno: usuarioLogueado.id_usuario,
        id_horario: claseSeleccionada.id_horario
      };

      if (esPareja && conCompanero && companeroSeleccionado) {
        payload.id_companero = companeroSeleccionado.id_usuario;
      }

      const res = await fetch(`${API_URL}/api/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        setModalReservaVisible(false);
        await cargarDatos();

        const fechaFormateada = formatearFechaPeruana(claseSeleccionada.fecha);

        Alert.alert(
          '¡Cupo Asegurado! 💃',
          `Clase agendada para el ${fechaFormateada}.\n\n¿Deseas pagar tu clase ahora?`,
          [
            { text: 'Pagar después', onPress: () => setTabActual('mis_reservas'), style: 'cancel' },
            { 
              text: 'Pagar Ahora 💳', 
              onPress: () => {
                setReservaParaPagar(data.reserva || null);
                setFotoVoucherUri(null);
                setFotoVoucherBase64(null);
                setModalPagoVisible(true);
              } 
            }
          ]
        );
      } else {
        Alert.alert('Aviso', data.error || 'No se pudo procesar la reserva.');
      }
    } catch {
      Alert.alert('Error', 'Fallo de conexión al enviar la reserva.');
    } finally {
      setProcesando(false);
    }
  };

  const cancelarMiReserva = (idReserva, fechaClase) => {
    Alert.alert(
      'Cancelar Reserva',
      `¿Deseas liberar tu cupo para la clase del ${formatearFechaPeruana(fechaClase)}?`,
      [
        { text: 'No, mantenerla', style: 'cancel' },
        { 
          text: 'Sí, liberar cupo', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_URL}/api/reservas/${idReserva}`, { method: 'DELETE' });
              if (res.ok) {
                await cargarDatos();
                Alert.alert('Cancelada', 'Tu cupo fue liberado correctamente.');
              } else {
                Alert.alert('Error', 'No se pudo cancelar la reserva.');
              }
            } catch {
              Alert.alert('Error', 'Problema al comunicar con el servidor.');
            }
          }
        }
      ]
    );
  };

  const procesarPagoComprobante = async () => {
    if (!usuarioLogueado || !reservaParaPagar) {
      Alert.alert('Error', 'No se ha seleccionado una clase válida.');
      return;
    }

    if (metodoPago === 'Yape' && !fotoVoucherBase64) {
      Alert.alert('Voucher requerido', 'Por favor selecciona la foto de la constancia de Yape o Plin.');
      return;
    }

    setProcesando(true);
    try {
      const comprobanteFinal = fotoVoucherBase64 
        ? fotoVoucherBase64 
        : 'Pago presencial en recepción';

      const idReservaTarget = Number(reservaParaPagar.id_reserva);
      const tarifaReal = usuarioLogueado.tarifa_acordada ? parseFloat(usuarioLogueado.tarifa_acordada) : 50.00;

      const res = await fetch(`${API_URL}/api/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_alumno: usuarioLogueado.id_usuario,
          id_reserva: idReservaTarget,
          metodo: metodoPago,
          monto: tarifaReal,
          comprobante_url: comprobanteFinal,
          estado: 'Pendiente'
        })
      });

      const dataRes = await res.json();

      if (res.ok) {
        setReservas(prev => prev.map(r => {
          if (String(r.id_reserva) === String(idReservaTarget)) {
            return {
              ...r,
              estado_pago: 'Pendiente',
              metodo_pago: metodoPago
            };
          }
          return r;
        }));

        setModalPagoVisible(false);
        setReservaParaPagar(null);
        setFotoVoucherUri(null);
        setFotoVoucherBase64(null);
        
        await cargarDatos();

        Alert.alert(
          '¡Voucher Enviado! ⏳',
          'Tu constancia de abono ha sido enviada a administración para su validación.'
        );
      } else {
        Alert.alert('Aviso', dataRes.error || 'No se pudo registrar el pago.');
      }
    } catch {
      Alert.alert('Error', 'Problema de red con el servidor.');
    } finally {
      setProcesando(false);
    }
  };

  const misReservasActuales = usuarioLogueado 
    ? reservas.filter(r => String(r.id_alumno) === String(usuarioLogueado.id_usuario))
    : [];

  const proximaSesion = misReservasActuales.length > 0 ? misReservasActuales[0] : null;

  const textoLimpio = busquedaCompanero.trim().toLowerCase();
  const companerosFiltrados = textoLimpio.length > 0
    ? alumnos.filter(a => {
        if (!usuarioLogueado) return false;
        const esElMismo = String(a.id_usuario) === String(usuarioLogueado.id_usuario);
        const nombreCompleto = `${a.nombre} ${a.apellido}`.toLowerCase();
        return !esElMismo && nombreCompleto.includes(textoLimpio);
      })
    : [];

  // PANTALLA LOGIN
  if (!usuarioLogueado) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.loginInner}
        >
          <View style={styles.loginCard}>
            <View style={styles.loginIconoBadge}>
              <Text style={{ fontSize: 34 }}>💃</Text>
            </View>

            <Text style={styles.loginTitulo}>Academia de Marinera</Text>
            <Text style={styles.loginSubtitulo}>Portal del Alumno</Text>

            <View style={styles.loginForm}>
              <Text style={styles.loginLabel}>Ingresa tu Número de Celular</Text>
              <TextInput
                style={styles.loginInput}
                placeholder="Ingresa tu número de celular..."
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={celularLogin}
                onChangeText={setCelularLogin}
                autoCapitalize="none"
              />

              <TouchableOpacity 
                style={[styles.loginBoton, { marginTop: 16 }]}
                onPress={handleLoginMovil}
                disabled={cargandoLogin}
              >
                {cargandoLogin ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginBotonTexto}>Ingresar a mis Clases ➔</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // PANTALLA PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saludo}>Alumno(a) Conectado</Text>
            <Text style={styles.nombreUsuario}>
              {usuarioLogueado.nombre} {usuarioLogueado.apellido}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.botonSalir}
            onPress={cerrarSesion}
          >
            <Text style={styles.botonSalirTexto}>Salir 🚪</Text>
          </TouchableOpacity>
        </View>

        {/* PESTAÑAS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBoton, tabActual === 'explorar' && styles.tabBotonActivo]}
            onPress={() => setTabActual('explorar')}
          >
            <Text style={[styles.tabBotonTexto, tabActual === 'explorar' && styles.tabBotonTextoActivo]}>
              📅 Agenda de Clases
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBoton, tabActual === 'mis_reservas' && styles.tabBotonActivo]}
            onPress={() => setTabActual('mis_reservas')}
          >
            <Text style={[styles.tabBotonTexto, tabActual === 'mis_reservas' && styles.tabBotonTextoActivo]}>
              🎫 Mis Pases ({misReservasActuales.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BANNER PRÓXIMO ENSAYO */}
      {proximaSesion && tabActual === 'explorar' && (
        <View style={styles.bannerContainer}>
          <View style={styles.bannerCard}>
            <View style={styles.bannerIconBox}>
              <Text style={{ fontSize: 22 }}>💃</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerEtiqueta}>TU PRÓXIMO ENSAYO</Text>
              <Text style={styles.bannerFecha}>
                {formatearFechaPeruana(proximaSesion.clase_fecha)} • {(proximaSesion.hora_inicio || '').slice(0, 5)} - {(proximaSesion.hora_fin || '').slice(0, 5)}
              </Text>
              <Text style={styles.bannerDetalle}>
                Con {proximaSesion.profesor_nombre || 'Profesor'} ({obtenerIconoModalidad(proximaSesion.modalidad)} {proximaSesion.modalidad})
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* CONTENIDO PRINCIPAL */}
      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.cargandoTexto}>Sincronizando agenda...</Text>
        </View>
      ) : tabActual === 'explorar' ? (
        clases.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.vacioTexto}>No hay clases programadas en este momento.</Text>
          </View>
        ) : (
          <FlatList
            data={clases}
            keyExtractor={(item) => (item.id_horario ? String(item.id_horario) : Math.random().toString())}
            contentContainerStyle={styles.lista}
            refreshControl={
              <RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={['#0284c7']} />
            }
            renderItem={({ item, index }) => {
              const { yaInscrito, cuposRestantes, estaLleno, esIlimitado } = obtenerEstadoClase(item);
              const esNuevoDia = index === 0 || clases[index - 1].fecha !== item.fecha;
              const iconoMod = obtenerIconoModalidad(item.modalidad);

              return (
                <View>
                  {esNuevoDia && (
                    <View style={styles.separadorFechaContainer}>
                      <View style={styles.separadorBadge}>
                        <Text style={styles.separadorFechaTexto}>📆 {formatearFechaPeruana(item.fecha)}</Text>
                      </View>
                      <View style={styles.separadorLinea} />
                    </View>
                  )}

                  <View style={[styles.card, yaInscrito && styles.cardInscrito, estaLleno && !yaInscrito && styles.cardLleno]}>
                    <View style={styles.cardInfo}>
                      <Text style={styles.horarioTexto}>
                        {(item.hora_inicio || '').slice(0, 5)} - {(item.hora_fin || '').slice(0, 5)}
                      </Text>

                      <Text style={styles.detalleTexto}>
                        👨‍🏫 Profesor: <Text style={styles.bold}>{item.profesor_nombre ? `${item.profesor_nombre} ${item.profesor_apellido}` : 'Por asignar'}</Text>
                      </Text>

                      <Text style={styles.detalleTexto}>
                        {iconoMod} Modalidad: <Text style={styles.bold}>{item.modalidad}</Text>
                      </Text>

                      <Text style={[styles.cuposTexto, estaLleno && styles.cuposLleno]}>
                        {esIlimitado 
                          ? '🟢 Cupos Ilimitados' 
                          : estaLleno 
                            ? '🔴 Turno Completo' 
                            : `🟢 Disponibles: ${cuposRestantes} de ${item.capacidad_max}`}
                      </Text>
                    </View>

                    <View>
                      {yaInscrito ? (
                        <View style={styles.botonYaInscrito}>
                          <Text style={styles.botonYaInscritoTexto}>Inscrito ✅</Text>
                        </View>
                      ) : estaLleno ? (
                        <View style={styles.botonAgotado}>
                          <Text style={styles.botonAgotadoTexto}>Lleno</Text>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.botonReservar}
                          onPress={() => abrirModalReserva(item)}
                        >
                          <Text style={styles.botonTexto}>Reservar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )
      ) : (
        /* VISTA MIS PASES */
        misReservasActuales.length === 0 ? (
          <View style={styles.center}>
            <Text style={{ fontSize: 44, marginBottom: 12 }}>🎫</Text>
            <Text style={styles.vacioTitulo}>Sin pases reservados</Text>
            <Text style={styles.vacioTexto}>Explora la agenda y asegura tu horario de ensayo.</Text>
            <TouchableOpacity 
              style={[styles.botonReservar, { marginTop: 18 }]}
              onPress={() => setTabActual('explorar')}
            >
              <Text style={styles.botonTexto}>Explorar Horarios</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={misReservasActuales}
            keyExtractor={(item) => String(item.id_reserva)}
            contentContainerStyle={styles.lista}
            refreshControl={
              <RefreshControl refreshing={refrescando} onRefresh={onRefresh} colors={['#0284c7']} />
            }
            renderItem={({ item }) => {
              const codigoPase = `#CUP-${String(item.id_reserva).slice(-4).toUpperCase()}`;
              const iconoMod = obtenerIconoModalidad(item.modalidad);

              const pagoEnLista = pagos.find(p => String(p.id_reserva) === String(item.id_reserva));
              const estadoPagoFinal = item.estado_pago || (pagoEnLista ? pagoEnLista.estado : null);
              const metodoPagoFinal = item.metodo_pago || (pagoEnLista ? pagoEnLista.metodo : 'Voucher');

              const claseYaTomada = item.estado_asistencia === 'Asistio' || item.estado_asistencia === 'Asistió';

              return (
                <View style={styles.ticketCard}>
                  <View style={styles.ticketHeader}>
                    <View>
                      <Text style={styles.ticketBadgeTipo}>PASE DE ACCESO</Text>
                      <Text style={styles.ticketCodigo}>{codigoPase}</Text>
                    </View>
                    <View style={[
                      styles.ticketEstadoBadge,
                      claseYaTomada ? styles.estadoAsistio : styles.estadoPendiente
                    ]}>
                      <Text style={[
                        styles.ticketEstadoTexto,
                        claseYaTomada ? styles.estadoAsistioTexto : styles.estadoPendienteTexto
                      ]}>
                        {item.estado_asistencia === 'Pendiente' ? 'Confirmado' : item.estado_asistencia}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ticketDivider} />

                  <View style={styles.ticketBody}>
                    <Text style={styles.ticketFecha}>📅 {formatearFechaPeruana(item.clase_fecha)}</Text>
                    <Text style={styles.ticketHorario}>⏰ {(item.hora_inicio || '').slice(0, 5)} - {(item.hora_fin || '').slice(0, 5)}</Text>
                    
                    <View style={styles.ticketDetallesRow}>
                      <Text style={styles.ticketDetalleItem}>
                        👨‍🏫 <Text style={styles.bold}>{item.profesor_nombre || 'Profesor'}</Text>
                      </Text>
                      <Text style={styles.ticketDetalleItem}>
                        {iconoMod} <Text style={styles.bold}>{item.modalidad}</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={styles.ticketFooter}>
                    {estadoPagoFinal === 'Confirmado' ? (
                      <View style={styles.badgePagoConfirmado}>
                        <Text style={styles.badgePagoConfirmadoTexto}>
                          ✅ Pago Confirmado
                        </Text>
                      </View>
                    ) : estadoPagoFinal === 'Pendiente' ? (
                      <TouchableOpacity
                        style={styles.badgePagoVerificando}
                        onPress={() => {
                          Alert.alert(
                            'Comprobante en Revisión ⏳',
                            `Tu constancia (${metodoPagoFinal}) ya fue recibida y está en proceso de validación.`
                          );
                        }}
                      >
                        <Text style={styles.badgePagoVerificandoTexto}>
                          ⏳ Voucher en Verificación
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.botonPagarPase}
                        onPress={() => {
                          setReservaParaPagar(item);
                          setFotoVoucherUri(null);
                          setFotoVoucherBase64(null);
                          setModalPagoVisible(true);
                        }}
                      >
                        <Text style={styles.botonPagarPaseTexto}>
                          💳 Registrar Pago
                        </Text>
                      </TouchableOpacity>
                    )}

                    {!claseYaTomada ? (
                      <TouchableOpacity
                        style={styles.ticketBotonCancelar}
                        onPress={() => cancelarMiReserva(item.id_reserva, item.clase_fecha)}
                      >
                        <Text style={styles.ticketBotonCancelarTexto}>Liberar Cupo</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.badgeClaseCompletada}>
                        <Text style={styles.badgeClaseCompletadaTexto}>Clase Realizada 💃</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )
      )}

      {/* MODAL DE PAGO: CON SELECTOR YAPE / PLIN */}
      <Modal
        visible={modalPagoVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalPagoVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentPago}>
            <Text style={styles.modalTitulo}>Registrar Pago de Clase</Text>
            <Text style={styles.modalSubtitulo}>
              {reservaParaPagar 
                ? `Pase #${String(reservaParaPagar.id_reserva).slice(-4).toUpperCase()} • Elige tu método de pago`
                : `Elige tu método de pago`}
            </Text>

            <View style={styles.tabPagoContainer}>
              <TouchableOpacity
                style={[styles.tabPagoBoton, metodoPago === 'Yape' && styles.tabPagoBotonActivo]}
                onPress={() => { setMetodoPago('Yape'); setFotoVoucherUri(null); setFotoVoucherBase64(null); }}
              >
                <Text style={[styles.tabPagoTexto, metodoPago === 'Yape' && styles.tabPagoTextoActivo]}>📱 Yape / Plin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabPagoBoton, metodoPago === 'Efectivo' && styles.tabPagoBotonActivo]}
                onPress={() => { setMetodoPago('Efectivo'); setFotoVoucherUri(null); setFotoVoucherBase64(null); }}
              >
                <Text style={[styles.tabPagoTexto, metodoPago === 'Efectivo' && styles.tabPagoTextoActivo]}>💵 Efectivo</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {metodoPago === 'Yape' ? (
                <View style={styles.pagoBoxYape}>
                  <View style={styles.yapeHeaderRow}>
                    <Text style={styles.yapeBadge}>NÚMERO YAPE / PLIN OFICIAL</Text>
                  </View>

                  <View style={styles.datoPagoRowConBoton}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.datoPagoLabel}>📱 Número para Yape / Plin:</Text>
                      <Text selectable={true} style={styles.datoPagoValorGrande}>989406581</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.botonCopiar}
                      onPress={() => copiarAlPortapapeles('989406581', 'Número de Yape / Plin')}
                    >
                      <Text style={styles.botonCopiarTexto}>📋 Copiar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.adjuntarSection}>
                    <Text style={styles.adjuntarTitulo}>Adjuntar Captura de Yape o Plin:</Text>
                    {fotoVoucherUri ? (
                      <View style={styles.previewContainer}>
                        <Image source={{ uri: fotoVoucherUri }} style={styles.previewImagen} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.previewTexto}>✅ Captura lista</Text>
                          <TouchableOpacity onPress={seleccionarFotoDeGaleria}>
                            <Text style={styles.cambiarFotoTexto}>Cambiar captura</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.botonAdjuntar}
                        onPress={seleccionarFotoDeGaleria}
                      >
                        <Text style={styles.botonAdjuntarTexto}>📷 Seleccionar Foto de Constancia</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <View style={styles.pagoBoxEfectivo}>
                  <View style={styles.efectivoHeaderRow}>
                    <Text style={styles.efectivoBadge}>PAGO EN RECEPCIÓN</Text>
                  </View>

                  <View style={styles.efectivoAvisoBox}>
                    <Text style={{ fontSize: 26, textAlign: 'center', marginBottom: 8 }}>💵</Text>
                    <Text style={styles.efectivoTextoPrincipal}>
                      Pago en efectivo el día de la clase
                    </Text>
                    <Text style={styles.efectivoSubtexto}>
                      Puedes abonar directamente al ingresar al ensayo en recepción.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.accionesModal}>
              <TouchableOpacity 
                style={styles.botonCancelarModal}
                onPress={() => setModalPagoVisible(false)}
                disabled={procesando}
              >
                <Text style={styles.cancelarTexto}>Cerrar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botonConfirmarPago}
                onPress={procesarPagoComprobante}
                disabled={procesando}
              >
                {procesando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmarTexto}>
                    {metodoPago === 'Efectivo' ? 'Confirmar Pago Presencial' : 'Enviar Voucher'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CONFIRMAR RESERVA */}
      <Modal
        visible={modalReservaVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setModalReservaVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitulo}>Confirmar Cupo</Text>
            <Text style={styles.modalSubtitulo}>
              ¿Reservar cupo para <Text style={styles.bold}>{usuarioLogueado?.nombre} {usuarioLogueado?.apellido}</Text>?
            </Text>

            {claseSeleccionada && (
              <View style={styles.resumenBox}>
                <Text style={styles.resumenItem}>📅 <Text style={styles.bold}>Fecha:</Text> {formatearFechaPeruana(claseSeleccionada.fecha)}</Text>
                <Text style={styles.resumenItem}>⏰ <Text style={styles.bold}>Horario:</Text> {(claseSeleccionada.hora_inicio || '').slice(0, 5)} - {(claseSeleccionada.hora_fin || '').slice(0, 5)}</Text>
                <Text style={styles.resumenItem}>{obtenerIconoModalidad(claseSeleccionada.modalidad)} <Text style={styles.bold}>Modalidad:</Text> {claseSeleccionada.modalidad}</Text>
                <Text style={styles.resumenItem}>👨‍🏫 <Text style={styles.bold}>Profesor:</Text> {claseSeleccionada.profesor_nombre ? `${claseSeleccionada.profesor_nombre} ${claseSeleccionada.profesor_apellido}` : 'Por asignar'}</Text>
              </View>
            )}

            {claseSeleccionada && claseSeleccionada.modalidad === 'Pareja' && (() => {
              const { cuposRestantes } = obtenerEstadoClase(claseSeleccionada);
              const hayEspacioParaDos = cuposRestantes >= 2;

              return (
                <View style={styles.parejaSection}>
                  <Text style={styles.parejaTitulo}>Modalidad en Pareja (2 cupos):</Text>

                  <View style={styles.parejaOpcionesRow}>
                    <TouchableOpacity
                      style={[styles.parejaOpcionBtn, !conCompanero && styles.parejaOpcionBtnActivo]}
                      onPress={() => { setConCompanero(false); setCompaneroSeleccionado(null); }}
                    >
                      <Text style={[styles.parejaOpcionTexto, !conCompanero && styles.parejaOpcionTextoActivo]}>
                        💃 Vengo solo (1 cupo)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.parejaOpcionBtn, 
                        conCompanero && styles.parejaOpcionBtnActivo,
                        !hayEspacioParaDos && styles.parejaOpcionBtnDesactivado
                      ]}
                      onPress={() => {
                        if (!hayEspacioParaDos) {
                          Alert.alert('Solo queda 1 cupo', 'Solo queda 1 espacio libre en este turno.');
                          return;
                        }
                        setConCompanero(true);
                      }}
                    >
                      <Text style={[styles.parejaOpcionTexto, conCompanero && styles.parejaOpcionTextoActivo]}>
                        💃🕺 En Pareja (2 cupos)
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {conCompanero && (
                    <View style={styles.companeroContainer}>
                      <Text style={styles.companeroLabel}>Buscar a tu pareja de baile:</Text>
                      
                      <TextInput
                        style={styles.companeroInput}
                        placeholder="Escribe su nombre o apellido..."
                        placeholderTextColor="#94a3b8"
                        value={busquedaCompanero}
                        onChangeText={setBusquedaCompanero}
                        autoCapitalize="words"
                      />

                      {companeroSeleccionado ? (
                        <View style={styles.companeroElegidoBox}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.companeroElegidoNombre}>
                              💃🕺 {companeroSeleccionado.nombre} {companeroSeleccionado.apellido}
                            </Text>
                            <Text style={styles.companeroElegidoSub}>
                              Pareja de baile seleccionada
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => {
                              setCompaneroSeleccionado(null);
                              setBusquedaCompanero('');
                            }}
                            style={styles.companeroCambiarBtn}
                          >
                            <Text style={styles.companeroCambiarTexto}>Cambiar</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        busquedaCompanero.trim().length === 0 ? (
                          <View style={styles.companeroGuiaBox}>
                            <Text style={styles.companeroGuiaTexto}>
                              🔒 Escribe para buscar a tu pareja de baile en el padrón.
                            </Text>
                          </View>
                        ) : (
                          <ScrollView style={styles.companerosListaScroll} nestedScrollEnabled={true}>
                            {companerosFiltrados.length === 0 ? (
                              <Text style={styles.companeroVacio}>No se encontraron alumnos con ese nombre.</Text>
                            ) : (
                              companerosFiltrados.map((c) => (
                                <TouchableOpacity
                                  key={c.id_usuario}
                                  style={styles.companeroItem}
                                  onPress={() => {
                                    setCompaneroSeleccionado(c);
                                    setBusquedaCompanero('');
                                  }}
                                >
                                  <Text style={styles.companeroItemNombre}>{c.nombre} {c.apellido}</Text>
                                  <Text style={styles.companeroItemElegir}>Seleccionar ➔</Text>
                                </TouchableOpacity>
                              ))
                            )}
                          </ScrollView>
                        )
                      )}
                    </View>
                  )}
                </View>
              );
            })()}

            <View style={styles.accionesModal}>
              <TouchableOpacity 
                style={styles.botonCancelarModal}
                onPress={() => setModalReservaVisible(false)}
                disabled={procesando}
              >
                <Text style={styles.cancelarTexto}>Volver</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.botonConfirmarModal}
                onPress={confirmarReserva}
                disabled={procesando}
              >
                {procesando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmarTexto}>
                    {claseSeleccionada?.modalidad === 'Pareja' && conCompanero ? 'Reservar 2 Cupos' : 'Confirmar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
  },
  loginInner: {
    padding: 24,
    justifyContent: 'center',
  },
  loginCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  loginIconoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loginTitulo: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  loginSubtitulo: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 20,
  },
  loginForm: {
    width: '100%',
  },
  loginLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  loginInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '700',
  },
  loginBoton: {
    backgroundColor: '#0284c7',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBotonTexto: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  saludo: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  nombreUsuario: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  botonSalir: {
    backgroundColor: '#fee2e2',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  botonSalirTexto: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 10,
    gap: 4,
  },
  tabBoton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBotonActivo: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBotonTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBotonTextoActivo: {
    color: '#0f172a',
    fontWeight: '800',
  },

  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  bannerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEtiqueta: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  bannerFecha: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  bannerDetalle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 1,
  },

  separadorFechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 8,
  },
  separadorBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  separadorFechaTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  separadorLinea: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },

  lista: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardInscrito: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  cardLleno: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  horarioTexto: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  detalleTexto: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  bold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  cuposTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginTop: 6,
  },
  cuposLleno: {
    color: '#dc2626',
  },
  botonReservar: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  botonTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  botonYaInscrito: {
    backgroundColor: '#dcfce7',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  botonYaInscritoTexto: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 12,
  },
  botonAgotado: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  botonAgotadoTexto: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },

  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#f8fafc',
  },
  ticketBadgeTipo: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  ticketCodigo: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0284c7',
    marginTop: 2,
  },
  ticketEstadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  estadoPendiente: {
    backgroundColor: '#fef9c3',
  },
  estadoPendienteTexto: {
    color: '#854d0e',
    fontSize: 11,
    fontWeight: '800',
  },
  estadoAsistio: {
    backgroundColor: '#dcfce7',
  },
  estadoAsistioTexto: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '800',
  },
  ticketDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  ticketBody: {
    padding: 16,
  },
  ticketFecha: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  ticketHorario: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
    marginBottom: 10,
  },
  ticketDetallesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
  },
  ticketDetalleItem: {
    fontSize: 13,
    color: '#334155',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  botonPagarPase: {
    backgroundColor: '#e0f2fe',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  botonPagarPaseTexto: {
    color: '#0284c7',
    fontWeight: '800',
    fontSize: 12,
  },

  badgePagoConfirmado: {
    backgroundColor: '#dcfce7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  badgePagoConfirmadoTexto: {
    color: '#166534',
    fontWeight: '800',
    fontSize: 12,
  },
  badgePagoVerificando: {
    backgroundColor: '#fef9c3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  badgePagoVerificandoTexto: {
    color: '#854d0e',
    fontWeight: '800',
    fontSize: 12,
  },

  ticketBotonCancelar: {
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  ticketBotonCancelarTexto: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 11,
  },
  badgeClaseCompletada: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeClaseCompletadaTexto: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 11,
  },

  modalContentPago: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    maxHeight: '90%',
  },
  tabPagoContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    gap: 4,
  },
  tabPagoBoton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabPagoBotonActivo: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabPagoTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabPagoTextoActivo: {
    color: '#0f172a',
    fontWeight: '800',
  },

  pagoBoxYape: {
    backgroundColor: '#faf5ff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3e8ff',
  },
  yapeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  yapeBadge: {
    backgroundColor: '#7e22ce',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  datoPagoRowConBoton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    marginBottom: 12,
  },
  datoPagoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  datoPagoValorGrande: {
    fontSize: 18,
    fontWeight: '900',
    color: '#7e22ce',
    letterSpacing: 0.5,
  },
  botonCopiar: {
    backgroundColor: '#f3e8ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8b4fe',
  },
  botonCopiarTexto: {
    color: '#7e22ce',
    fontWeight: '800',
    fontSize: 11,
  },

  pagoBoxEfectivo: {
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  efectivoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  efectivoBadge: {
    backgroundColor: '#16a34a',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  efectivoAvisoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  efectivoTextoPrincipal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803d',
    textAlign: 'center',
    marginBottom: 4,
  },
  efectivoSubtexto: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  adjuntarSection: {
    marginTop: 10,
  },
  adjuntarTitulo: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 6,
  },
  botonAdjuntar: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  botonAdjuntarTexto: {
    color: '#0284c7',
    fontWeight: '800',
    fontSize: 13,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  previewImagen: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  previewTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  cambiarFotoTexto: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '700',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  botonConfirmarPago: {
    flex: 1.6,
    paddingVertical: 12,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    alignItems: 'center',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  cargandoTexto: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 14,
  },
  vacioTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  vacioTexto: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    maxHeight: '90%',
  },
  modalTitulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  modalSubtitulo: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  resumenBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  resumenItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },

  parejaSection: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  parejaTitulo: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369a1',
    marginBottom: 8,
  },
  parejaOpcionesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  parejaOpcionBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  parejaOpcionBtnActivo: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  parejaOpcionBtnDesactivado: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  parejaOpcionTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  parejaOpcionTextoActivo: {
    color: '#ffffff',
    fontWeight: '800',
  },
  companeroContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0f2fe',
  },
  companeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  companeroInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: '#0f172a',
    marginBottom: 6,
  },
  companeroGuiaBox: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  companeroGuiaTexto: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
  },
  companerosListaScroll: {
    maxHeight: 120,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  companeroItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  companeroItemNombre: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  companeroItemElegir: {
    fontSize: 11,
    color: '#0284c7',
    fontWeight: '800',
  },
  companeroVacio: {
    padding: 12,
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  companeroElegidoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    padding: 10,
  },
  companeroElegidoNombre: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  companeroElegidoSub: {
    fontSize: 11,
    color: '#15803d',
    marginTop: 1,
  },
  companeroCambiarBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  companeroCambiarTexto: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '800',
  },

  accionesModal: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  botonCancelarModal: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  botonConfirmarModal: {
    flex: 1.5,
    paddingVertical: 12,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmarTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});