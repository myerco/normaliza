const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assert(condition, message = 'Asserção falhou.') {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual(actual, expected, message = '') {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message} Esperado: ${format(expected)}. Recebido: ${format(actual)}.`);
  }
}

export function assertDeepEqual(actual, expected, message = '') {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message} Esperado: ${expectedJson}. Recebido: ${actualJson}.`);
  }
}

export async function runTests() {
  const results = [];

  for (const { name, fn } of tests) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error });
    }
  }

  renderResults(results);
  return results;
}

function renderResults(results) {
  const list = document.getElementById('test-results');
  const summary = document.getElementById('test-summary');
  const passed = results.filter((result) => result.ok).length;
  const failed = results.length - passed;

  list.replaceChildren();

  for (const result of results) {
    const item = document.createElement('li');
    item.dataset.status = result.ok ? 'pass' : 'fail';

    const name = document.createElement('span');
    name.textContent = result.name;
    item.append(name);

    if (!result.ok) {
      const detail = document.createElement('pre');
      detail.textContent = result.error && result.error.stack
        ? result.error.stack
        : String(result.error);
      item.append(detail);
    }

    list.append(item);
  }

  summary.textContent = `${passed} passaram, ${failed} falharam`;
  summary.dataset.passed = String(passed);
  summary.dataset.failed = String(failed);
  document.body.dataset.testStatus = failed === 0 ? 'pass' : 'fail';
  document.title = failed === 0 ? 'PASS — Testes NORMALIZA!' : 'FAIL — Testes NORMALIZA!';
  window.__NORMALIZA_TEST_RESULTS__ = { passed, failed, results };
}

function format(value) {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}
