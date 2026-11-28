/**
 * MiniOpt — Programas de ejemplo
 *
 * Cada ejemplo está pensado para demostrar una regla y también un caso en
 * el que la optimización debe detenerse por seguridad.
 */

export const SAMPLES = [
  {
    id: 'enunciado',
    name: 'Ejemplo del enunciado',
    description:
      'Plegado, propagación y simplificación en cadena. El resultado esperado es x = 16.',
    code: `t1 = 5 + 3
t2 = t1 * 2
t3 = t2 + 0
x = t3`
  },
  {
    id: 'algebraica',
    name: 'Identidades algebraicas',
    description:
      'Aplica x + 0, x * 1, x - 0, x * 0 y x - x sin alterar el resultado.',
    code: `a = 7
b = a + 0
c = b * 1
d = c - 0
e = d * 0
f = a - a
print b
print c
print d
print e
print f`
  },
  {
    id: 'propagacion',
    name: 'Propagación de constantes y copias',
    description:
      'Sustituye valores conocidos y elimina temporales que solo servían para copiar.',
    code: `t1 = 4
t2 = 6
t3 = t1 + t2
x = t3
y = x
print y`
  },
  {
    id: 'muerto',
    name: 'Código muerto',
    description:
      'Elimina temporales muertos y conserva las variables de usuario y las salidas.',
    code: `t1 = 2 + 3
t2 = t1 * 4
x = 10
print x`
  },
  {
    id: 'efectos',
    name: 'Efectos secundarios',
    description:
      'Una llamada y un almacenamiento en arreglo nunca deben eliminarse, aunque su resultado no se use.',
    code: `x = 5
t1 = x * 1
a[0] = x
param x
call registrar, 1
print t1`
  },
  {
    id: 'ciclo',
    name: 'Ciclo con etiquetas',
    description:
      'La propagación se detiene en uniones de caminos y no altera el flujo del ciclo.',
    code: `i = 0
t1 = 0
L1:
if i < 5 goto L2
goto L3
L2:
t1 = t1 + i
i = i + 1
goto L1
L3:
print t1
return t1`
  },
  {
    id: 'division',
    name: 'División por cero',
    description:
      'La herramienta no pliega una operación insegura: conserva la instrucción y advierte.',
    code: `x = 10 / 0
print x`
  },
  {
    id: 'error',
    name: 'Entrada con error',
    description:
      'Una línea mal formada se reporta con su número de línea y no detiene la aplicación.',
    code: `x = 5 +
y = 2 * 3
print y`
  }
];

export function findSample(id) {
  return SAMPLES.find((sample) => sample.id === id) ?? SAMPLES[0];
}
