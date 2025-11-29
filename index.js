// --- CONFIGURAÇÃO E CONEXÃO ---
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Conecta ao Supabase usando as chaves do .env
const app = express();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middlewares
app.use(cors()); 
app.use(express.json()); 

// --- FUNÇÃO DE SEGURANÇA ---
async function getUserByToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1]; 
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) return null; 
  return user; 
}

// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body;
  const { data, error } = await supabase.auth.signUp({
    email: email, password: senha, options: { data: { nome: nome } }
  });
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ message: 'Usuário cadastrado com sucesso!', data: data });
});

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email, password: senha,
  });
  if (error) return res.status(401).json({ error: 'Credenciais inválidas.' });
  res.status(200).json({ data: data });
});


// CRIAÇÃO DE CHAMADOS
app.post('/chamados', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
  const { titulo, descricao } = req.body;
  const { data, error } = await supabase
    .from('chamados')
    .insert({ titulo: titulo, descricao: descricao, usuario_id: user.id })
    .select();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data[0]);
});

// Listar meus chamados
app.get('/chamados', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
  const { data, error } = await supabase
    .from('chamados')
    .select('*')
    .eq('usuario_id', user.id) 
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
});

// DELETE
app.delete('/chamados/:id', async (req, res) => {
  const user = await getUserByToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });
  const { id } = req.params;
  const { error } = await supabase
    .from('chamados')
    .delete()
    .eq('id', id)
    .eq('usuario_id', user.id);
  if (error) return res.status(404).json({ message: 'Chamado não encontrado ou erro ao deletar.' });
  res.status(200).json({ message: 'Chamado excluído com sucesso.' });
});

// Rota de teste simples
app.get('/', (req, res) => {
  res.send('API Marido de Aluguel está online!');
});

// Rota Especial para o Profissional
app.get('/todos-os-chamados', async (req, res) => {
 
  
  const user = await getUserByToken(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado.' });

  // Verifica se é o email do chefe
  if (user.email !== 'admin@marido.com') {
      return res.status(403).json({ error: 'Acesso restrito ao profissional.' });
  }

  const { data, error } = await supabase
    .from('chamados')
    .select('*') 
    .order('created_at', { ascending: false });
    
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});