/**
 * MiniOpt — Controlador de Interfaz Web
 * Sincronizado con el Portal OVAS USB (tema claro/oscuro, ejemplos, tabs y evidencias).
 */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  if (window.USB_OVA_THEME) {
    window.USB_OVA_THEME.init();
  }

  const EXAMPLES = {
    'pdf-demo': {
      label: 'Ejemplo oficial del PDF',
      code: [
        '// Ejemplo ilustrativo del documento del examen',
        't1 = 5 + 3',
        't2 = t1 * 2',
        't3 = t2 + 0',
        'x = t3'
      ].join('\n')
    },
    'algebraic': {
      label: 'Simplificaciones algebraicas y protección de división',
      code: [
        '// Identidades algebraicas seguras vs. casos protegidos',
        't1 = a + 0',
        't2 = t1 * 1',
        't3 = b * 0',
        't4 = c - c',
        'r1 = t2',
        'r2 = t3',
        'r3 = t4',
        '// Casos NO simplificados porque a podría ser 0:',
        'seguro1 = 0 / a',
        'seguro2 = a / a'
      ].join('\n')
    },
    'redundant-temps': {
      label: 'Eliminación de temporales redundantes',
      code: [
        '// Temporales de un solo uso y cadenas de copia',
        't1 = a + b',
        'suma = t1',
        't2 = suma',
        't3 = t2',
        'resultado = t3',
        'resultado = resultado'
      ].join('\n')
    },
    'dead-code': {
      label: 'Eliminación de código muerto e inalcanzable',
      code: [
        '// Temporal no usado, reasignación muerta y código inalcanzable',
        't1 = a * b',
        'x = 10',
        'x = 25',
        'sinUso = 999',
        'print x',
        'goto L_FIN',
        'inalcanzable = 42',
        'L_FIN:'
      ].join('\n')
    },
    'side-effects': {
      label: 'Protección de efectos secundarios',
      code: [
        '// Las llamadas, lecturas y salidas NUNCA se eliminan',
        't1 = call leerSensor, 0',
        'read entradaUsuario',
        'call registrarAuditoria, 0',
        't2 = 10 + 15',
        't3 = t2 * 1',
        'print t3'
      ].join('\n')
    },
    'loop-safety': {
      label: 'Ciclo while y seguridad en bloques básicos',
      code: [
        '// i = 0 no se propaga dentro de L1 porque es inicio de ciclo',
        'i = 0',
        'L1:',
        't1 = i < 5',
        'ifFalse t1 goto L2',
        'print i',
        't2 = i + 1',
        'i = t2',
        'goto L1',
        'L2:'
      ].join('\n')
    },
    'div-zero': {
      label: 'Caso límite: división por cero',
      code: [
        '// División entre 0: se conserva sin plegar por seguridad',
        't1 = 10 / 0',
        'x = t1'
      ].join('\n')
    },
    'syntax-error': {
      label: 'Caso inválido: error de sintaxis',
      code: [
        't1 = 5 + 3',
        'x = 10 +',
        'goto L_NO_EXISTE'
      ].join('\n')
    }
  };

  // Referencias del DOM
  const tacInput = document.getElementById('tac-input');
  const editorGutter = document.getElementById('editor-gutter');
  const inputLineCount = document.getElementById('input-line-count');
  const exampleSelect = document.getElementById('example-select');
  const btnOptimize = document.getElementById('btn-optimize');
  const btnClear = document.getElementById('btn-clear');
  const btnFormatLines = document.getElementById('btn-format-lines');
  const btnResetRules = document.getElementById('btn-reset-rules');
  const btnCopyOptimized = document.getElementById('btn-copy-optimized');

  const chkFolding = document.getElementById('opt-folding');
  const chkPropagation = document.getElementById('opt-propagation');
  const chkAlgebraic = document.getElementById('opt-algebraic');
  const chkTemps = document.getElementById('opt-temps');
  const chkDce = document.getElementById('opt-dce');

  const statusBar = document.getElementById('status-bar');
  const statusText = document.getElementById('status-text');
  const errorBox = document.getElementById('error-box');
  const errorList = document.getElementById('error-list');

  const metricOriginal = document.getElementById('metric-original');
  const metricOptimized = document.getElementById('metric-optimized');
  const metricReduction = document.getElementById('metric-reduction');
  const metricSteps = document.getElementById('metric-steps');
  const metricEquiv = document.getElementById('metric-equiv');
  const metricEquivCard = document.getElementById('metric-equiv-card');
  const tabStepsCount = document.getElementById('tab-steps-count');
  const badgeOrigCount = document.getElementById('badge-orig-count');

  const originalCodeView = document.getElementById('original-code-view');
  const optimizedCodeView = document.getElementById('optimized-code-view');
  const rulesSummary = document.getElementById('rules-summary');
  const equivalenceBox = document.getElementById('equivalence-box');
  const stepsContainer = document.getElementById('steps-container');
  const safetyContainer = document.getElementById('safety-container');
  const passesContainer = document.getElementById('passes-container');

  let lastOptimizedText = '';

  // ── Utilidades de UI ──────────────────────────────────────────────────────

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateGutter() {
    const lines = tacInput.value.split('\n');
    const count = Math.max(1, lines.length);
    const nums = [];
    for (let i = 1; i <= count; i++) nums.push(i);
    editorGutter.textContent = nums.join('\n');
    inputLineCount.textContent = `${count} ${count === 1 ? 'línea' : 'líneas'}`;
  }

  function setStatus(type, msg) {
    statusBar.className = `ova-status-bar status-${type}`;
    statusText.textContent = msg;
  }

  function getSelectedOptions() {
    return {
      constantFolding: chkFolding.checked,
      constantPropagation: chkPropagation.checked,
      algebraicSimplification: chkAlgebraic.checked,
      redundantTempElimination: chkTemps.checked,
      deadCodeElimination: chkDce.checked
    };
  }

  function renderCodeList(el, codeText, emptyMsg) {
    el.innerHTML = '';
    if (!codeText || !codeText.trim()) {
      el.innerHTML = `<li class="opt-code-line"><span class="opt-code-line__num">—</span><span class="opt-code-line__text" style="color:var(--usb-text-muted)">${escapeHtml(emptyMsg)}</span></li>`;
      return;
    }
    const lines = codeText.split('\n');
    const frag = document.createDocumentFragment();
    lines.forEach((line, idx) => {
      const li = document.createElement('li');
      li.className = 'opt-code-line';
      li.innerHTML = `<span class="opt-code-line__num">${idx + 1}</span><span class="opt-code-line__text">${escapeHtml(line)}</span>`;
      frag.appendChild(li);
    });
    el.appendChild(frag);
  }

  function renderRulesSummary(ruleCounts) {
    const items = [
      { id: 'constant-folding', label: 'Plegado de constantes' },
      { id: 'constant-propagation', label: 'Propagación de constantes' },
      { id: 'algebraic-simplification', label: 'Simplificación algebraica' },
      { id: 'redundant-temp', label: 'Temporales redundantes' },
      { id: 'dead-code', label: 'Eliminación de código muerto' }
    ];

    rulesSummary.innerHTML = items.map(item => `
      <div class="opt-rule-row">
        <span class="opt-rule-badge opt-rule-badge--${item.id}">${item.label}</span>
        <span class="opt-rule-count">${ruleCounts[item.id] || 0}</span>
      </div>
    `).join('');
  }

  function renderEquivalence(eq) {
    if (!eq) {
      equivalenceBox.innerHTML = '<p style="color:var(--usb-text-muted);font-size:0.8rem;margin:0;">Sin evaluación disponible.</p>';
      return;
    }

    const statusClass = eq.status === 'verified'
      ? 'verified'
      : (eq.status === 'static' ? 'static' : 'mismatch');
    const icon = eq.status === 'verified' ? '✓' : (eq.status === 'static' ? 'ℹ' : '✕');

    let detailsHtml = '';
    if (eq.status === 'verified' || eq.status === 'mismatch') {
      const inputsEntries = Object.entries(eq.testInputs || {});
      const inputsNote = inputsEntries.length > 0
        ? `<p style="font-size:0.74rem;color:var(--usb-text-muted);margin:0 0 8px;">Entradas libres simuladas: <code>${inputsEntries.map(([k, v]) => `${escapeHtml(k)} = ${escapeHtml(v)}`).join(', ')}</code></p>`
        : '';

      const origResult = eq.original.runtimeError
        ? `Error: ${eq.original.runtimeError}`
        : (eq.original.outputs.length > 0
          ? `print → [${eq.original.outputs.join(', ')}]`
          : (eq.original.returnValue !== undefined
            ? `return ${eq.original.returnValue}`
            : formatVarsObj(eq.original.userVars)));

      const optResult = eq.optimized.runtimeError
        ? `Error: ${eq.optimized.runtimeError}`
        : (eq.optimized.outputs.length > 0
          ? `print → [${eq.optimized.outputs.join(', ')}]`
          : (eq.optimized.returnValue !== undefined
            ? `return ${eq.optimized.returnValue}`
            : formatVarsObj(eq.optimized.userVars)));

      detailsHtml = `
        ${inputsNote}
        <table class="opt-equiv-table">
          <thead>
            <tr>
              <th>Versión</th>
              <th>Resultado observable</th>
              <th>Pasos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Original</td>
              <td>${escapeHtml(origResult)}</td>
              <td>${eq.original.execSteps ?? '—'}</td>
            </tr>
            <tr>
              <td>Optimizado</td>
              <td>${escapeHtml(optResult)}</td>
              <td>${eq.optimized.execSteps ?? '—'}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    equivalenceBox.innerHTML = `
      <div class="opt-equiv-status opt-equiv-status--${statusClass}">
        <span>${icon}</span>
        <span>${escapeHtml(eq.message)}</span>
      </div>
      ${detailsHtml}
    `;
  }

  function formatVarsObj(obj) {
    const entries = Object.entries(obj || {});
    if (entries.length === 0) return '(sin variables de salida)';
    return entries.map(([k, v]) => `${k} = ${v}`).join(', ');
  }

  function renderSteps(steps, safetyNotices) {
    if (!steps || steps.length === 0) {
      stepsContainer.innerHTML = `
        <div class="ova-empty-state">
          <div class="ova-empty-state__icon">✓</div>
          <div>No se aplicaron transformaciones. El código ya estaba optimizado o todas las instrucciones deben conservarse por seguridad.</div>
        </div>
      `;
    } else {
      stepsContainer.innerHTML = steps.map(s => `
        <article class="opt-step-card">
          <div class="opt-step-card__head">
            <strong>Paso #${s.step}</strong>
            <span class="opt-rule-badge opt-rule-badge--${s.ruleId}">${escapeHtml(s.ruleName)}</span>
            <span>Pasada ${s.pass} · Línea ${s.line}</span>
          </div>
          <div class="opt-step-card__diff">
            <span class="opt-diff-before">${escapeHtml(s.before)}</span>
            <span class="opt-diff-arrow">→</span>
            <span class="opt-diff-after">${escapeHtml(s.after)}</span>
          </div>
          <p class="opt-step-card__reason">${escapeHtml(s.reason)}</p>
        </article>
      `).join('');
    }

    if (safetyNotices && safetyNotices.length > 0) {
      safetyContainer.innerHTML = `
        <section class="opt-safety-section">
          <h4>🛡 Protecciones de seguridad semántica aplicadas (${safetyNotices.length})</h4>
          <ul class="opt-safety-list">
            ${safetyNotices.map(n => `
              <li><strong>Línea ${n.line}</strong> (<code>${escapeHtml(n.instruction)}</code>): ${escapeHtml(n.message)}</li>
            `).join('')}
          </ul>
        </section>
      `;
    } else {
      safetyContainer.innerHTML = '';
    }
  }

  function renderPasses(originalCode, snapshots) {
    const cards = [
      { title: 'Estado Inicial (Entrada TAC)', count: originalCode ? originalCode.split('\n').length : 0, code: originalCode }
    ];
    (snapshots || []).forEach(snap => {
      cards.push({
        title: `Después de Pasada ${snap.pass}`,
        count: snap.instructionCount,
        code: snap.code || '(sin instrucciones restantes)'
      });
    });

    passesContainer.innerHTML = cards.map(c => `
      <article class="opt-pass-card">
        <div class="opt-pass-card__head">
          <span>${escapeHtml(c.title)}</span>
          <span>${c.count} ${c.count === 1 ? 'instrucción' : 'instrucciones'}</span>
        </div>
        <pre>${escapeHtml(c.code)}</pre>
      </article>
    `).join('');
  }

  // ── Ejecución de la optimización ──────────────────────────────────────────

  function runOptimization() {
    const source = tacInput.value;
    const options = getSelectedOptions();
    const result = window.MiniOptEngine.optimizeTAC(source, options);

    if (!result.ok) {
      errorBox.classList.remove('hidden');
      errorList.innerHTML = result.errors.map(err => `
        <li><strong>Línea ${err.line}:</strong> ${escapeHtml(err.message)}${err.raw ? ` <code>${escapeHtml(err.raw)}</code>` : ''}</li>
      `).join('');

      setStatus('err', `Se encontraron ${result.errors.length} ${result.errors.length === 1 ? 'error' : 'errores'} en el código TAC.`);
      metricOriginal.textContent = '0';
      metricOptimized.textContent = '0';
      metricReduction.textContent = '0%';
      metricSteps.textContent = '0';
      metricEquiv.textContent = 'Error';
      metricEquivCard.className = 'opt-metric-card opt-metric-card--warn';
      tabStepsCount.textContent = '0';
      badgeOrigCount.textContent = '0 instrucciones';
      lastOptimizedText = '';

      renderCodeList(originalCodeView, '', 'Corrige los errores de sintaxis en el editor.');
      renderCodeList(optimizedCodeView, '', 'Sin salida optimizada debido a errores.');
      renderRulesSummary({});
      renderEquivalence(null);
      stepsContainer.innerHTML = '<div class="ova-empty-state"><div class="ova-empty-state__icon">⚠</div><div>Corrige los errores sintácticos de entrada para visualizar el análisis paso a paso.</div></div>';
      safetyContainer.innerHTML = '';
      passesContainer.innerHTML = '';
      return;
    }

    errorBox.classList.add('hidden');
    errorList.innerHTML = '';

    const s = result.summary;
    lastOptimizedText = result.optimizedCode;

    metricOriginal.textContent = String(s.originalCount);
    metricOptimized.textContent = String(s.optimizedCount);
    metricReduction.textContent = `${s.reductionPct}%`;
    metricSteps.textContent = String(s.totalTransformations);
    tabStepsCount.textContent = String(s.totalTransformations);
    badgeOrigCount.textContent = `${s.originalCount} ${s.originalCount === 1 ? 'instrucción' : 'instrucciones'}`;

    if (result.equivalence.status === 'verified') {
      metricEquiv.textContent = 'Verificada ✓';
      metricEquivCard.className = 'opt-metric-card opt-metric-card--ok';
    } else if (result.equivalence.status === 'static') {
      metricEquiv.textContent = 'Estática 🛡';
      metricEquivCard.className = 'opt-metric-card opt-metric-card--ok';
    } else {
      metricEquiv.textContent = 'Revisar ⚠';
      metricEquivCard.className = 'opt-metric-card opt-metric-card--warn';
    }

    if (s.totalTransformations > 0) {
      setStatus(
        'ok',
        `Optimización completada en ${s.iterations} ${s.iterations === 1 ? 'pasada' : 'pasadas'}: ${s.totalTransformations} transformaciones aplicadas (${s.originalCount} → ${s.optimizedCount} instrucciones).`
      );
    } else {
      setStatus(
        'warn',
        `Análisis completado sin cambios (${s.originalCount} instrucciones conservadas por seguridad o código ya óptimo).`
      );
    }

    renderCodeList(originalCodeView, result.originalCode, '(vacío)');
    renderCodeList(optimizedCodeView, result.optimizedCode, '(todas las instrucciones temporales fueron eliminadas)');
    renderRulesSummary(s.ruleCounts);
    renderEquivalence(result.equivalence);
    renderSteps(result.steps, result.safetyNotices);
    renderPasses(result.originalCode, result.passSnapshots);
  }

  // ── Eventos ───────────────────────────────────────────────────────────────

  tacInput.addEventListener('input', updateGutter);
  tacInput.addEventListener('scroll', () => {
    editorGutter.scrollTop = tacInput.scrollTop;
  });

  tacInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      runOptimization();
    }
  });

  btnOptimize.addEventListener('click', runOptimization);

  btnClear.addEventListener('click', () => {
    tacInput.value = '';
    updateGutter();
    setStatus('warn', 'Editor limpiado. Ingresa código TAC o selecciona un ejemplo.');
    errorBox.classList.add('hidden');
  });

  btnFormatLines.addEventListener('click', () => {
    const raw = tacInput.value;
    const formatted = raw
      .split('\n')
      .flatMap(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) return [line];
        return trimmed.split(';').map(s => s.trim()).filter(Boolean);
      })
      .join('\n');
    tacInput.value = formatted;
    updateGutter();
  });

  btnResetRules.addEventListener('click', () => {
    [chkFolding, chkPropagation, chkAlgebraic, chkTemps, chkDce].forEach(c => { c.checked = true; });
    runOptimization();
  });

  [chkFolding, chkPropagation, chkAlgebraic, chkTemps, chkDce].forEach(chk => {
    chk.addEventListener('change', runOptimization);
  });

  exampleSelect.addEventListener('change', () => {
    const ex = EXAMPLES[exampleSelect.value];
    if (ex) {
      tacInput.value = ex.code;
      updateGutter();
      runOptimization();
    }
  });

  btnCopyOptimized.addEventListener('click', async () => {
    if (!lastOptimizedText) return;
    try {
      await navigator.clipboard.writeText(lastOptimizedText);
      const prev = btnCopyOptimized.textContent;
      btnCopyOptimized.textContent = '¡Copiado!';
      setTimeout(() => { btnCopyOptimized.textContent = prev; }, 1400);
    } catch {
      btnCopyOptimized.textContent = 'No disponible';
      setTimeout(() => { btnCopyOptimized.textContent = 'Copiar'; }, 1400);
    }
  });

  // Navegación de pestañas
  const tabButtons = document.querySelectorAll('.ova-tab');
  const tabPanels = document.querySelectorAll('.ova-tab-content');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
    });
  });

  // Cargar ejemplo oficial del PDF al iniciar
  tacInput.value = EXAMPLES['pdf-demo'].code;
  updateGutter();
  runOptimization();
});
