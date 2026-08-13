"""
Funciones de cálculo para IA - EduPredict AI
Usadas por prediction_service.py para construir el vector correcto antes de enviarlo al modelo.
"""

def calcular_tendencia_calificaciones(promedios_por_parcial):
    """
    Calcula tendencia de calificaciones comparando parciales.
    
    Args:
        promedios_por_parcial: lista de promedios por parcial ordenados
                            por ejemplo [8.5, 7.2, 6.1]
    
    Returns:
        string: 'Mejora' / 'Estable' / 'Empeora'
    """
    if not promedios_por_parcial or len(promedios_por_parcial) < 2:
        return 'Estable'
    
    primero = promedios_por_parcial[0]
    ultimo = promedios_por_parcial[-1]
    diferencia = ultimo - primero
    
    if diferencia > 0.5:
        return 'Mejora'
    elif diferencia < -0.5:
        return 'Empeora'
    else:
        return 'Estable'


def calcular_patron_faltas(fechas_faltas):
    """
    Calcula patrón de faltas basado en fechas de ausencia.
    
    Args:
        fechas_faltas: lista de fechas donde el alumno faltó
                    ordenadas cronológicamente
    
    Returns:
        string: 'Consecutivas' / 'Esporádicas'
    """
    if not fechas_faltas or len(fechas_faltas) < 2:
        return 'Esporádicas'
    
    # Calcular diferencias en días entre faltas consecutivas
    consecutivas = 0
    for i in range(1, len(fechas_faltas)):
        diff = (fechas_faltas[i] - fechas_faltas[i-1]).days
        if diff <= 3:  # Consideramos consecutivas si hay <= 3 días de diferencia
            consecutivas += 1
    
    # Si hay 3 o más transiciones consecutivas
    if consecutivas >= 3:
        return 'Consecutivas'
    else:
        return 'Esporádicas'


def construir_vector_completo(estudiante, promedios_por_parcial, fechas_faltas):
    """
    Construye el vector completo de 17 variables para XGBoost.
    
    Args:
        estudiante: objeto estudiante con todos sus datos
        promedios_por_parcial: lista de promedios por parcial
        fechas_faltas: lista de fechas donde faltó
    
    Returns:
        lista de 17 valores numéricos lista para XGBoost
    """
    # 1. Calcular tendencia con función 1
    tendencia = calcular_tendencia_calificaciones(promedios_por_parcial)
    
    # 2. Calcular patrón de faltas con función 2
    patron = calcular_patron_faltas(fechas_faltas)
    
    # 3. Construir One-Hot Encoding manual
    tendencia_calif_Empeora = 1 if tendencia == 'Empeora' else 0
    tendencia_calif_Estable = 1 if tendencia == 'Estable' else 0
    tendencia_calif_Mejora = 1 if tendencia == 'Mejora' else 0
    
    patron_faltas_Consecutivas = 1 if patron == 'Consecutivas' else 0
    patron_faltas_Esporadicas = 1 if patron == 'Esporádicas' else 0
    
    acceso = estudiante.acceso_tecnologico if hasattr(estudiante, 'acceso_tecnologico') else 'Parcial'
    acceso_tecnologico_Completo = 1 if acceso == 'Completo' else 0
    acceso_tecnologico_Parcial = 1 if acceso == 'Parcial' else 0
    acceso_tecnologico_Sin_acceso = 1 if acceso == 'Sin acceso' else 0
    
    # 4. Variables socioeconómicas (ya en 0/1)
    dificultad_economica = getattr(estudiante, 'dificultad_economica', 0)
    trabaja_actualmente = getattr(estudiante, 'trabaja_actualmente', 0)
    reporte_emocional = getattr(estudiante, 'reporte_emocional', 0)
    solicitud_baja = getattr(estudiante, 'solicitud_baja', 0)
    
    # 5. Variables numéricas (escala original según contrato EduPredict)
    # Sin normalización - el modelo es robusto a la escala
    # promedio_general: 0-10
    # num_reprobaciones: conteo entero
    # pct_asistencias: 0-100
    # frecuencia_faltas: conteo entero
    # contacto_tutor: conteo entero
    
    # Por ahora usamos valores por defecto - deben venir de PostgreSQL
    promedio_general = 0.0
    num_reprobaciones = 0
    pct_asistencias = 0.0
    frecuencia_faltas = 0
    contacto_tutor = 0
    
    # 5. Construir el vector en el orden EXACTO de feature_cols
    vector = [
        promedio_general,
        num_reprobaciones,
        pct_asistencias,
        frecuencia_faltas,
        dificultad_economica,
        trabaja_actualmente,
        reporte_emocional,
        contacto_tutor,
        solicitud_baja,
        tendencia_calif_Empeora,
        tendencia_calif_Estable,
        tendencia_calif_Mejora,
        patron_faltas_Consecutivas,
        patron_faltas_Esporadicas,
        acceso_tecnologico_Completo,
        acceso_tecnologico_Parcial,
        acceso_tecnologico_Sin_acceso
    ]
    
    return vector
