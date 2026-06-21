import logging
from django.utils import timezone
from datetime import timedelta

from .phase1_check import check_viabilidad
from .phase2_analyzer import analizar_desviacion
from .phase3_classifier import clasificar_impacto
from .phase4_generator import generar_propuesta
from .phase5_tracker import registrar_decision
from .predictive_detector import detectar_riesgo_incumplimiento, calcular_ventana_optima
from .activation_system import crear_activacion_adaptativa
from .rules_system import evaluar_reglas

logger = logging.getLogger('focusia.security')


class DecisionEngine:
    """
    Árbol de Decisiones: Motor de IA Adaptativa
    Ejecuta las 5 fases del flujo de decisión para un usuario,
    integrando el sistema de activaciones y detección predictiva.
    """

    def ejecutar_ciclo(self, user):
        """
        Ejecuta un ciclo completo del árbol de decisiones para un usuario.
        Returns dict con el resultado de cada fase.
        """
        resultado = {'user_id': user.id, 'fases': {}}

        # Evaluación predictiva pre-ciclo
        riesgos = detectar_riesgo_incumplimiento(user)
        ventana = calcular_ventana_optima(user)
        resultado['predictivo'] = {
            'riesgos_encontrados': len(riesgos),
            'riesgos': riesgos[:5],
            'ventana_optima': ventana,
        }

        # FASE 1
        viabilidad = check_viabilidad(user)
        resultado['fases']['fase1_viabilidad'] = viabilidad
        if not viabilidad['viable']:
            resultado['completo'] = False
            resultado['mensaje'] = viabilidad['razon']
            logger.info(f'[ENGINE] user={user.id} detenido en FASE 1: {viabilidad["razon"]}')
            return resultado

        # FASE 2
        desviacion = analizar_desviacion(user)
        resultado['fases']['fase2_desviacion'] = desviacion
        if not desviacion['encontrado']:
            resultado['completo'] = False
            resultado['mensaje'] = 'En observación. No se detectaron desviaciones.'
            return resultado

        if not desviacion['es_patron']:
            resultado['completo'] = False
            resultado['mensaje'] = 'Evento aislado. Se registra en log sin intervención.'
            logger.info(f'[ENGINE] user={user.id} evento aislado ignorado.')
            return resultado

        # FASE 3
        impacto = clasificar_impacto(user)
        resultado['fases']['fase3_impacto'] = impacto

        if impacto.get('tipo_impacto') is None:
            resultado['completo'] = False
            resultado['mensaje'] = impacto.get('detalles', 'Sin condiciones de alerta.')
            logger.info(f'[ENGINE] user={user.id} detenido en FASE 3: sin casos activados.')
            return resultado

        # FASE 4
        propuesta = generar_propuesta(
            user=user,
            tipo_impacto=impacto['tipo_impacto'],
            situacion=impacto['detalles'],
        )
        resultado['fases']['fase4_generacion'] = {
            'propuesta_id': propuesta.id,
            'tipo_impacto': propuesta.tipo_impacto,
            'creada': True,
        }

        # Sistema de Reglas + Activación Adaptativa
        contexto = {
            'urgencia': impacto.get('urgencia', 'media'),
            'tipo_impacto': impacto['tipo_impacto'],
            'caso': impacto.get('caso'),
            'riesgos': riesgos,
        }
        reglas = evaluar_reglas(user, contexto)
        resultado['fases']['reglas'] = reglas

        if reglas.get('puede_intervenir') and reglas.get('tipo_activacion') in ('adaptativa', 'con_intencion', 'tradicional'):
            activacion = crear_activacion_adaptativa(user, propuesta)
            resultado['fases']['activacion'] = {
                'activacion_id': activacion.id,
                'tipo': activacion.tipo,
                'intensidad': activacion.metadata.get('intensidad', 3),
                'ventana': activacion.ventana_programada.isoformat() if activacion.ventana_programada else None,
            }
        else:
            resultado['fases']['activacion'] = {
                'creada': False,
                'razon': reglas.get('razon', 'Tipo de activación no soportada automáticamente'),
            }

        resultado['completo'] = True
        resultado['propuesta_id'] = propuesta.id
        resultado['mensaje'] = 'Ciclo completo: propuesta generada y activación creada.'

        logger.info(
            f'[ENGINE] user={user.id} ciclo completo -> propuesta={propuesta.id} '
            f'tipo={propuesta.tipo_impacto}'
        )
        return resultado

    def procesar_decision(self, propuesta_id, decision):
        return registrar_decision(propuesta_id, decision)
