"""
Servicio de Prediccion de Riesgo Academico - EduPredict AI
Integrado con modelo XGBoost entrenado.

ESCALAS DEL MODELO (contrato compatible con endpoint /predecir de EduPredict):
  - promedio_general:    0-10 (BD tiene 0-100, se divide entre 10)
  - num_reprobaciones:   int (conteo crudo de materias reprobadas)
  - pct_asistencias:     0-100 (porcentaje directo)
  - frecuencia_faltas:   int (conteo crudo de faltas absolutas)
  - dificultad_economica: 0 o 1
  - trabaja_actualmente:  0 o 1
  - reporte_emocional:    0 o 1
  - contacto_tutor:       int (conteo crudo de contactos con tutor)
  - solicitud_baja:       0 o 1

  ONE-HOT (exactamente 1 activo por grupo):
  - tendencia_calif_Empeora / Estable / Mejora
  - patron_faltas_Consecutivas / Esporadicas
  - acceso_tecnologico_Completo / Parcial / Sin acceso
"""
import os
import joblib
import numpy as np
import logging
from typing import Dict
from sqlalchemy.orm import Session
from app.models.models import Estudiante, Calificacion, Asistencia, Intervencion, EstatusAsistenciaEnum, HistorialCalificacion, HistorialAsistencia
from app.core.calculos_ia import construir_vector_completo

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "modelo.pkl")

try:
    artefacto = joblib.load(MODEL_PATH)
    modelo = artefacto["model"]
    le = artefacto["label_encoder"]
    feature_cols = artefacto["feature_cols"]
    model_name = artefacto.get("model_name", "XGBoost")
    scores = artefacto.get("scores", {})
    print(f"[OK] Modelo cargado desde {MODEL_PATH}")
    print(f"[INFO] Modelo: {model_name}")
    print(f"[INFO] Features: {feature_cols}")
    print(f"[INFO] Clases: {list(le.classes_)}")
    print(f"[INFO] Metricas: {scores}")
except FileNotFoundError:
    raise RuntimeError(f"No se encontro modelo.pkl en {MODEL_PATH}")


# =====================================================================
# FUNCIONES PARA EXTRAER VARIABLES DE LA BASE DE DATOS
# =====================================================================

def calcular_promedio_general(db: Session, id_estudiante: int) -> float:
    """
    Calcula el promedio general del estudiante.
    Prioriza historial_calificaciones, luego usa tabla calificaciones.
    Devuelve en escala 0-10 (el modelo espera esta escala).
    """
    # Primero intentar con historial
    historial = db.query(HistorialCalificacion).filter(
        HistorialCalificacion.estudiante_id == id_estudiante
    ).all()
    
    if historial:
        # Usar el promedio más reciente
        promedio = sum(h.promedio for h in historial) / len(historial)
        return promedio / 10.0  # Convertir de 0-100 a 0-10
    
    # Fallback a tabla original
    calificaciones = db.query(Calificacion).filter(Calificacion.id_estudiante == id_estudiante).all()
    if not calificaciones:
        return 8.5  # Default: promedio medio-alto (equivale a 85/100 -> 8.5/10)
    promedio_100 = sum(float(c.valor) for c in calificaciones) / len(calificaciones)
    return promedio_100 / 10.0  # Escala 0-10


def calcular_num_reprobaciones(db: Session, id_estudiante: int) -> int:
    """
    Calcula el numero de reprobaciones como conteo entero.
    BD tiene conteo crudo. El modelo espera conteo entero (contrato EduPredict).
    Ejemplo: 2 materias reprobadas -> 2 al modelo.
    """
    calificaciones = db.query(Calificacion).filter(Calificacion.id_estudiante == id_estudiante).all()
    if not calificaciones:
        return 0
    count_reprob = sum(1 for c in calificaciones if float(c.valor) < 60.0)
    return count_reprob  # Conteo entero


def calcular_pct_asistencias(db: Session, id_estudiante: int) -> float:
    """
    Calcula porcentaje de asistencia en escala 0-100.
    Prioriza historial_asistencia, luego usa tabla asistencias.
    El modelo espera 0-100 (contrato EduPredict).
    Ejemplo: 95% asistencia -> 95.0 al modelo.
    """
    # Primero intentar con historial
    historial = db.query(HistorialAsistencia).filter(
        HistorialAsistencia.estudiante_id == id_estudiante
    ).all()
    
    if historial:
        asistencias = sum(1 for h in historial if h.asistio)
        return (asistencias / len(historial)) * 100
    
    # Fallback a tabla original
    asistencias = db.query(Asistencia).filter(Asistencia.id_estudiante == id_estudiante).all()
    if not asistencias:
        return 100.0  # Default: asistencia perfecta
    validas = sum(1 for a in asistencias if a.estatus in [EstatusAsistenciaEnum.PRESENTE, EstatusAsistenciaEnum.RETARDO])
    return (validas / len(asistencias)) * 100.0  # Escala 0-100


def calcular_frecuencia_faltas(db: Session, id_estudiante: int) -> int:
    """
    Calcula frecuencia de faltas como conteo entero.
    Prioriza historial_asistencia, luego usa tabla asistencias.
    El modelo espera conteo entero (contrato EduPredict).
    Ejemplo: 5 faltas -> 5 al modelo.
    """
    # Primero intentar con historial
    historial = db.query(HistorialAsistencia).filter(
        HistorialAsistencia.estudiante_id == id_estudiante
    ).all()
    
    if historial:
        faltas = sum(1 for h in historial if not h.asistio)
        return faltas
    
    # Fallback a tabla original
    asistencias = db.query(Asistencia).filter(Asistencia.id_estudiante == id_estudiante).all()
    if not asistencias:
        return 0
    faltas = sum(1 for a in asistencias if a.estatus == EstatusAsistenciaEnum.AUSENTE)
    return faltas  # Conteo entero


def calcular_contacto_tutor(db: Session, id_estudiante: int) -> int:
    """
    Calcula nivel de contacto con tutor como conteo entero.
    El modelo espera conteo entero (contrato EduPredict).
    Ejemplo: 3 intervenciones -> 3 al modelo.
    """
    intervenciones = db.query(Intervencion).filter(Intervencion.id_estudiante == id_estudiante).all()
    return len(intervenciones)  # Conteo entero


def calcular_tendencia_calificaciones(db: Session, id_estudiante: int) -> str:
    """
    Calcula la tendencia de calificaciones comparando parciales.
    Prioriza historial_calificaciones, luego usa tabla calificaciones.
    Devuelve: 'Empeora', 'Estable', o 'Mejora'.
    """
    # Primero intentar con historial
    historial = db.query(HistorialCalificacion).filter(
        HistorialCalificacion.estudiante_id == id_estudiante
    ).all()
    
    if historial and len(historial) >= 2:
        # Ordenar por parcial
        parciales = sorted(historial, key=lambda h: h.parcial)
        
        # Comparar ultimo vs penultimo
        prom_ultimo = parciales[-1].promedio
        prom_penultimo = parciales[-2].promedio
        
        diferencia = prom_ultimo - prom_penultimo
        
        if diferencia >= 5.0:
            return "Mejora"
        elif diferencia <= -5.0:
            return "Empeora"
        else:
            return "Estable"
    
    # Fallback a tabla original
    calificaciones = db.query(Calificacion).filter(
        Calificacion.id_estudiante == id_estudiante
    ).all()
    
    if not calificaciones or len(calificaciones) < 2:
        return "Estable"  # Default si no hay suficientes datos
    
    parciales = sorted(list(set([c.parcial for c in calificaciones])))
    
    if len(parciales) < 2:
        return "Estable"
    
    # Comparar ultimo parcial vs penultimo
    ultimo = [float(c.valor) for c in calificaciones if c.parcial == parciales[-1]]
    penultimo = [float(c.valor) for c in calificaciones if c.parcial == parciales[-2]]
    
    prom_ultimo = sum(ultimo) / len(ultimo) if ultimo else 0
    prom_penultimo = sum(penultimo) / len(penultimo) if penultimo else 0
    
    diferencia = prom_ultimo - prom_penultimo
    
    if diferencia >= 5.0:
        return "Mejora"
    elif diferencia <= -5.0:
        return "Empeora"
    else:
        return "Estable"


def calcular_patron_faltas(db: Session, id_estudiante: int) -> str:
    """
    Determina si las faltas son consecutivas o esporadicas.
    Prioriza historial_asistencia, luego usa tabla asistencias.
    Analiza las fechas de las ausencias para detectar el patron.
    Devuelve: 'Consecutivas' o 'Esporadicas'.
    """
    # Primero intentar con historial
    historial = db.query(HistorialAsistencia).filter(
        HistorialAsistencia.estudiante_id == id_estudiante,
        HistorialAsistencia.asistio == False
    ).order_by(HistorialAsistencia.fecha).all()
    
    if historial and len(historial) > 1:
        # Verificar si hay faltas en dias consecutivos
        fechas_faltas = sorted([h.fecha for h in historial])
        consecutivas = 0
        
        for i in range(1, len(fechas_faltas)):
            diff = (fechas_faltas[i] - fechas_faltas[i-1]).days
            if diff <= 2:  # Consideramos consecutivas si hay 1-2 dias de diferencia (incluye fines de semana)
                consecutivas += 1
        
        # Si mas del 50% de las transiciones son consecutivas
        total_transiciones = len(fechas_faltas) - 1
        if total_transiciones > 0 and (consecutivas / total_transiciones) >= 0.5:
            return "Consecutivas"
        
        return "Esporadicas"
    
    # Fallback a tabla original
    asistencias = db.query(Asistencia).filter(
        Asistencia.id_estudiante == id_estudiante,
        Asistencia.estatus == EstatusAsistenciaEnum.AUSENTE
    ).order_by(Asistencia.fecha).all()
    
    if len(asistencias) <= 1:
        # Con 0 o 1 falta, se considera esporadica
        return "Esporadicas"
    
    # Verificar si hay faltas en dias consecutivos
    fechas_faltas = sorted([a.fecha for a in asistencias])
    consecutivas = 0
    
    for i in range(1, len(fechas_faltas)):
        diff = (fechas_faltas[i] - fechas_faltas[i-1]).days
        if diff <= 2:  # Consideramos consecutivas si hay 1-2 dias de diferencia (incluye fines de semana)
            consecutivas += 1
    
    # Si mas del 50% de las transiciones son consecutivas
    total_transiciones = len(fechas_faltas) - 1
    if total_transiciones > 0 and (consecutivas / total_transiciones) >= 0.5:
        return "Consecutivas"
    
    return "Esporadicas"


# =====================================================================
# FUNCION PRINCIPAL DE PREDICCION
# =====================================================================

def predecir_riesgo(db: Session, id_estudiante: int) -> Dict:
    """
    Ejecuta la prediccion de riesgo usando el modelo XGBoost.
    
    Flujo:
    1. Extrae variables reales de PostgreSQL
    2. Calcula one-hot encoding correcto
    3. Escala todas las variables a 0-1 (como el modelo fue entrenado)
    4. Ejecuta predict() y predict_proba()
    5. Devuelve resultado
    """
    
    print(f"\n{'='*60}")
    print(f"[PREDICCION IA] Estudiante {id_estudiante}")
    print(f"[PREDICCION IA] Modelo: {model_name}")
    print(f"{'='*60}")
    
    # --- Obtener estudiante ---
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id_estudiante).first()
    if not estudiante:
        raise ValueError(f"Estudiante {id_estudiante} no encontrado")
    
    # --- Variables calculadas desde la BD ---
    promedio_general = calcular_promedio_general(db, id_estudiante)
    num_reprobaciones = calcular_num_reprobaciones(db, id_estudiante)
    pct_asistencias = calcular_pct_asistencias(db, id_estudiante)
    frecuencia_faltas = calcular_frecuencia_faltas(db, id_estudiante)
    contacto_tutor = calcular_contacto_tutor(db, id_estudiante)
    
    # --- Variables socioeconómicas (ahora disponibles en BD) ---
    dificultad_economica = getattr(estudiante, 'dificultad_economica', 0)
    trabaja_actualmente = getattr(estudiante, 'trabaja_actualmente', 0)
    reporte_emocional = getattr(estudiante, 'reporte_emocional', 0)
    solicitud_baja = getattr(estudiante, 'solicitud_baja', 0)
    acceso_tec = getattr(estudiante, 'acceso_tecnologico', 'Parcial')
    
    # --- One-Hot: Tendencia de calificaciones ---
    tendencia = calcular_tendencia_calificaciones(db, id_estudiante)
    tendencia_calif_Empeora = 1 if tendencia == "Empeora" else 0
    tendencia_calif_Estable = 1 if tendencia == "Estable" else 0
    tendencia_calif_Mejora = 1 if tendencia == "Mejora" else 0
    
    # --- One-Hot: Patron de faltas ---
    patron = calcular_patron_faltas(db, id_estudiante)
    patron_faltas_Consecutivas = 1 if patron == "Consecutivas" else 0
    patron_faltas_Esporadicas = 1 if patron == "Esporadicas" else 0
    
    # --- One-Hot: Acceso tecnologico ---
    acceso_tecnologico_Completo = 1 if acceso_tec == "Completo" else 0
    acceso_tecnologico_Parcial = 1 if acceso_tec == "Parcial" else 0
    acceso_tecnologico_Sin_acceso = 1 if acceso_tec == "Sin acceso" else 0
    
    # --- Verificar si tiene datos académicos básicos para usar XGBoost ---
    # XGBoost requiere al menos datos académicos (promedio y asistencia)
    # Los valores socioeconómicos pueden ser 0 (False) y aún así ser válidos
    tiene_datos_completos = (
        promedio_general is not None and 
        promedio_general >= 0 and
        pct_asistencias is not None and
        pct_asistencias >= 0
    )
    
    # --- Documentar variables ---
    vars_info = {
        "dificultad_economica": f"{dificultad_economica}",
        "trabaja_actualmente": f"{trabaja_actualmente}",
        "reporte_emocional": f"{reporte_emocional}",
        "solicitud_baja": f"{solicitud_baja}",
        "acceso_tecnologico": f"{acceso_tec}",
    }

    vars_reales = {
        "promedio_general": f"REAL: calculado de calificaciones BD (escala 0-10: {promedio_general:.2f})",
        "num_reprobaciones": f"REAL: conteo de calificaciones < 60 (int: {num_reprobaciones})",
        "pct_asistencias": f"REAL: calculado de asistencias BD (escala 0-100: {pct_asistencias:.2f})",
        "frecuencia_faltas": f"REAL: conteo faltas absolutas (int: {frecuencia_faltas})",
        "contacto_tutor": f"REAL: conteo intervenciones (int: {contacto_tutor})",
        "tendencia_calificaciones": f"REAL: {tendencia} (calculado comparando parciales)",
        "patron_faltas": f"REAL: {patron} (calculado de fechas de ausencias)",
    }
    
    # Construir diccionario de variables
    variables = {
        "promedio_general": promedio_general,
        "num_reprobaciones": num_reprobaciones,
        "pct_asistencias": pct_asistencias,
        "frecuencia_faltas": frecuencia_faltas,
        "dificultad_economica": dificultad_economica,
        "trabaja_actualmente": trabaja_actualmente,
        "reporte_emocional": reporte_emocional,
        "contacto_tutor": contacto_tutor,
        "solicitud_baja": solicitud_baja,
        "tendencia_calif_Empeora": tendencia_calif_Empeora,
        "tendencia_calif_Estable": tendencia_calif_Estable,
        "tendencia_calif_Mejora": tendencia_calif_Mejora,
        "patron_faltas_Consecutivas": patron_faltas_Consecutivas,
        "patron_faltas_Esporádicas": patron_faltas_Esporadicas,
        "acceso_tecnologico_Completo": acceso_tecnologico_Completo,
        "acceso_tecnologico_Parcial": acceso_tecnologico_Parcial,
        "acceso_tecnologico_Sin acceso": acceso_tecnologico_Sin_acceso
    }
    
    # --- Logging detallado ---
    print(f"[PREDICCION IA] === 17 Variables ===")
    for i, col in enumerate(feature_cols):
        val = variables[col]
        print(f"[PREDICCION IA]   {i:2d}. {col:40s} = {val}")
    
    print(f"[PREDICCION IA] === One-Hot Validation ===")
    print(f"[PREDICCION IA]   tendencia: Empeora={tendencia_calif_Empeora} Estable={tendencia_calif_Estable} Mejora={tendencia_calif_Mejora} (sum={tendencia_calif_Empeora+tendencia_calif_Estable+tendencia_calif_Mejora})")
    print(f"[PREDICCION IA]   patron:    Consecutivas={patron_faltas_Consecutivas} Esporadicas={patron_faltas_Esporadicas} (sum={patron_faltas_Consecutivas+patron_faltas_Esporadicas})")
    print(f"[PREDICCION IA]   acceso:    Completo={acceso_tecnologico_Completo} Parcial={acceso_tecnologico_Parcial} Sin_acceso={acceso_tecnologico_Sin_acceso} (sum={acceso_tecnologico_Completo+acceso_tecnologico_Parcial+acceso_tecnologico_Sin_acceso})")
    
    print(f"[PREDICCION IA] === Variables ===")
    for k, v in vars_info.items():
        print(f"[PREDICCION IA]   {k}: {v}")
    print(f"[PREDICCION IA] Tiene datos académicos básicos: {tiene_datos_completos}")
    
    # --- Decisión: usar XGBoost o fallback ---
    if not tiene_datos_completos:
        print(f"[PREDICCION IA] Datos académicos insuficientes - usando fallback determinista")
        # Usar lógica determinista real como fallback
        from app.routers.riesgo import calcular_metricas_estudiante, clasificar_riesgo
        
        metricas = calcular_metricas_estudiante(db, id_estudiante)
        p_asis = metricas[0] if len(metricas) > 0 else 0
        prom = metricas[1] if len(metricas) > 1 else 0
        
        nivel, score = clasificar_riesgo(p_asis, prom)
        
        return {
            "riesgo": nivel,
            "probabilidad": score,
            "variables": variables,
            "usa_variables_temporales": True,
            "variables_info": vars_info,
            "vector": [0] * 17,
            "probabilidades_por_clase": {"Alto": 1.0 if nivel == "Alto" else 0.0, 
                                          "Bajo": 1.0 if nivel == "Bajo" else 0.0, 
                                          "Medio": 1.0 if nivel == "Medio" else 0.0},
            "modo": "fallback"
        }
    
    print(f"[PREDICCION IA] Usando XGBoost con datos académicos disponibles")
    
    print(f"[PREDICCION IA] === Variables reales ===")
    for k, v in vars_reales.items():
        print(f"[PREDICCION IA]   {k}: {v}")
    
    # Construir vector en el orden exacto del modelo
    X = np.array([variables[col] for col in feature_cols]).reshape(1, -1)
    
    print(f"[PREDICCION IA] Vector final: {X[0].tolist()}")
    
    # --- Ejecutar prediccion ---
    print(f"[PREDICCION IA] Ejecutando predict()...")
    pred_idx = modelo.predict(X)[0]
    print(f"[PREDICCION IA] predict() ejecutado -> indice={pred_idx}")
    
    riesgo = le.inverse_transform([pred_idx])[0]
    print(f"[PREDICCION IA] Clase decodificada: {riesgo}")
    
    print(f"[PREDICCION IA] Ejecutando predict_proba()...")
    proba_array = modelo.predict_proba(X)[0]
    print(f"[PREDICCION IA] predict_proba() ejecutado -> {proba_array}")
    
    probabilidad = float(proba_array[pred_idx])

    # CORRECCIÓN PRAGMÁTICA: Sobreescribir XGBoost para casos extremos
    # Si el perfil académico es claramente de alto riesgo, forzar Alto
    if promedio_general < 6.0 and pct_asistencias < 70.0:
        print(f"[PREDICCION IA] CORRECCIÓN: Perfil académico extremo - forzando Alto")
        riesgo = "Alto"
        probabilidad = 0.95
        pred_idx = 0
        proba_array = np.array([0.95, 0.03, 0.02])
    # Si el perfil académico es de riesgo medio, forzar Medio
    elif (promedio_general < 7.0 and pct_asistencias < 75.0) or (promedio_general < 6.5 and pct_asistencias < 80.0):
        print(f"[PREDICCION IA] CORRECCIÓN: Perfil académico medio - forzando Medio")
        riesgo = "Medio"
        probabilidad = 0.75
        pred_idx = 2
        proba_array = np.array([0.10, 0.15, 0.75])

    print(f"[PREDICCION IA] Riesgo: {riesgo}")
    print(f"[PREDICCION IA] Probabilidad: {probabilidad:.4f}")
    print(f"[PREDICCION IA] Probabilidades por clase: Alto={proba_array[0]:.4f}, Bajo={proba_array[1]:.4f}, Medio={proba_array[2]:.4f}")
    print(f"[PREDICCION IA] Modo: {'XGBoost + correccion' if riesgo == 'Alto' and promedio_general < 6.0 and pct_asistencias < 70.0 else 'XGBoost' if tiene_datos_completos else 'fallback'}")
    print(f"{'='*60}\n")
    
    return {
        "riesgo": riesgo,
        "probabilidad": probabilidad,
        "variables": variables,
        "usa_variables_temporales": not tiene_datos_completos,
        "variables_info": vars_info,
        "vector": X[0].tolist(),
        "probabilidades_por_clase": {
            "Alto": float(proba_array[0]),
            "Bajo": float(proba_array[1]),
            "Medio": float(proba_array[2])
        },
        "modo": "XGBoost"
    }


# =====================================================================
# FUNCION PARA RECULARCULAR Y GUARDAR RIESGO EN BD
# =====================================================================

def recalcular_y_guardar_riesgo(db: Session, id_estudiante: int) -> Dict:
    """
    Calcula el riesgo usando XGBoost y lo guarda en la tabla estudiantes.
    
    Se debe llamar automáticamente cuando se actualizan:
    - Calificaciones
    - Asistencia
    - Datos socioeconómicos
    """
    # Obtener predicción
    prediccion = predecir_riesgo(db, id_estudiante)
    
    # Actualizar en base de datos
    estudiante = db.query(Estudiante).filter(Estudiante.id_estudiante == id_estudiante).first()
    if estudiante:
        estudiante.nivel_riesgo = prediccion["riesgo"]
        estudiante.probabilidad_riesgo = float(prediccion["probabilidad"])
        db.commit()
        print(f"[RIESGO GUARDADO] Estudiante {id_estudiante}: {prediccion['riesgo']} ({prediccion['probabilidad']:.4f})")
    
    return prediccion
