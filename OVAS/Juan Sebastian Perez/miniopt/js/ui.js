/**
 * MiniOpt — Interfaz de usuario
 *
 * Toda la lógica de optimización vive en módulos independientes. Este archivo
 * solo conecta el editor con el motor, dibuja resultados y mantiene la
 * accesibilidad básica (tabs, aria-live, foco y atajos de teclado).
 */

import {
  optimize,
  createStepState,
  nextStep,
  stepResult,
  PASS_META
} from './optimizer.js';
import { SAMPLES, findSample } from './samples.js';
import { formatRunValue } from './interpreter.js';

const $ = (id) => document.getElementById(id);

const input = $('tac-input');
const gutter = $('line-gutter');
const inputCounter = $('input-counter');
const sampleSelect = $('sample-select');
const sampleDescription = $('sample-description');
const passToggles = $('pass-toggles');
const aggressive = $('opt-aggressive');
const statusBar = $('status-bar');
const statusText = $('status-text');
const optimizedOutput = $('optimized-output');
const metrics = {
  before: $('metric-before'),
  after: $('metric-after'),
  reduction: $('metric-reduction'),
  transformations: $('metric-transformations'),
  temps: $('metric-temps')
};
const rulesBody = $('rules-body');
const rulesEmpty = $('rules-empty');
const diffOriginal = $('diff-original');
const diffOptimized = $('diff-optimized');
const equivalenceSummary = $('equivalence-summary');
const equivalenceDetail = $('equivalence-detail');
const diagnosticsList = $('diagnostics-list');
const diagnosticsCount = $('diagnostics-count');
const btnOptimize = $('btn-optimize');
const btnStep = $('btn-step');
const btnReset = $('btn-reset');
const btnCopy = $('btn-copy');
const btnDownload = $('btn-download');

const toggleInputs = new Map();
let currentResult = null;
let stepState = null;
let lastOutput = '';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setStatus(message, kind = 'ok') {
  statusText.textContent = message;
  statusBar.className = `ova-status-bar status-${kind}`;
}

function readOptions() {
  const options = {
    aggressiveDce: aggressive.checked,
    maxIterations: 50
  };
  for (const meta of PASS_META) {
    options[meta.id] = toggleInputs.get(meta.id)?.checked !== false;
  }
  return options;
}

function updateGutter() {
  const lines = input.value.split('\n').length;
  const numbers = [];
  for (let index = 1; index <= lines; index += 1) numbers.push(index);
  gutter.textContent = numbers.join('\n');
  inputCounter.textContent = `${lines} línea${lines === 1 ? '' : 's'} · ${input.value.length} caracteres`;
}

function syncGutterScroll() {
  gutter.scrollTop = input.scrollTop;
}

function populateSamples() {
  for (const sample of SAMPLES) {
    const option = document.createElement('option');
    option.value = sample.id;
    option.textContent = sample.name;
    sampleSelect.appendChild(option);
  }
  sampleSelect.value = SAMPLES[0].id;
}

function buildToggles() {
  for (const meta of PASS_META) {
    const label = element('label', 'miniopt-check');
    label.title = meta.description;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.dataset.pass = meta.id;
    checkbox.addEventListener('change', () => {
      stepState = null;
      if (currentResult) runOptimize();
    });
    toggleInputs.set(meta.id, checkbox);
    label.appendChild(checkbox);
    label.appendChild(element('span', '', meta.name));
    passToggles.appendChild(label);
  }
}

function loadSample(id) {
  const sample = findSample(id);
  input.value = sample.code;
  sampleDescription.textContent = sample.description;
  stepState = null;
  updateGutter();
  runOptimize();
}

function inputIsTooLarge() {
  const lines = input.value.split('\n').length;
  if (lines > 2000 || input.value.length > 100000) {
    setStatus(
      'La entrada supera el límite de 2.000 líneas o 100.000 caracteres. Divida el programa en partes.',
      'err'
    );
    return true;
  }
  return false;
}

function runOptimize() {
  if (!input.value.trim()) {
    setStatus('Escriba código TAC o cargue un ejemplo para comenzar.', 'warn');
    clearResults();
    return;
  }
  if (inputIsTooLarge()) return;
  stepState = null;
  currentResult = optimize(input.value, readOptions());
  lastOutput = currentResult.optimizedText;
  renderResult(currentResult);

  const errorCount = currentResult.errors.length;
  const warningCount = currentResult.warnings.length;
  if (errorCount > 0) {
    setStatus(
      `Optimización aplicada con ${errorCount} error${errorCount === 1 ? '' : 'es'} de entrada y ${warningCount} advertencia${warningCount === 1 ? '' : 's'}. Revise el diagnóstico.`,
      'warn'
    );
  } else if (warningCount > 0) {
    setStatus(
      `Optimización completada con ${warningCount} advertencia${warningCount === 1 ? '' : 's'}.`,
      'warn'
    );
  } else {
    setStatus(
      `Optimización completada: ${currentResult.stats.instructionsBefore} → ${currentResult.stats.instructionsAfter} instrucciones.`,
      'ok'
    );
  }
}

function runStep() {
  if (!input.value.trim()) {
    setStatus('Escriba código TAC o cargue un ejemplo para comenzar.', 'warn');
    return;
  }
  if (inputIsTooLarge()) return;

  if (stepState?.done) {
    setStatus('No hay más optimizaciones seguras que aplicar. Use Reiniciar para comenzar de nuevo.', 'ok');
    return;
  }
  if (!stepState) {
    stepState = createStepState(input.value, readOptions());
  }

  const outcome = nextStep(stepState, readOptions());
  stepState = outcome.state;

  if (!outcome.step) {
    setStatus('No hay más optimizaciones seguras que aplicar.', 'ok');
    return;
  }

  const result = stepResult(stepState);
  currentResult = result;
  lastOutput = result.optimizedText;
  renderResult(result);

  const pass = outcome.step.passName;
  if (outcome.step.changed) {
    setStatus(
      `${pass}: ${outcome.step.events.length} transformación${outcome.step.events.length === 1 ? '' : 'es'} aplicada${outcome.step.events.length === 1 ? '' : 's'}.`,
      'ok'
    );
  } else {
    setStatus(`${pass}: sin cambios en este paso.`, 'ok');
  }
}

function clearResults() {
  currentResult = null;
  lastOutput = '';
  optimizedOutput.textContent = '(sin resultado todavía)';
  metrics.before.textContent = '0';
  metrics.after.textContent = '0';
  metrics.reduction.textContent = '0 %';
  metrics.transformations.textContent = '0';
  metrics.temps.textContent = '0 → 0';
  rulesBody.replaceChildren();
  rulesEmpty.hidden = false;
  diffOriginal.replaceChildren();
  diffOptimized.replaceChildren();
  equivalenceSummary.replaceChildren();
  equivalenceDetail.replaceChildren();
  diagnosticsList.replaceChildren(
    element('li', 'miniopt-diagnostic miniopt-diagnostic--ok', 'La entrada se analizará al optimizar.')
  );
  diagnosticsCount.textContent = 'Sin observaciones';
}

function resetAll() {
  stepState = null;
  clearResults();
  setStatus('Resultados reiniciados. La entrada se conserva.', 'ok');
}

function renderResult(result) {
  optimizedOutput.textContent = result.optimizedText.trim() || '(programa vacío)';

  metrics.before.textContent = String(result.stats.instructionsBefore);
  metrics.after.textContent = String(result.stats.instructionsAfter);
  metrics.reduction.textContent = `${result.stats.reduction} %`;
  metrics.transformations.textContent = String(result.stats.transformations);
  metrics.temps.textContent = `${result.stats.temporalsBefore} → ${result.stats.temporalsAfter}`;

  renderDiff(result.originalText.split('\n'), result.optimizedText.split('\n'));
  renderRules(result.events);
  renderEquivalence(result.equivalence);
  renderDiagnostics(result);
}

function diffRows(beforeLines, afterLines) {
  const n = beforeLines.length;
  const m = afterLines.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] =
        beforeLines[i] === afterLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const operations = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (beforeLines[i] === afterLines[j]) {
      operations.push({ type: 'same', text: beforeLines[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      operations.push({ type: 'del', text: beforeLines[i] });
      i += 1;
    } else {
      operations.push({ type: 'add', text: afterLines[j] });
      j += 1;
    }
  }
  while (i < n) operations.push({ type: 'del', text: beforeLines[i++] });
  while (j < m) operations.push({ type: 'add', text: afterLines[j++] });

  const rows = [];
  let cursor = 0;
  while (cursor < operations.length) {
    if (operations[cursor].type === 'same') {
      rows.push({
        left: operations[cursor].text,
        right: operations[cursor].text,
        leftStatus: 'same',
        rightStatus: 'same'
      });
      cursor += 1;
      continue;
    }

    const deletions = [];
    const additions = [];
    while (cursor < operations.length && operations[cursor].type !== 'same') {
      if (operations[cursor].type === 'del') deletions.push(operations[cursor].text);
      else additions.push(operations[cursor].text);
      cursor += 1;
    }

    const max = Math.max(deletions.length, additions.length);
    for (let index = 0; index < max; index += 1) {
      const left = deletions[index] ?? null;
      const right = additions[index] ?? null;
      rows.push({
        left,
        right,
        leftStatus: left === null ? 'empty' : right === null ? 'del' : 'change',
        rightStatus: right === null ? 'empty' : left === null ? 'add' : 'change'
      });
    }
  }
  return rows;
}

function renderDiffColumn(container, rows, side) {
  container.replaceChildren();
  let lineNumber = 0;

  for (const row of rows) {
    const text = side === 'left' ? row.left : row.right;
    const status = side === 'left' ? row.leftStatus : row.rightStatus;
    if (text !== null) lineNumber += 1;

    const line = element(
      'div',
      `diff-line diff-${status === 'change' ? (side === 'left' ? 'del' : 'add') : status}`
    );
    line.appendChild(
      element('span', 'diff-num', text === null ? '' : String(lineNumber))
    );
    line.appendChild(element('span', 'diff-text', text ?? ''));
    container.appendChild(line);
  }
}

function renderDiff(beforeLines, afterLines) {
  const rows = diffRows(beforeLines, afterLines);
  renderDiffColumn(diffOriginal, rows, 'left');
  renderDiffColumn(diffOptimized, rows, 'right');
}

function renderRules(events) {
  rulesBody.replaceChildren();
  rulesEmpty.hidden = events.length > 0;

  const limit = 400;
  for (let index = 0; index < Math.min(events.length, limit); index += 1) {
    const event = events[index];
    const row = document.createElement('tr');
    row.appendChild(element('td', 'ova-table__idx', String(index + 1)));
    const ruleCell = document.createElement('td');
    ruleCell.appendChild(element('span', 'miniopt-rule-tag', event.rule));
    row.appendChild(ruleCell);
    row.appendChild(element('td', '', String(event.line)));
    row.appendChild(element('td', '', event.before));
    row.appendChild(element('td', '', event.after));
    row.appendChild(element('td', '', event.reason));
    rulesBody.appendChild(row);
  }

  if (events.length > limit) {
    const row = document.createElement('tr');
    const cell = element('td', '', `Se muestran ${limit} de ${events.length} transformaciones.`);
    cell.colSpan = 6;
    row.appendChild(cell);
    rulesBody.appendChild(row);
  }
}

function stateValue(run, name) {
  if (!run || !run.finalState) return 0;
  return run.finalState.has(name) ? run.finalState.get(name) : 0;
}

function renderEquivalence(equivalence) {
  equivalenceSummary.replaceChildren();
  equivalenceDetail.replaceChildren();

  const labels = {
    equivalent: ['Equivalente', 'ok', 'El TAC optimizado produce las mismas salidas observables.'],
    different: ['Diferencia detectada', 'error', 'El TAC optimizado cambia al menos una salida observable.'],
    manual: ['Verificación manual', 'warn', 'La equivalencia no puede garantizarse automáticamente.'],
    error: ['No ejecutable', 'error', 'No fue posible ejecutar uno de los programas.']
  };
  const [label, tone, description] = labels[equivalence.status] ?? labels.manual;

  equivalenceSummary.appendChild(element('span', `miniopt-badge miniopt-badge--${tone}`, label));
  equivalenceSummary.appendChild(element('span', '', description));

  if (equivalence.status === 'manual' || equivalence.status === 'error') {
    equivalenceDetail.appendChild(
      element('p', 'miniopt-diagnostic miniopt-diagnostic--warn', equivalence.reason ?? description)
    );
  }

  const before = equivalence.before;
  const after = equivalence.after;
  if (!before || !after) return;

  const grid = element('div', 'miniopt-equivalence-grid');
  const cards = [
    ['print original', formatRunValue(before.output)],
    ['print optimizado', formatRunValue(after.output)],
    ['return original', formatRunValue(before.ret)],
    ['return optimizado', formatRunValue(after.ret)],
    ['pasos original / optimizado', `${before.steps} / ${after.steps}`]
  ];
  for (const [title, value] of cards) {
    const card = element('div', 'miniopt-equivalence-card');
    card.appendChild(element('span', '', title));
    card.appendChild(element('strong', '', value));
    grid.appendChild(card);
  }
  equivalenceDetail.appendChild(grid);

  const variables = equivalence.observable ?? [];
  if (variables.length > 0) {
    const variableGrid = element('div', 'miniopt-equivalence-grid');
    for (const name of variables) {
      const card = element('div', 'miniopt-equivalence-card');
      card.appendChild(element('span', '', `variable ${name}`));
      card.appendChild(
        element(
          'strong',
          '',
          `${formatRunValue(stateValue(before, name))} → ${formatRunValue(stateValue(after, name))}`
        )
      );
      variableGrid.appendChild(card);
    }
    equivalenceDetail.appendChild(variableGrid);
  }

  if (equivalence.status === 'different') {
    const list = element('ul', 'miniopt-diff-list');
    for (const diff of equivalence.diffs) {
      if (diff.kind === 'print') {
        list.appendChild(
          element(
            'li',
            '',
            `print: ${formatRunValue(diff.original)} → ${formatRunValue(diff.optimized)}`
          )
        );
      } else if (diff.kind === 'return') {
        list.appendChild(
          element(
            'li',
            '',
            `return: ${formatRunValue(diff.original)} → ${formatRunValue(diff.optimized)}`
          )
        );
      } else if (diff.kind === 'variable') {
        list.appendChild(
          element(
            'li',
            '',
            `${diff.name}: ${formatRunValue(diff.original)} → ${formatRunValue(diff.optimized)}`
          )
        );
      } else {
        list.appendChild(element('li', '', `Diferencia en ${diff.kind}.`));
      }
    }
    equivalenceDetail.appendChild(list);
  } else if (equivalence.status === 'equivalent') {
    equivalenceDetail.appendChild(
      element('p', 'miniopt-diagnostic miniopt-diagnostic--ok', 'Sin diferencias en print, return, variables observables ni arreglos.')
    );
  }
}

function renderDiagnostics(result) {
  diagnosticsList.replaceChildren();
  const items = [];

  for (const error of result.errors) {
    items.push({
      tone: 'error',
      text: `Línea ${error.line}: ${error.message}`
    });
  }
  for (const warning of result.warnings) {
    items.push({
      tone: 'warn',
      text: warning.line ? `Línea ${warning.line}: ${warning.message}` : warning.message
    });
  }

  if (items.length === 0) {
    diagnosticsList.appendChild(
      element(
        'li',
        'miniopt-diagnostic miniopt-diagnostic--ok',
        'Sin errores de entrada ni advertencias de optimización.'
      )
    );
    diagnosticsCount.textContent = 'Sin observaciones';
    return;
  }

  for (const item of items) {
    diagnosticsList.appendChild(
      element('li', `miniopt-diagnostic miniopt-diagnostic--${item.tone}`, item.text)
    );
  }
  diagnosticsCount.textContent = `${items.length} observación${items.length === 1 ? '' : 'es'}`;
}

function switchTab(tabName) {
  for (const button of document.querySelectorAll('.ova-tab[data-tab]')) {
    const active = button.dataset.tab === tabName;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  }
  for (const panel of document.querySelectorAll('.ova-tab-content')) {
    panel.classList.toggle('active', panel.id === `panel-${tabName}`);
  }
}

function copyOutput() {
  const text = lastOutput || optimizedOutput.textContent;
  if (!text || text === '(sin resultado todavía)' || text === '(programa vacío)') {
    setStatus('Todavía no hay un TAC optimizado para copiar.', 'warn');
    return;
  }

  const done = () => setStatus('TAC optimizado copiado al portapapeles.', 'ok');
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', '');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  document.body.appendChild(helper);
  helper.select();
  try {
    document.execCommand('copy');
    done();
  } catch {
    setStatus('No se pudo copiar automáticamente. Seleccione el texto manualmente.', 'warn');
  }
  helper.remove();
}

function downloadOutput() {
  const text = lastOutput || optimizedOutput.textContent;
  if (!text || text === '(sin resultado todavía)' || text === '(programa vacío)') {
    setStatus('Todavía no hay un TAC optimizado para descargar.', 'warn');
    return;
  }
  const blob = new Blob([`${text}\n`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'miniopt-optimizado.tac';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus('Archivo miniopt-optimizado.tac generado.', 'ok');
}

function initialize() {
  window.USB_OVA_THEME?.init();
  populateSamples();
  buildToggles();
  updateGutter();
  loadSample(SAMPLES[0].id);

  input.addEventListener('input', () => {
    updateGutter();
    stepState = null;
    lastOutput = '';
    if (currentResult) {
      setStatus('La entrada cambió. Pulse Optimizar para recalcular.', 'warn');
    }
  });
  input.addEventListener('scroll', syncGutterScroll);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = `${input.value.slice(0, start)}  ${input.value.slice(end)}`;
      input.selectionStart = start + 2;
      input.selectionEnd = start + 2;
      stepState = null;
      updateGutter();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      runOptimize();
    }
  });

  sampleSelect.addEventListener('change', () => loadSample(sampleSelect.value));
  aggressive.addEventListener('change', () => {
    stepState = null;
    if (currentResult) runOptimize();
  });

  btnOptimize.addEventListener('click', runOptimize);
  btnStep.addEventListener('click', runStep);
  btnReset.addEventListener('click', resetAll);
  btnCopy.addEventListener('click', copyOutput);
  btnDownload.addEventListener('click', downloadOutput);

  for (const button of document.querySelectorAll('.ova-tab[data-tab]')) {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const tabs = [...document.querySelectorAll('.ova-tab[data-tab]')];
      const index = tabs.indexOf(button);
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
      event.preventDefault();
      tabs[next].focus();
      switchTab(tabs[next].dataset.tab);
    });
  }

  switchTab('optimized');
}

initialize();
