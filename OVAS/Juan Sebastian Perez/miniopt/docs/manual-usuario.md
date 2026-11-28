# Manual de usuario — MiniOpt

## 1. Qué es MiniOpt

MiniOpt es una herramienta web para optimizar **código intermedio de tres direcciones (TAC)**. Recibe un programa, aplica reglas seguras y muestra:

- el TAC optimizado,
- la comparación línea por línea con el original,
- la lista de reglas aplicadas con su justificación,
- la verificación de equivalencia de las salidas observables.

## 2. Cómo abrirla

### Desde el portal

1. Abra el Portal de OVAS.
2. En el menú lateral o en las tarjetas, seleccione **OVA 06 — Optimizador TAC (MiniOpt)**.
3. La herramienta se carga dentro del visor.

### Directamente

Con el repositorio servido por HTTP:

```bash
python3 -m http.server 8000
```

```text
http://localhost:8000/OVAS/Juan%20Sebastian%20Perez/miniopt/index.html
```

## 3. Interfaz

| Zona | Función |
|---|---|
| Selector de ejemplo | Carga un programa de demostración y muestra su explicación. |
| Optimizaciones activas | Activa o desactiva cada pase. |
| Editor | Escribe o pega el TAC. Tiene numeración y contador de líneas. |
| Optimizar | Ejecuta el pipeline completo. Atajo: `Ctrl/Cmd + Enter`. |
| Paso a paso | Aplica un pase por clic, para explicar la transformación. |
| Reiniciar | Limpia los resultados y conserva la entrada. |
| Métricas | Instrucciones antes/después, reducción, transformaciones y temporales. |
| TAC optimizado | Resultado final. |
| Comparación | Diff por líneas: rojo = eliminado, verde = agregado. |
| Reglas aplicadas | Tabla con regla, línea, antes, después y justificación. |
| Equivalencia | Salidas `print`, `return`, variables observables y arreglos. |
| Diagnóstico | Errores y advertencias con número de línea. |
| Copiar / Descargar | Exporta el TAC optimizado. |

## 4. Sintaxis TAC aceptada

### Asignaciones y operaciones

```text
x = 5
t1 = a + b
t2 = a - 3
t3 = a * b
t4 = a / b
t5 = a % b
t6 = -a
```

Operadores: `+ - * / %`, comparaciones `== != < <= > >=`.

### Variables y temporales

- Identificadores: letra o `_`, seguidos de letras, dígitos o `_`.
- Temporales: `t1`, `t2`, … (se reconocen como temporales para DCE).
- Números: enteros y reales (`10`, `2.5`, `-3`).

### Control de flujo

```text
L1:
goto L1
if a < b goto L1
ifFalse a goto L1
```

### Funciones y arreglos

```text
param x
call f, 2
y = call g, 1
a[0] = x
z = a[1]
```

### Salidas

```text
print x
return x
return
```

### Comentarios

```text
// comentario de línea
# también es comentario
```

Las líneas vacías y los comentarios se conservan en el TAC original.

## 5. Uso paso a paso

1. Cargue el ejemplo **“Ejemplo del enunciado”**.
2. Pulse **Optimizar**.
3. Observe el resultado: `x = 16`.
4. Abra **Comparación** para ver las líneas eliminadas y el resultado.
5. Abra **Reglas aplicadas** para explicar el plegado, la propagación y la eliminación de temporales.
6. Abra **Equivalencia** para comprobar que `print`, `return` y `x` valen lo mismo antes y después.
7. Use **Paso a paso** para aplicar un pase por clic durante la sustentación.
8. Active **modo agresivo** solo para demostrar por qué no debe usarse a ciegas: la pestaña de equivalencia mostrará la diferencia.

## 6. Cómo interpretar los resultados

### Métricas

- **Instrucciones antes/después:** solo cuenta instrucciones ejecutables (sin comentarios ni líneas vacías).
- **Reducción:** porcentaje de instrucciones eliminadas.
- **Transformaciones:** número de eventos de la traza.
- **Temporales:** temporales distintos antes → después.

### Equivalencia

| Estado | Significado |
|---|---|
| **Equivalente** | `print`, `return`, variables observables y arreglos coinciden. |
| **Diferencia detectada** | Alguna salida observable cambió; revise la lista de diferencias. |
| **Verificación manual** | Hay llamadas o instrucciones opacas; no se puede garantizar automáticamente. |
| **No ejecutable** | El intérprete encontró un error (por ejemplo, división por cero). |

### Diagnóstico

- **Error:** la línea no se pudo interpretar como TAC; se conserva como instrucción opaca.
- **Advertencia:** una optimización no se aplicó por seguridad (por ejemplo, división por cero).

## 7. Seguridad y modo agresivo

MiniOpt **nunca** elimina:

- `call`, `param`,
- `print`, `return`,
- `a[i] = x`,
- etiquetas, `goto`, `if`, `ifFalse`.

Por defecto, las variables de usuario se consideran salidas observables y no se eliminan. El **modo agresivo** permite eliminarlas si no se leen; úsalo solo con programas donde esas variables no sean una salida esperada. La verificación de equivalencia mostrará cualquier diferencia.

## 8. Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl/Cmd + Enter` | Optimizar |
| `Tab` | Insertar dos espacios |
| `←` / `→` en las pestañas | Cambiar de pestaña |

## 9. Límites

- Entrada máxima: 2.000 líneas o 100.000 caracteres.
- Intérprete: 10.000 pasos para evitar ciclos infinitos.
- No hay entrada por teclado (`read`) ni simulación de funciones.
- La aritmética es IEEE-754 de JavaScript; `0.1 + 0.2` se muestra como `0.30000000000000004` y no se redondea.

## 10. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| “No se reconoce la expresión” | Operador o formato no soportado | Use una operación de tres direcciones por línea. |
| “La etiqueta … no está definida” | `goto` a una etiqueta inexistente | Defina `L1:` antes del salto. |
| “No se plegó … división por cero” | Operación insegura | Corrija el divisor; la instrucción se conserva. |
| “Verificación manual” | Hay `call` o una línea opaca | Revise el resultado a mano o elimine la llamada. |
| La página no carga módulos | Se abrió con `file://` | Sirva el repositorio por HTTP. |
