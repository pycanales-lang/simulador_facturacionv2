# 📡 Simulador de Facturación - Professional Edition

![Versión](https://img.shields.io/badge/version-2.5.0-blue)
![Licencia](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-ready_for_deploy-orange)

Herramienta profesional de entrenamiento comercial diseñada para que asesores y vendedores de telecomunicaciones puedan simular, visualizar y explicar el ciclo de vida de facturación de un cliente.



## 🚀 Características Principales

El simulador utiliza una arquitectura basada en motores independientes para garantizar precisión técnica:

- **Timeline Engine:** Visualización interactiva de 60 días que incluye hitos de Instalación, Emisión, Vencimiento y Corte.
- **State Engine:** Motor de estados que detecta automáticamente la situación del cliente (EN PLAZO, EN MORA, CORTE PARCIAL, CORTE TOTAL).
- **Financial Engine:** Cálculo dinámico de prorrateos, cargos administrativos y deudas acumuladas según reglas de negocio.
- **Early Churn Alert:** Sistema de detección de riesgo para cuentas nuevas (menos de 4 meses).
- **Regla de Oro:** Generación automática de fechas de emisión y vencimiento basadas en el ciclo asignado.

## 🛠️ Arquitectura del Proyecto

El proyecto ha sido refactorizado para seguir estándares profesionales de desarrollo web:

```text
simulador-facturacion/
├── index.html          # Estructura principal y Viewport de la Timeline
├── css/
│   └── styles.css      # Identidad visual, variables y animaciones
├── js/
│   └── app.js          # Motores de lógica, estados y finanzas
└── assets/
    └── imagenes/       # Recursos gráficos y guías de ayuda
