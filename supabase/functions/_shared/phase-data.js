export const PHASE_DATA = {
  "centro-de-distribuicao": {
    "id": "centro-de-distribuicao",
    "title": "Centro de Distribuição",
    "normalForm": "1FN",
    "sourceTable": "PEDIDO",
    "targetTable": "ITEM_PEDIDO",
    "objective": "Identificar grupos repetitivos e transformar cada produto em um registro atômico em ITEM_PEDIDO.",
    "summary": "Os pedidos chegaram com vários produtos na mesma célula. Separe cada produto em uma linha própria, mantendo o id_pedido.",
    "rules": [
      "Cada célula deve conter um único valor atômico.",
      "Cada produto deve ter sua própria linha em ITEM_PEDIDO.",
      "Toda linha de ITEM_PEDIDO deve manter o id_pedido de origem.",
      "PEDIDO não deve manter listas de produtos."
    ],
    "concepts": {
      "repeatingGroups": "Grupo repetitivo: quando uma célula guarda vários valores, como “Caneta, Lápis”.",
      "atomicity": "Atomicidade: cada célula deve conter um único valor indivisível. Na 1FN, cada produto ocupa um registro próprio."
    },
    "orders": [
      {
        "id": "001",
        "customer": "João",
        "products": [
          "Caneta",
          "Lápis"
        ]
      },
      {
        "id": "002",
        "customer": "Maria",
        "products": [
          "Borracha",
          "Régua"
        ]
      },
      {
        "id": "003",
        "customer": "Pedro",
        "products": [
          "Caneta"
        ]
      }
    ],
    "hints": [
      "Cada produto precisa de uma linha própria em ITEM_PEDIDO.",
      "Ao mover um produto, o id_pedido deve ir junto. Sem ele, a ligação com o pedido se perde.",
      "A amostra tem 3 pedidos e 5 produtos. Ao final, ITEM_PEDIDO deve ter 5 linhas."
    ],
    "scoring": {
      "pointsPerItem": 10,
      "completionBonus": 50,
      "wrongValidationPenalty": 10,
      "hintPenalty": 5,
      "max": 100
    }
  },
  "rede-de-dependencias": {
    "id": "rede-de-dependencias",
    "title": "Rede de Dependências",
    "normalForm": "2FN",
    "sourceTable": "ITEM_PEDIDO",
    "objective": "Identificar dependências funcionais totais e parciais, construir a rede e decompor a tabela.",
    "summary": "A tabela ITEM_PEDIDO tem chave composta (Pedido, Produto). Descrição e Preço dependem apenas de Produto, não da chave inteira.",
    "attributes": [
      {
        "id": "pedido",
        "label": "Pedido",
        "role": "key"
      },
      {
        "id": "produto",
        "label": "Produto",
        "role": "key"
      },
      {
        "id": "quantidade",
        "label": "Quantidade",
        "role": "dependent"
      },
      {
        "id": "descricao",
        "label": "Descrição",
        "role": "dependent"
      },
      {
        "id": "preco",
        "label": "Preço",
        "role": "dependent"
      }
    ],
    "candidateKey": [
      "pedido",
      "produto"
    ],
    "functionalDependencies": [
      {
        "id": "fd-quantidade",
        "determinant": [
          "pedido",
          "produto"
        ],
        "dependent": "quantidade",
        "type": "total",
        "label": "(Pedido, Produto) → Quantidade"
      },
      {
        "id": "fd-descricao",
        "determinant": [
          "produto"
        ],
        "dependent": "descricao",
        "type": "partial",
        "label": "Produto → Descrição"
      },
      {
        "id": "fd-preco",
        "determinant": [
          "produto"
        ],
        "dependent": "preco",
        "type": "partial",
        "label": "Produto → Preço"
      }
    ],
    "rows": [
      {
        "pedido": "001",
        "produto": "1001",
        "quantidade": 2,
        "descricao": "Caneta",
        "preco": "1,50"
      },
      {
        "pedido": "001",
        "produto": "1002",
        "quantidade": 1,
        "descricao": "Lápis",
        "preco": "1,00"
      },
      {
        "pedido": "002",
        "produto": "1001",
        "quantidade": 5,
        "descricao": "Caneta",
        "preco": "1,50"
      }
    ],
    "targetTables": [
      {
        "id": "item_pedido",
        "name": "ITEM_PEDIDO",
        "attributes": [
          "pedido",
          "produto",
          "quantidade"
        ],
        "primaryKey": [
          "pedido",
          "produto"
        ]
      },
      {
        "id": "produto",
        "name": "PRODUTO",
        "attributes": [
          "produto",
          "descricao",
          "preco"
        ],
        "primaryKey": [
          "produto"
        ]
      }
    ],
    "concepts": {
      "total": "Dependência funcional total: o determinante é a chave inteira (Pedido, Produto). Quantidade depende dos dois atributos.",
      "partial": "Dependência funcional parcial: um atributo não primo depende de parte da chave composta. Descrição e Preço dependem apenas de Produto.",
      "secondNormalForm": "2FN: a relação está em 1FN e todo atributo não primo depende da chave inteira, nunca de parte dela."
    },
    "rules": [
      "A chave primária composta é (Pedido, Produto).",
      "(Pedido, Produto) → Quantidade é uma dependência total.",
      "Produto → Descrição e Produto → Preço são dependências parciais.",
      "Atributos não primos não podem depender de parte da chave.",
      "A decomposição deve preservar os atributos e as dependências declaradas."
    ],
    "hints": [
      "Quantidade só pode ser determinada quando você conhece o pedido e o produto.",
      "Descrição e Preço se repetem para o mesmo produto. Elas dependem apenas de Produto.",
      "Em 2FN, atributos que dependem de parte da chave composta saem para uma nova tabela.",
      "ITEM_PEDIDO fica com Pedido, Produto e Quantidade; PRODUTO fica com Produto, Descrição e Preço."
    ],
    "scoring": {
      "pointsPerDependency": 10,
      "pointsPerMembership": 5,
      "pointsPerPrimaryKey": 10,
      "completionBonus": 10,
      "wrongValidationPenalty": 10,
      "hintPenalty": 5,
      "max": 100
    },
    "cityEvolution": {
      "buildings": [
        {
          "id": "item_pedido",
          "name": "ITEM_PEDIDO",
          "description": "Itens de pedido após a decomposição da 2FN.",
          "recordCount": 3,
          "attributes": [
            "pedido",
            "produto",
            "quantidade"
          ],
          "position": {
            "x": 760,
            "y": 330
          },
          "size": {
            "width": 100,
            "depth": 80,
            "height": 80
          },
          "color": "#457b9d",
          "badgeLabel": "2FN"
        }
      ],
      "links": [
        {
          "from": "pedido",
          "to": "item_pedido",
          "label": "1:N"
        },
        {
          "from": "produto",
          "to": "item_pedido",
          "label": "1:N"
        }
      ],
      "normalizedBuildings": [
        {
          "id": "produto",
          "badgeLabel": "2FN"
        }
      ]
    }
  },
  "cidade-organizada": {
    "id": "cidade-organizada",
    "title": "Cidade Organizada",
    "normalForm": "3FN",
    "sourceTable": "FUNCIONÁRIO",
    "objective": "Identificar dependências transitivas, construir novas tabelas, definir chaves e relacionamentos e validar a decomposição.",
    "summary": "A tabela FUNCIONÁRIO contém uma dependência transitiva: Departamento → Localização. Localização deve sair para uma tabela própria.",
    "attributes": [
      {
        "id": "cpf",
        "label": "CPF",
        "role": "key"
      },
      {
        "id": "nome",
        "label": "Nome",
        "role": "dependent"
      },
      {
        "id": "departamento",
        "label": "Departamento",
        "role": "determinant"
      },
      {
        "id": "localizacao",
        "label": "Localização",
        "role": "transitive"
      }
    ],
    "candidateKey": [
      "cpf"
    ],
    "functionalDependencies": [
      {
        "id": "fd-nome",
        "determinant": [
          "cpf"
        ],
        "dependent": "nome",
        "type": "direct",
        "label": "CPF → Nome"
      },
      {
        "id": "fd-departamento",
        "determinant": [
          "cpf"
        ],
        "dependent": "departamento",
        "type": "direct",
        "label": "CPF → Departamento"
      },
      {
        "id": "fd-localizacao",
        "determinant": [
          "departamento"
        ],
        "dependent": "localizacao",
        "type": "transitive",
        "label": "Departamento → Localização"
      }
    ],
    "transitiveDependencyId": "fd-localizacao",
    "rows": [
      {
        "cpf": "111",
        "nome": "João",
        "departamento": "TI",
        "localizacao": "Porto Velho"
      },
      {
        "cpf": "222",
        "nome": "Maria",
        "departamento": "RH",
        "localizacao": "Ji-Paraná"
      },
      {
        "cpf": "333",
        "nome": "Pedro",
        "departamento": "TI",
        "localizacao": "Porto Velho"
      }
    ],
    "targetTables": [
      {
        "id": "funcionario",
        "name": "FUNCIONÁRIO",
        "attributes": [
          "cpf",
          "nome",
          "departamento"
        ],
        "primaryKey": [
          "cpf"
        ],
        "foreignKeys": [
          {
            "attribute": "departamento",
            "references": {
              "table": "departamento",
              "attribute": "departamento"
            }
          }
        ]
      },
      {
        "id": "departamento",
        "name": "DEPARTAMENTO",
        "attributes": [
          "departamento",
          "localizacao"
        ],
        "primaryKey": [
          "departamento"
        ],
        "foreignKeys": []
      }
    ],
    "relationships": [
      {
        "id": "funcionario.departamento->departamento.departamento",
        "fromTable": "funcionario",
        "fromAttribute": "departamento",
        "toTable": "departamento",
        "toAttribute": "departamento",
        "label": "N:1"
      }
    ],
    "concepts": {
      "transitive": "Dependência transitiva: CPF → Departamento e Departamento → Localização. Como Departamento não é superchave, Localização depende transitivamente de CPF.",
      "thirdNormalForm": "3FN: a relação está em 2FN e, para toda DF não trivial X → A, X é superchave ou A é atributo primo.",
      "decomposition": "A decomposição separa Localização em DEPARTAMENTO, mantém CPF como chave de FUNCIONÁRIO e cria a FK Departamento."
    },
    "rules": [
      "A chave primária de FUNCIONÁRIO é CPF.",
      "CPF → Nome e CPF → Departamento são dependências diretas.",
      "Departamento → Localização é uma dependência transitiva.",
      "Localização não deve permanecer em FUNCIONÁRIO.",
      "A decomposição deve preservar atributos, dependências e ser sem perda."
    ],
    "hints": [
      "Localização depende de Departamento, não diretamente de CPF.",
      "Departamento → Localização é transitiva porque Departamento não é superchave.",
      "Construa FUNCIONÁRIO com CPF, Nome e Departamento, e DEPARTAMENTO com Departamento e Localização.",
      "A FK é FUNCIONÁRIO.Departamento → DEPARTAMENTO.Departamento."
    ],
    "scoring": {
      "pointsPerTransitive": 20,
      "pointsPerTable": 10,
      "pointsPerMembership": 5,
      "pointsPerPrimaryKey": 5,
      "pointsPerForeignKey": 5,
      "pointsPerRelationship": 10,
      "completionBonus": 10,
      "wrongValidationPenalty": 10,
      "hintPenalty": 5,
      "max": 100
    },
    "cityEvolution": {
      "buildings": [
        {
          "id": "departamento",
          "name": "DEPARTAMENTO",
          "description": "Departamentos e suas localizações após a decomposição da 3FN.",
          "recordCount": 2,
          "attributes": [
            "departamento",
            "localizacao"
          ],
          "position": {
            "x": 120,
            "y": 300
          },
          "size": {
            "width": 100,
            "depth": 80,
            "height": 90
          },
          "color": "#f15bb5",
          "badgeLabel": "3FN"
        }
      ],
      "links": [
        {
          "from": "funcionario",
          "to": "departamento",
          "label": "N:1"
        }
      ],
      "normalizedBuildings": [
        {
          "id": "funcionario",
          "badgeLabel": "3FN"
        }
      ]
    }
  },
  "gestao-de-funcionarios-e-pedidos": {
    "id": "gestao-de-funcionarios-e-pedidos",
    "phaseNumber": 4,
    "title": "Gestão de Funcionários e Pedidos",
    "normalForm": "3FN",
    "sourceTable": "PEDIDO",
    "objective": "Identificar a cadeia de dependências entre pedidos, funcionários e departamentos, construir as três tabelas e validar a decomposição.",
    "summary": "PEDIDO determina o funcionário; o funcionário determina seu nome e departamento; o departamento determina sua localização.",
    "attributes": [
      {
        "id": "pedido",
        "label": "Pedido",
        "role": "key"
      },
      {
        "id": "cliente",
        "label": "Cliente",
        "role": "dependent"
      },
      {
        "id": "funcionario",
        "label": "Funcionário",
        "role": "determinant"
      },
      {
        "id": "nome_funcionario",
        "label": "Nome Funcionário",
        "role": "dependent"
      },
      {
        "id": "departamento",
        "label": "Departamento",
        "role": "determinant"
      },
      {
        "id": "localizacao",
        "label": "Localização",
        "role": "transitive"
      }
    ],
    "candidateKey": [
      "pedido"
    ],
    "functionalDependencies": [
      {
        "id": "fd-pedido-cliente",
        "determinant": [
          "pedido"
        ],
        "dependent": "cliente",
        "type": "direct",
        "label": "Pedido → Cliente"
      },
      {
        "id": "fd-pedido-funcionario",
        "determinant": [
          "pedido"
        ],
        "dependent": "funcionario",
        "type": "direct",
        "label": "Pedido → Funcionário"
      },
      {
        "id": "fd-funcionario-nome",
        "determinant": [
          "funcionario"
        ],
        "dependent": "nome_funcionario",
        "type": "direct",
        "label": "Funcionário → Nome Funcionário"
      },
      {
        "id": "fd-funcionario-departamento",
        "determinant": [
          "funcionario"
        ],
        "dependent": "departamento",
        "type": "transitive",
        "label": "Funcionário → Departamento"
      },
      {
        "id": "fd-departamento-localizacao",
        "determinant": [
          "departamento"
        ],
        "dependent": "localizacao",
        "type": "transitive",
        "label": "Departamento → Localização"
      }
    ],
    "keyDependencyId": "fd-funcionario-departamento",
    "rows": [
      {
        "pedido": "001",
        "cliente": "João",
        "funcionario": "101",
        "nome_funcionario": "Carlos",
        "departamento": "Vendas",
        "localizacao": "Porto Velho"
      },
      {
        "pedido": "002",
        "cliente": "Maria",
        "funcionario": "102",
        "nome_funcionario": "Ana",
        "departamento": "Financeiro",
        "localizacao": "Ji-Paraná"
      },
      {
        "pedido": "003",
        "cliente": "Pedro",
        "funcionario": "101",
        "nome_funcionario": "Carlos",
        "departamento": "Vendas",
        "localizacao": "Porto Velho"
      },
      {
        "pedido": "004",
        "cliente": "José",
        "funcionario": "103",
        "nome_funcionario": "Paulo",
        "departamento": "Vendas",
        "localizacao": "Porto Velho"
      }
    ],
    "targetTables": [
      {
        "id": "pedido",
        "name": "PEDIDO",
        "attributes": [
          "pedido",
          "cliente",
          "funcionario"
        ],
        "primaryKey": [
          "pedido"
        ],
        "foreignKeys": [
          {
            "attribute": "funcionario",
            "references": {
              "table": "funcionario",
              "attribute": "funcionario"
            }
          }
        ]
      },
      {
        "id": "funcionario",
        "name": "FUNCIONÁRIO",
        "attributes": [
          "funcionario",
          "nome_funcionario",
          "departamento"
        ],
        "primaryKey": [
          "funcionario"
        ],
        "foreignKeys": [
          {
            "attribute": "departamento",
            "references": {
              "table": "departamento",
              "attribute": "departamento"
            }
          }
        ]
      },
      {
        "id": "departamento",
        "name": "DEPARTAMENTO",
        "attributes": [
          "departamento",
          "localizacao"
        ],
        "primaryKey": [
          "departamento"
        ],
        "foreignKeys": []
      }
    ],
    "relationships": [
      {
        "id": "pedido.funcionario->funcionario.funcionario",
        "fromTable": "pedido",
        "fromAttribute": "funcionario",
        "toTable": "funcionario",
        "toAttribute": "funcionario",
        "label": "N:1"
      },
      {
        "id": "funcionario.departamento->departamento.departamento",
        "fromTable": "funcionario",
        "fromAttribute": "departamento",
        "toTable": "departamento",
        "toAttribute": "departamento",
        "label": "N:1"
      }
    ],
    "concepts": {
      "transitive": "Pedido determina Funcionário e Funcionário determina Departamento. Como Funcionário não é superchave de PEDIDO, Departamento depende transitivamente de Pedido.",
      "thirdNormalForm": "3FN: a relação está em 2FN e, para toda DF não trivial X → A, X é superchave ou A é atributo primo.",
      "decomposition": "A decomposição separa o funcionário e seu departamento em FUNCIONÁRIO e DEPARTAMENTO, mantendo as FKs que preservam os relacionamentos."
    },
    "rules": [
      "A chave primária da tabela original é Pedido.",
      "Pedido → Cliente e Pedido → Funcionário são dependências diretas.",
      "Funcionário → Nome Funcionário e Funcionário → Departamento descrevem o funcionário.",
      "Departamento → Localização descreve o departamento.",
      "A cadeia Pedido → Funcionário → Departamento → Localização cria dependências transitivas.",
      "A decomposição deve preservar atributos, dependências e a junção."
    ],
    "hints": [
      "O nome do funcionário e o departamento não dependem diretamente de Pedido; eles descrevem o funcionário.",
      "O departamento determina sua localização. Localização não deve ficar em FUNCIONÁRIO.",
      "PEDIDO fica com Pedido, Cliente e Funcionário. FUNCIONÁRIO fica com Funcionário, Nome Funcionário e Departamento. DEPARTAMENTO fica com Departamento e Localização.",
      "Crie as FKs PEDIDO.Funcionário → FUNCIONÁRIO.Funcionário e FUNCIONÁRIO.Departamento → DEPARTAMENTO.Departamento."
    ],
    "scoring": {
      "pointsPerKeyDependency": 20,
      "pointsPerTable": 10,
      "pointsPerMembership": 5,
      "pointsPerPrimaryKey": 5,
      "pointsPerForeignKey": 5,
      "pointsPerRelationship": 10,
      "completionBonus": 10,
      "wrongValidationPenalty": 10,
      "hintPenalty": 5,
      "max": 100
    },
    "completion": {
      "title": "Três entidades, uma cidade mais organizada.",
      "explanation": "A tabela PEDIDO armazenava informações que descreviam outras entidades. O nome e o departamento pertencem ao funcionário, enquanto a localização pertence ao departamento. Ao armazenar essas informações diretamente na tabela PEDIDO, os mesmos dados poderiam ser repetidos em diversos pedidos. A decomposição permite que cada entidade mantenha suas próprias informações, reduzindo redundâncias e evitando anomalias de atualização.",
      "anomalies": [
        {
          "type": "Atualização",
          "title": "Mudança de departamento",
          "text": "Se Carlos mudar de departamento, todas as linhas de PEDIDO que falam dele precisariam ser atualizadas. Em FUNCIONÁRIO, basta uma linha."
        },
        {
          "type": "Inserção",
          "title": "Funcionário sem pedido",
          "text": "Na tabela original, não há como cadastrar um funcionário que ainda não atendeu nenhum pedido. FUNCIONÁRIO permite esse cadastro independentemente de PEDIDO."
        },
        {
          "type": "Exclusão",
          "title": "Perda ao excluir um pedido",
          "text": "Excluir o último pedido de um funcionário poderia apagar suas informações. Com FUNCIONÁRIO separado, os dados do funcionário permanecem."
        }
      ]
    },
    "cityEvolution": {
      "buildings": [
        {
          "id": "departamento",
          "name": "DEPARTAMENTO",
          "description": "Departamentos e suas localizações após a decomposição da 3FN.",
          "recordCount": 2,
          "attributes": [
            "departamento",
            "localizacao"
          ],
          "position": {
            "x": 120,
            "y": 300
          },
          "size": {
            "width": 100,
            "depth": 80,
            "height": 90
          },
          "color": "#f15bb5",
          "badgeLabel": "3FN"
        }
      ],
      "links": [
        {
          "from": "pedido",
          "to": "funcionario",
          "label": "N:1"
        },
        {
          "from": "funcionario",
          "to": "departamento",
          "label": "N:1"
        }
      ],
      "normalizedBuildings": [
        {
          "id": "pedido",
          "badgeLabel": "3FN"
        },
        {
          "id": "funcionario",
          "badgeLabel": "3FN"
        },
        {
          "id": "departamento",
          "badgeLabel": "3FN"
        }
      ]
    }
  }
};
