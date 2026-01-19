# 📄 Documentación Integral: Sistema de Gestión Veterinaria Amazonia

## 1. Visión General
Infraestructura digital para Petshop, Mateando (Yerbas) y Consultorio.

## 2. Pestañas de Negocio (Mateando/Petshop)
- **INVENTARIO**: Gestión Pro con lector de barras y cálculo automático de márgenes.
- **VENDER**: Caja rápida con carrito, escaneo directo y múltiples medios de pago.
- **HISTORIAL DE VENTAS**: Registro total con filtros por Hoy, Semana, Mes, Año o Fecha específica. Incluye sistema de anulación.
- **PROVEEDORES**: Agenda directa para pedidos rápidos vía WhatsApp.
- **PAGOS**: Registro de egresos (Servicios, Sueldos, Mercadería).
- **CUENTAS**: Análisis financiero, Fondo de Reposición y Ganancia Neta.

## 3. Seguridad y Control

### 🛡️ Sistema de Anulación
Para anular una venta en el Historial, se requiere el código de seguridad **1960**.
- Al anular, el sistema pregunta si se desea **reintegrar el stock**.
- Si se confirma, los productos vuelven al inventario automáticamente.
- La venta se marca visualmente como "ANULADA" y se descuenta de los reportes financieros en `CUENTAS`.

### 🔫 Periféricos
- **Lector de Barras**: Activo en `VENDER` (Caja) e `INVENTARIO` (Alta de productos).
- **Tickeadora**: Impresión térmica en 80mm/58mm generada tras cada venta exitosa.

---
**Amazonia: Tecnología al servicio de la salud animal y el comercio eficiente.**