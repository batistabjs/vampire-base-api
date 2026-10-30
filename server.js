const http = require('http');
const url = require('url');
const amuleto = require('./amuleto');
const sangue = require('./sangue');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8080;

const CLAS_PERMITIDOS = ['Nosferatu', 'Dracul', 'Cullen', 'Carmilla'];

const SANGUES_PERMITIDOS = ['O-', 'A+', 'AB-', 'Sintético'];

const STATUS_PERMITIDOS = [
  'Acordado',
  'Em Torpor (Dormindo no Caixão)',
  'Em Caça',
  'Adormecido',
  'Destruido',
  'Desaparecido',
];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function checkAuth(req) {
  const token = amuleto.getTokenFromHeader(req);
  if (!token) return { error: 'Pare aí, mortal! Cadê seu Amuleto JWT?', status: 401 };
  const userId = amuleto.getUserIdFromToken(token);
  if (!userId) return { error: 'Amuleto inválido ou expirado', status: 403 };
  return { userId };
}

function parseQuery(queryString) {
  const params = {};
  if (!queryString) return params;
  for (const [key, value] of new URLSearchParams(queryString)) {
    params[key] = value;
  }
  return params;
}

function matchRoute(method, path) {
  const routes = {
    GET: [
      { pattern: /^\/vampiros\/cla\/([^/]+)$/, handler: 'byCla' },
      { pattern: /^\/vampiros\/fraqueza\/([^/]+)$/, handler: 'byFraqueza' },
      { pattern: /^\/vampiros\/buscar$/, handler: 'search' },
      { pattern: /^\/vampiros\/estatisticas$/, handler: 'stats' },
      { pattern: /^\/vampiros\/(\d+)$/, handler: 'show' },
      { pattern: /^\/vampiros$/, handler: 'index' },
      { pattern: /^\/cacadores$/, handler: 'listCacadores' },
      { pattern: /^\/auth\/me$/, handler: 'authMe' },
      { pattern: /^\/$/, handler: 'root' },
    ],
    POST: [
      { pattern: /^\/vampiros$/, handler: 'store' },
      { pattern: /^\/auth\/cadastro$/, handler: 'cadastro' },
      { pattern: /^\/auth\/login$/, handler: 'login' },
    ],
    PUT: [{ pattern: /^\/vampiros\/(\d+)$/, handler: 'update' }],
    PATCH: [
      { pattern: /^\/vampiros\/(\d+)\/status$/, handler: 'updateStatus' },
      { pattern: /^\/vampiros\/(\d+)$/, handler: 'patch' },
    ],
    DELETE: [{ pattern: /^\/vampiros\/(\d+)$/, handler: 'destroy' }],
  };

  const methodRoutes = routes[method];
  if (!methodRoutes) return null;

  for (const route of methodRoutes) {
    const match = path.match(route.pattern);
    if (match) {
      return { handler: route.handler, params: match.slice(1) };
    }
  }
  return null;
}

function validateVampiroData(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate || 'nome' in data) {
    if (!data.nome) errors.nome = ['O campo nome é obrigatório'];
    else if (data.nome.length < 2) errors.nome = ['O nome deve ter pelo menos 2 caracteres'];
    else if (data.nome.length > 100) errors.nome = ['O nome deve ter no máximo 100 caracteres'];
  }

  if (!isUpdate || 'cla' in data) {
    if (!data.cla) errors.cla = ['O campo clã é obrigatório'];
    else if (!CLAS_PERMITIDOS.includes(data.cla))
      errors.cla = [`Clã inválido. Valores permitidos: ${CLAS_PERMITIDOS.join(', ')}`];
  }

  if (data.idade_humana !== undefined && data.idade_humana !== null) {
    if (data.idade_humana < 0 || data.idade_humana > 200) errors.idade_humana = ['A idade humana deve estar entre 0 e 200'];
  }

  if (data.idade_vampirica !== undefined && data.idade_vampirica !== null) {
    if (data.idade_vampirica < 0 || data.idade_vampirica > 10000) errors.idade_vampirica = ['A idade vampírica deve estar entre 0 e 10000'];
  }

  if (data.sangue_favorito && !SANGUES_PERMITIDOS.includes(data.sangue_favorito)) {
    errors.sangue_favorito = [`Sangue favorito inválido. Valores permitidos: ${SANGUES_PERMITIDOS.join(', ')}`];
  }

  if (data.status && !STATUS_PERMITIDOS.includes(data.status)) {
    errors.status = [`Status inválido. Valores permitidos: ${STATUS_PERMITIDOS.join(', ')}`];
  }

  if (data.fraqueza && data.fraqueza.length > 200) {
    errors.fraqueza = ['A fraqueza deve ter no máximo 200 caracteres'];
  }

  if (data.habilidade_especial && data.habilidade_especial.length > 200) {
    errors.habilidade_especial = ['A habilidade especial deve ter no máximo 200 caracteres'];
  }

  if (data.foto_perfil) {
    try {
      new URL(data.foto_perfil);
      if (data.foto_perfil.length > 500) errors.foto_perfil = ['A URL da foto deve ter no máximo 500 caracteres'];
    } catch {
      errors.foto_perfil = ['URL da foto de perfil inválida'];
    }
  }

  return errors;
}

const handlers = {
  root() {
    return {
      nome: 'VampireBase API',
      versao: '1.0.0',
      descricao: 'API RESTful para cadastro e gerenciamento de Vampiros',
      endpoints: {
        autenticacao: {
          'POST /api/v1/auth/cadastro': 'Registrar novo caçador/vampiro (retorna token)',
          'POST /api/v1/auth/login': 'Login (retorna o Token Amuleto)',
          'GET /api/v1/auth/me': 'Ver no espelho — dados do usuário (requer token)',
        },
        vampiros_publicos: {
          'GET /api/v1/vampiros': 'Listar todas as criaturas da noite (paginação e filtros)',
          'GET /api/v1/vampiros/{id}': 'Buscar vampiro específico',
          'GET /api/v1/vampiros/cla/{cla}': 'Filtrar pela família/clã',
          'GET /api/v1/vampiros/fraqueza/{fraqueza}': 'Buscar alvos fáceis (ex: alho, sol)',
          'GET /api/v1/vampiros/buscar?q={termo}': 'Busca em pergaminhos',
          'GET /api/v1/vampiros/estatisticas': 'Estatísticas do submundo',
          'GET /api/v1/cacadores': 'Listar caçadores/arquivistas cadastrados',
        },
        vampiros_autenticados: {
          'POST /api/v1/vampiros': 'O Abraço — criar novo vampiro (requer token)',
          'PUT /api/v1/vampiros/{id}': 'Metamorfose — atualizar dados completos (requer token)',
          'PATCH /api/v1/vampiros/{id}': 'Atualização parcial (requer token)',
          'PATCH /api/v1/vampiros/{id}/status': 'Alterar status (requer token)',
          'DELETE /api/v1/vampiros/{id}': 'Estaca no coração — deletar vampiro (requer token)',
        },
      },
    };
  },

  index(req) {
    const query = parseQuery(req.url.split('?')[1]);
    const pagina = Number(query.pagina) || 1;
    const tamanhoPagina = Number(query.tamanho_pagina) || 10;
    const ordenarPor = query.ordenar_por || 'id';
    const direcaoOrdenacao = (query.direcao_ordenacao || 'asc').toLowerCase();
    const busca = query.busca || null;
    const cla = query.cla || null;
    const status = query.status || null;

    let vampiros = sangue.getVampiros();

    if (busca) {
      const termo = busca.toLowerCase();
      vampiros = vampiros.filter(
        (v) =>
          v.nome.toLowerCase().includes(termo) ||
          (v.fraqueza && v.fraqueza.toLowerCase().includes(termo)) ||
          (v.habilidade_especial && v.habilidade_especial.toLowerCase().includes(termo))
      );
    }

    if (cla && CLAS_PERMITIDOS.includes(cla)) {
      vampiros = vampiros.filter((v) => v.cla === cla);
    }

    if (status) {
      vampiros = vampiros.filter((v) => v.status === status);
    }

    const camposPermitidos = ['id', 'nome', 'cla', 'idade_humana', 'idade_vampirica', 'status', 'created_at'];
    const campoOrdenacao = camposPermitidos.includes(ordenarPor) ? ordenarPor : 'id';
    vampiros.sort((a, b) => {
      const valA = a[campoOrdenacao];
      const valB = b[campoOrdenacao];
      if (typeof valA === 'string') return direcaoOrdenacao === 'desc' ? valB.localeCompare(valA) : valA.localeCompare(valB);
      return direcaoOrdenacao === 'desc' ? valB - valA : valA - valB;
    });

    const totalRegistros = vampiros.length;
    const totalPaginas = Math.ceil(totalRegistros / tamanhoPagina);
    const inicio = (pagina - 1) * tamanhoPagina;
    const dadosPagina = vampiros.slice(inicio, inicio + tamanhoPagina);

    return {
      pagina_atual: pagina,
      tamanho_pagina: tamanhoPagina,
      total_registros: totalRegistros,
      total_paginas: totalPaginas,
      dados: dadosPagina,
    };
  },

  show(_req, params) {
    const vampiro = sangue.getVampiroById(Number(params[0]));
    if (!vampiro) return { error: 'Vampiro não encontrado (provavelmente virou pó)', status: 404 };
    return vampiro;
  },

  store(req, _params, body) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const errors = validateVampiroData(body);
    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    const vampiro = sangue.createVampiro(body);
    return { status: 201, mensagem: 'O Abraço foi concluído — uma nova criatura da noite surgiu', vampiro };
  },

  update(req, params, body) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const vampiro = sangue.getVampiroById(Number(params[0]));
    if (!vampiro) return { error: 'Vampiro não encontrado (provavelmente virou pó)', status: 404 };

    const errors = validateVampiroData(body, true);
    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    const atualizado = sangue.updateVampiro(vampiro.id, body);
    return { mensagem: 'Metamorfose concluída — vampiro atualizado com sucesso', vampiro: atualizado };
  },

  patch(req, params, body) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const vampiro = sangue.getVampiroById(Number(params[0]));
    if (!vampiro) return { error: 'Vampiro não encontrado (provavelmente virou pó)', status: 404 };

    const errors = validateVampiroData(body, true);
    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    const atualizado = sangue.updateVampiro(vampiro.id, body);
    return { mensagem: 'Registro atualizado com sucesso', vampiro: atualizado };
  },

  updateStatus(req, params, body) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const vampiro = sangue.getVampiroById(Number(params[0]));
    if (!vampiro) return { error: 'Vampiro não encontrado (provavelmente virou pó)', status: 404 };

    if (!body.status) {
      return { error: 'Propriedades inválidas', status: 422, errors: { status: ['O campo status é obrigatório'] } };
    }

    if (!STATUS_PERMITIDOS.includes(body.status)) {
      return {
        error: 'Propriedades inválidas',
        status: 422,
        errors: { status: [`Status inválido. Valores permitidos: ${STATUS_PERMITIDOS.join(', ')}`] },
      };
    }

    const atualizado = sangue.updateVampiro(vampiro.id, { status: body.status });
    return { mensagem: `Status alterado para "${body.status}"`, vampiro: atualizado };
  },

  destroy(req, params) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const vampiro = sangue.getVampiroById(Number(params[0]));
    if (!vampiro) return { error: 'Vampiro não encontrado (provavelmente virou pó)', status: 404 };

    sangue.deleteVampiro(vampiro.id);
    return { mensagem: 'Estaca no coração! O vampiro virou pó.' };
  },

  byCla(_req, params) {
    const cla = params[0];
    if (!CLAS_PERMITIDOS.includes(cla)) {
      return {
        error: 'Clã inválido',
        status: 422,
        errors: { cla: [`Clã inválido. Valores permitidos: ${CLAS_PERMITIDOS.join(', ')}`] },
      };
    }
    const vampiros = sangue.getVampiros().filter((v) => v.cla === cla);
    return { cla, total: vampiros.length, dados: vampiros };
  },

  byFraqueza(_req, params) {
    const fraqueza = decodeURIComponent(params[0]).toLowerCase();
    const vampiros = sangue
      .getVampiros()
      .filter((v) => v.fraqueza && v.fraqueza.toLowerCase().includes(fraqueza));
    return { fraqueza: params[0], total: vampiros.length, dados: vampiros };
  },

  search(req) {
    const query = parseQuery(req.url.split('?')[1]);
    const termo = query.q || query.termo;
    if (!termo || termo.length < 2) {
      return { error: 'Termo de busca deve ter pelo menos 2 caracteres', status: 400 };
    }
    const termoLower = termo.toLowerCase();
    const vampiros = sangue.getVampiros().filter(
      (v) =>
        v.nome.toLowerCase().includes(termoLower) ||
        (v.fraqueza && v.fraqueza.toLowerCase().includes(termoLower)) ||
        (v.habilidade_especial && v.habilidade_especial.toLowerCase().includes(termoLower)) ||
        (v.sangue_favorito && v.sangue_favorito.toLowerCase().includes(termoLower))
    );
    return { termo, total: vampiros.length, dados: vampiros };
  },

  stats() {
    const vampiros = sangue.getVampiros();
    const porCla = {};
    const porStatus = {};
    const porSangue = {};

    for (const v of vampiros) {
      porCla[v.cla] = (porCla[v.cla] || 0) + 1;
      porStatus[v.status] = (porStatus[v.status] || 0) + 1;
      if (v.sangue_favorito) porSangue[v.sangue_favorito] = (porSangue[v.sangue_favorito] || 0) + 1;
    }

    return {
      por_cla: Object.entries(porCla).map(([cla, total]) => ({ cla, total })).sort((a, b) => b.total - a.total),
      por_status: Object.entries(porStatus).map(([status, total]) => ({ status, total })).sort((a, b) => b.total - a.total),
      por_sangue_favorito: Object.entries(porSangue).map(([sangue_favorito, total]) => ({ sangue_favorito, total })).sort((a, b) => b.total - a.total),
      total: vampiros.length,
    };
  },

  listCacadores() {
    const cacadores = sangue.getCacadores().map((c) => {
      const { senha, ...rest } = c;
      return rest;
    });
    return { total: cacadores.length, dados: cacadores };
  },

  cadastro(req, _params, body) {
    const errors = {};
    if (!body.nome) errors.nome = ['O campo nome é obrigatório'];
    else if (body.nome.length < 3) errors.nome = ['O nome deve ter no mínimo 3 caracteres'];

    if (!body.email) errors.email = ['O campo e-mail é obrigatório'];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.email = ['E-mail inválido'];

    if (!body.senha) errors.senha = ['O campo senha é obrigatório'];
    else if (body.senha.length < 6) errors.senha = ['A senha deve ter um mínimo de 6 caracteres'];

    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    if (sangue.getCacadorByEmail(body.email)) {
      return { error: 'Propriedades inválidas', status: 422, errors: { email: ['Este e-mail já está em uso'] } };
    }

    const cacador = sangue.createCacador(body);
    const token = amuleto.generateToken(cacador.id);
    return { status: 201, token_gerado: token, mensagem: 'Pacto selado — cadastro realizado com sucesso', usuario: cacador };
  },

  login(req, _params, body) {
    const errors = {};
    if (!body.email) errors.email = ['O campo e-mail é obrigatório'];
    if (!body.senha) errors.senha = ['O campo senha é obrigatório'];
    if (Object.keys(errors).length > 0) return { error: 'Propriedades inválidas', status: 422, errors };

    const cacador = sangue.getCacadorByEmail(body.email);
    if (!cacador) return { error: 'E-mail ou senha inválidos', status: 422, errors: { email: ['E-mail ou senha inválidos'] } };

    const senhaHash = crypto.createHash('sha256').update(body.senha).digest('hex');
    if (senhaHash !== cacador.senha) {
      return { error: 'E-mail ou senha inválidos', status: 422, errors: { senha: ['E-mail ou senha inválidos'] } };
    }

    const token = amuleto.generateToken(cacador.id);
    return {
      token_gerado: token,
      usuario: { id: cacador.id, nome: cacador.nome, email: cacador.email },
    };
  },

  authMe(req) {
    const auth = checkAuth(req);
    if (auth.error) return { error: auth.error, status: auth.status };

    const cacador = sangue.getCacadorById(auth.userId);
    if (!cacador) return { error: 'Usuário não encontrado', status: 404 };
    return { usuario: cacador };
  },
};

async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let path = parsedUrl.pathname.replace(/^\/api\/v1/, '') || '/';
  path = path.replace(/\/$/, '');

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const route = matchRoute(req.method, path);
  if (!route) {
    return sendJson(res, 404, { mensagem: 'Rota não encontrada nas trevas' });
  }

  try {
    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await getRequestBody(req);
    }

    const result = handlers[route.handler](req, route.params, body);

    if (result.status) {
      return sendJson(res, result.status, result);
    }

    return sendJson(res, 200, result);
  } catch (err) {
    console.error('Erro:', err);
    return sendJson(res, 500, { mensagem: 'Erro interno do servidor — um caçador invadiu nossas trevas!' });
  }
}

const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`VampireBase API rodando em http://localhost:${PORT}`);
  console.log(`Documentação: http://localhost:${PORT}/api/v1`);
});