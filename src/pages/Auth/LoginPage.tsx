import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Eye, EyeOff, Mail, Lock, MessageCircle, UserPlus } from 'lucide-react';
import logoImg from '../../assets/logo.png';
import styles from './Auth.module.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const { login } = useAuth();
  const { tema } = useTheme();
  const navigate = useNavigate();

  const logoExibida = tema.logoUrl;
  const tituloExibido = tema.loginTitulo || 'Bem-vindo de volta';
  const subtituloExibido = tema.loginSubtitulo || 'Faça login para acessar o sistema';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      setErro('Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      setErro('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setCarregando(true);
    setErro('');
    try {
      await login(email, senha);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION')) {
        setErro('Servidor indisponível. Verifique sua conexão e tente novamente.');
      } else if (msg.includes('bloqueada') || msg.includes('bloqueado')) {
        setErro(msg);
      } else if (msg.includes('tentativa') || msg.includes('Muitas') || msg.includes('requests')) {
        setErro(msg);
      } else if (msg.includes('inválid') || msg.includes('invalid') || msg.includes('incorret')) {
        setErro(msg);
      } else if (msg.includes('indisponível') || msg.includes('503') || msg.includes('backend')) {
        setErro('Servidor indisponível. Tente novamente em instantes.');
      } else if (msg.includes('Erro 5') || msg.includes('interno')) {
        setErro('Erro no servidor. Tente novamente em instantes.');
      } else {
        setErro(msg || 'Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const abrirSuporte = () => {
    window.open('https://wa.me/5511933284364?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20Gest%C3%A3o%20e%20Limpeza', '_blank');
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          <div className={styles.illustration}>
            <div className={styles.circles}>
              <div className={styles.circle1} />
              <div className={styles.circle2} />
              <div className={styles.circle3} />
            </div>
            <img src={logoImg} alt="Gestão e Limpeza" className={styles.illustrationLogo} />
          </div>
          <h2>Gestão e Limpeza</h2>
          <p>Sistema completo de gestão de limpeza e manutenção para condomínios. Controle ordens de serviço, equipes, materiais e muito mais.</p>
          <div className={styles.features}>
            <div className={styles.feature}>✓ Ordens de Serviço</div>
            <div className={styles.feature}>✓ Checklists de Limpeza</div>
            <div className={styles.feature}>✓ Geolocalização em Tempo Real</div>
            <div className={styles.feature}>✓ Relatórios com Gráficos</div>
          </div>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <img src={logoExibida || logoImg} alt="Logo" className={logoExibida ? styles.formLogo : styles.formLogoDefault} />
            <h1>{tituloExibido}</h1>
            <p>{subtituloExibido}</p>
          </div>

          {erro && (
            <div className={styles.erro}>{erro}</div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>E-mail</label>
              <div className={styles.inputWrapper}>
                <Mail size={18} className={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Senha</label>
              <div className={styles.inputWrapper}>
                <Lock size={18} className={styles.inputIcon} />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>

            <div className={styles.forgotRow}>
              <Link to="/esqueci-senha" className={styles.forgotLink}>Esqueceu sua senha?</Link>
            </div>
          </form>

          <div className={styles.registerRow}>
            <span>Não tem uma conta?</span>{' '}
            <Link to="/cadastro" className={styles.registerLink}>Criar conta</Link>
          </div>

          <button className={styles.supportBtn} onClick={abrirSuporte}>
            <MessageCircle size={18} />
            <span>Suporte</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
