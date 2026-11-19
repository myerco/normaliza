import { levelFromXp as coreLevelFromXp, xpForQuest as coreXpForQuest } from '../src/core/progression.js';
import { PHASE_DATA } from '../supabase/functions/_shared/phase-data.js';
import { levelFromXp, xpForQuest } from '../supabase/functions/_shared/progression.js';
import { scoreSolution } from '../supabase/functions/_shared/score.js';
import { assert, assertDeepEqual, assertEqual, test } from './helpers.js';

test('catálogo do servidor está sincronizado com data/phases', async () => {
  const files = [
    'fase-1.json',
    'fase-2.json',
    'fase-3.json',
    'fase-4.json'
  ];

  for (const file of files) {
    const response = await fetch(`../data/phases/${file}`);
    assert(response.ok, `Falha ao carregar ${file}.`);
    const data = await response.json();
    assertDeepEqual(PHASE_DATA[data.id], data);
  }
});

test('servidor valida e pontua as quatro fases canônicas', () => {
  const phase1 = scoreSolution({
    phaseId: 'centro-de-distribuicao',
    snapshot: {
      phaseId: 'centro-de-distribuicao',
      items: [
        { orderId: '001', product: 'Caneta' },
        { orderId: '001', product: 'Lápis' },
        { orderId: '002', product: 'Borracha' },
        { orderId: '002', product: 'Régua' },
        { orderId: '003', product: 'Caneta' }
      ],
      completed: true
    },
    source: 'online'
  });
  const phase2 = scoreSolution({
    phaseId: 'rede-de-dependencias',
    snapshot: {
      phaseId: 'rede-de-dependencias',
      dependencies: [
        { id: 'pedido+produto->quantidade', determinant: ['pedido', 'produto'], dependent: 'quantidade', type: 'total' },
        { id: 'produto->descricao', determinant: ['produto'], dependent: 'descricao', type: 'partial' },
        { id: 'produto->preco', determinant: ['produto'], dependent: 'preco', type: 'partial' }
      ],
      tables: {
        item_pedido: { attributes: ['pedido', 'produto', 'quantidade'], primaryKey: ['pedido', 'produto'] },
        produto: { attributes: ['produto', 'descricao', 'preco'], primaryKey: ['produto'] }
      },
      completed: true
    },
    source: 'online'
  });
  const phase3 = scoreSolution({
    phaseId: 'cidade-organizada',
    snapshot: {
      phaseId: 'cidade-organizada',
      transitiveDependencyId: 'fd-localizacao',
      builtTables: ['funcionario', 'departamento'],
      tables: {
        funcionario: { attributes: ['cpf', 'nome', 'departamento'], primaryKey: ['cpf'], foreignKeys: ['departamento'] },
        departamento: { attributes: ['departamento', 'localizacao'], primaryKey: ['departamento'], foreignKeys: [] }
      },
      relationships: [
        {
          id: 'funcionario.departamento->departamento.departamento',
          fromTable: 'funcionario',
          fromAttribute: 'departamento',
          toTable: 'departamento',
          toAttribute: 'departamento'
        }
      ],
      completed: true
    },
    source: 'online'
  });
  const phase4 = scoreSolution({
    phaseId: 'gestao-de-funcionarios-e-pedidos',
    snapshot: {
      phaseId: 'gestao-de-funcionarios-e-pedidos',
      keyDependencyId: 'fd-funcionario-departamento',
      builtTables: ['pedido', 'funcionario', 'departamento'],
      tables: {
        pedido: { attributes: ['pedido', 'cliente', 'funcionario'], primaryKey: ['pedido'], foreignKeys: ['funcionario'] },
        funcionario: { attributes: ['funcionario', 'nome_funcionario', 'departamento'], primaryKey: ['funcionario'], foreignKeys: ['departamento'] },
        departamento: { attributes: ['departamento', 'localizacao'], primaryKey: ['departamento'], foreignKeys: [] }
      },
      relationships: [
        {
          id: 'pedido.funcionario->funcionario.funcionario',
          fromTable: 'pedido',
          fromAttribute: 'funcionario',
          toTable: 'funcionario',
          toAttribute: 'funcionario'
        },
        {
          id: 'funcionario.departamento->departamento.departamento',
          fromTable: 'funcionario',
          fromAttribute: 'departamento',
          toTable: 'departamento',
          toAttribute: 'departamento'
        }
      ],
      completed: true
    },
    source: 'online'
  });

  for (const result of [phase1, phase2, phase3, phase4]) {
    assert(result.valid, result.errors?.join(' '));
    assertEqual(result.score, 100);
  }
});

test('servidor rejeita solução adulterada e aplica política offline', () => {
  const invalid = scoreSolution({
    phaseId: 'centro-de-distribuicao',
    snapshot: {
      phaseId: 'centro-de-distribuicao',
      items: [],
      completed: true
    },
    source: 'online'
  });
  assertEqual(invalid.valid, false);

  const offline = scoreSolution({
    phaseId: 'centro-de-distribuicao',
    snapshot: {
      phaseId: 'centro-de-distribuicao',
      items: [
        { orderId: '001', product: 'Caneta' },
        { orderId: '001', product: 'Lápis' },
        { orderId: '002', product: 'Borracha' },
        { orderId: '002', product: 'Régua' },
        { orderId: '003', product: 'Caneta' }
      ],
      completed: true
    },
    source: 'offline'
  });
  assertEqual(offline.valid, true);
  assertEqual(offline.score, 90);
});

test('servidor usa contadores registrados na tentativa', () => {
  const result = scoreSolution({
    phaseId: 'centro-de-distribuicao',
    snapshot: {
      phaseId: 'centro-de-distribuicao',
      items: [
        { orderId: '001', product: 'Caneta' },
        { orderId: '001', product: 'Lápis' },
        { orderId: '002', product: 'Borracha' },
        { orderId: '002', product: 'Régua' },
        { orderId: '003', product: 'Caneta' }
      ],
      completed: true
    },
    attempt: { validation_count: 3, hint_count: 1 },
    source: 'online'
  });

  assertEqual(result.valid, true);
  assertEqual(result.score, 75);
});
test('progressão canônica do servidor permanece sincronizada com o cliente', () => {
  for (const xp of [0, 50, 149, 150, 349, 350, 600, 900, 3150, 4000]) {
    assertEqual(levelFromXp(xp).level, coreLevelFromXp(xp).level);
    assertEqual(levelFromXp(xp).title, coreLevelFromXp(xp).title);
  }

  for (const score of [0, 50, 90, 180, 360, 400]) {
    const quest = { xpReward: 150, maxScore: 400 };
    assertEqual(xpForQuest(quest, score), coreXpForQuest(quest, score));
  }
});
