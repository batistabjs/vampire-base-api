const fs = require('fs');
const path = require('path');

const CAIXAO_DIR = path.join(__dirname, 'caixao');

function ensureCaixaoDir() {
  if (!fs.existsSync(CAIXAO_DIR)) {
    fs.mkdirSync(CAIXAO_DIR, { recursive: true });
  }
}

function readJson(filename) {
  ensureCaixaoDir();
  const filePath = path.join(CAIXAO_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function writeJson(filename, data) {
  ensureCaixaoDir();
  const filePath = path.join(CAIXAO_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function getProximoId(items) {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

// Vampiros
function getVampiros() {
  return readJson('vampiros.json');
}

function saveVampiros(vampiros) {
  writeJson('vampiros.json', vampiros);
}

function getVampiroById(id) {
  return getVampiros().find((v) => v.id === id) || null;
}

function createVampiro(data) {
  const vampiros = getVampiros();
  const now = new Date().toISOString();
  const vampiro = {
    id: getProximoId(vampiros),
    nome: data.nome,
    idade_humana: data.idade_humana ?? null,
    idade_vampirica: data.idade_vampirica ?? null,
    cla: data.cla,
    sangue_favorito: data.sangue_favorito || null,
    fraqueza: data.fraqueza || null,
    habilidade_especial: data.habilidade_especial || null,
    status: data.status || 'Acordado',
    foto_perfil: data.foto_perfil || null,
    created_at: now,
    updated_at: now,
  };
  vampiros.push(vampiro);
  saveVampiros(vampiros);
  return vampiro;
}

function updateVampiro(id, data) {
  const vampiros = getVampiros();
  const index = vampiros.findIndex((v) => v.id === id);
  if (index === -1) return null;

  const camposPermitidos = [
    'nome', 'idade_humana', 'idade_vampirica', 'cla', 'sangue_favorito',
    'fraqueza', 'habilidade_especial', 'status', 'foto_perfil',
  ];

  for (const campo of camposPermitidos) {
    if (campo in data) {
      vampiros[index][campo] = data[campo];
    }
  }
  vampiros[index].updated_at = new Date().toISOString();
  saveVampiros(vampiros);
  return vampiros[index];
}

function deleteVampiro(id) {
  const vampiros = getVampiros();
  const index = vampiros.findIndex((v) => v.id === id);
  if (index === -1) return false;
  vampiros.splice(index, 1);
  saveVampiros(vampiros);
  return true;
}

// Caçadores (usuários)
function getCacadores() {
  return readJson('cacadores.json');
}

function saveCacadores(cacadores) {
  writeJson('cacadores.json', cacadores);
}

function getCacadorById(id) {
  const cacador = getCacadores().find((c) => c.id === id);
  if (!cacador) return null;
  const { senha, ...rest } = cacador;
  return rest;
}

function getCacadorByEmail(email) {
  return getCacadores().find((c) => c.email === email) || null;
}

function createCacador(data) {
  const crypto = require('crypto');
  const cacadores = getCacadores();
  const now = new Date().toISOString();
  const cacador = {
    id: getProximoId(cacadores),
    nome: data.nome,
    email: data.email,
    senha: crypto.createHash('sha256').update(data.senha).digest('hex'),
    created_at: now,
    updated_at: now,
  };
  cacadores.push(cacador);
  saveCacadores(cacadores);
  const { senha, ...rest } = cacador;
  return rest;
}

module.exports = {
  getVampiros,
  getVampiroById,
  createVampiro,
  updateVampiro,
  deleteVampiro,
  getCacadores,
  getCacadorById,
  getCacadorByEmail,
  createCacador,
};