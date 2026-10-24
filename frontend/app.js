// Interfaz de demostracion de AguaFix. Habla solo con la API publica:
// no contiene credenciales ni configuracion del servidor.
(function () {
  'use strict';

  // Mismo origen por defecto (la API sirve esta carpeta). Para otra URL: ?api=https://...
  var API = new URLSearchParams(location.search).get('api') || '';
  var MAX_MB = 5;
  var TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
  var SEVERIDAD = { low: 'Baja', medium: 'Media', high: 'Alta' };

  var formulario = document.getElementById('formulario');
  var inputFoto = document.getElementById('photo');
  var vistaPrevia = document.getElementById('vista-previa');
  var imagenPrevia = document.getElementById('imagen-previa');
  var botonEnviar = document.getElementById('boton-enviar');
  var estado = document.getElementById('estado');
  var lista = document.getElementById('lista');
  var estadoLista = document.getElementById('estado-lista');
  var urlPrevia = null;

  document.getElementById('limite-mb').textContent = String(MAX_MB);

  function mostrarEstado(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = 'estado' + (tipo ? ' ' + tipo : '');
  }

  /** Convierte la respuesta de error de Nest en un texto legible. */
  function mensajeDeError(cuerpo, status) {
    if (status === 413) return 'La fotografía supera el tamaño máximo permitido.';
    if (cuerpo && cuerpo.message) {
      return Array.isArray(cuerpo.message) ? cuerpo.message.join(' ') : String(cuerpo.message);
    }
    return 'Error ' + status + ' al comunicarse con el servidor.';
  }

  function validarFoto(archivo) {
    if (!archivo) return 'Adjunta una fotografía de la fuga.';
    if (TIPOS.indexOf(archivo.type) === -1) return 'La fotografía debe ser JPG, PNG o WEBP.';
    if (archivo.size > MAX_MB * 1024 * 1024) return 'La fotografía no debe superar ' + MAX_MB + ' MB.';
    return '';
  }

  inputFoto.addEventListener('change', function () {
    if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    urlPrevia = null;
    var archivo = inputFoto.files[0];
    var error = validarFoto(archivo);

    if (!archivo || error) {
      vistaPrevia.hidden = true;
      imagenPrevia.removeAttribute('src');
      if (archivo) mostrarEstado(estado, error, 'error');
      return;
    }

    urlPrevia = URL.createObjectURL(archivo);
    imagenPrevia.src = urlPrevia;
    vistaPrevia.hidden = false;
    mostrarEstado(estado, '', '');
  });

  formulario.addEventListener('submit', function (evento) {
    evento.preventDefault();

    if (!formulario.checkValidity()) {
      formulario.reportValidity();
      return;
    }
    var errorFoto = validarFoto(inputFoto.files[0]);
    if (errorFoto) {
      mostrarEstado(estado, errorFoto, 'error');
      return;
    }

    var datos = new FormData();
    ['address', 'description', 'severity', 'reporterPhone'].forEach(function (campo) {
      datos.append(campo, formulario.elements[campo].value.trim());
    });
    datos.append('photo', inputFoto.files[0]);

    botonEnviar.disabled = true;
    mostrarEstado(estado, 'Enviando reporte y subiendo la fotografía…', '');

    fetch(API + '/reports', { method: 'POST', body: datos })
      .then(function (respuesta) {
        return respuesta.json().catch(function () { return null; }).then(function (cuerpo) {
          if (!respuesta.ok) throw new Error(mensajeDeError(cuerpo, respuesta.status));
          return cuerpo;
        });
      })
      .then(function (reporte) {
        mostrarEstado(estado, 'Reporte #' + reporte.id + ' registrado. La cuadrilla fue notificada.', 'ok');
        formulario.reset();
        vistaPrevia.hidden = true;
        imagenPrevia.removeAttribute('src');
        cargarReportes();
      })
      .catch(function (error) {
        mostrarEstado(estado, error.message || 'No se pudo enviar el reporte.', 'error');
      })
      .finally(function () {
        botonEnviar.disabled = false;
      });
  });

  function crearTarjeta(reporte) {
    var item = document.createElement('li');
    item.className = 'reporte';

    if (reporte.photoUrl) {
      var img = document.createElement('img');
      img.src = reporte.photoUrl;
      img.alt = 'Fotografía de la fuga en ' + reporte.address;
      img.loading = 'lazy';
      item.appendChild(img);
    } else {
      var sinFoto = document.createElement('div');
      sinFoto.className = 'sin-foto';
      sinFoto.textContent = 'Reporte anterior a las fotografías: sin foto';
      item.appendChild(sinFoto);
    }

    var cuerpo = document.createElement('div');
    cuerpo.className = 'cuerpo';

    var titulo = document.createElement('h3');
    titulo.textContent = '#' + reporte.id + ' · ' + reporte.address;

    var chips = document.createElement('p');
    var chip = document.createElement('span');
    chip.className = 'chip ' + (SEVERIDAD[reporte.severity] ? reporte.severity : '');
    chip.textContent = 'Severidad ' + (SEVERIDAD[reporte.severity] || reporte.severity);
    chips.appendChild(chip);
    if (reporte.isResolved) {
      var resuelto = document.createElement('span');
      resuelto.className = 'chip resuelto';
      resuelto.textContent = 'Resuelto';
      chips.appendChild(document.createTextNode(' '));
      chips.appendChild(resuelto);
    }

    var descripcion = document.createElement('p');
    descripcion.textContent = reporte.description;

    var telefono = document.createElement('p');
    telefono.textContent = 'Tel. ' + reporte.reporterPhone;

    var fecha = document.createElement('p');
    fecha.className = 'meta';
    fecha.textContent = new Date(reporte.createdAt).toLocaleString('es-MX');

    cuerpo.append(titulo, chips, descripcion, telefono, fecha);

    if (reporte.repairPhotoUrl) {
      var enlace = document.createElement('a');
      enlace.href = reporte.repairPhotoUrl;
      enlace.target = '_blank';
      enlace.rel = 'noopener noreferrer';
      enlace.textContent = 'Ver foto de la reparación';
      cuerpo.appendChild(enlace);
    }

    item.appendChild(cuerpo);
    return item;
  }

  function cargarReportes() {
    mostrarEstado(estadoLista, 'Cargando reportes…', '');

    fetch(API + '/reports')
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('Error ' + respuesta.status + ' al cargar los reportes.');
        return respuesta.json();
      })
      .then(function (reportes) {
        lista.replaceChildren.apply(lista, reportes.map(crearTarjeta));
        mostrarEstado(estadoLista, reportes.length ? '' : 'Aún no hay reportes registrados.', '');
      })
      .catch(function (error) {
        mostrarEstado(estadoLista, error.message || 'No se pudieron cargar los reportes.', 'error');
      });
  }

  document.getElementById('boton-recargar').addEventListener('click', cargarReportes);
  cargarReportes();
})();
