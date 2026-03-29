import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin, Clock, Loader2, CheckCircle, AlertTriangle, Send, Shield, Camera, User, X } from 'lucide-react';
import styles from './Rondas.module.css';

interface PontoInfo {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem: string | null;
  condominioNome: string;
}

interface Funcionario {
  id: string;
  nome: string;
}

type Status = 'carregando' | 'formulario' | 'enviando' | 'sucesso' | 'erro_ponto' | 'erro_envio';

const API = import.meta.env.VITE_API_URL || '/api';

const ScanRondaPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<Status>('carregando');
  const [ponto, setPonto] = useState<PontoInfo | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);

  const [funcionarioId, setFuncionarioId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [selfie, setSelfie] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [endereco, setEndereco] = useState('');
  const [geoStatus, setGeoStatus] = useState<'obtendo' | 'ok' | 'erro'>('obtendo');
  const [cameraAberta, setCameraAberta] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ─── Carregar ponto + funcionários ───
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const r = await fetch(`${API}/public/ronda/${encodeURIComponent(id)}`);
        if (!r.ok) throw new Error('not-found');
        const data = await r.json();
        setPonto(data);
        setStatus('formulario');

        // Carregar funcionários do condomínio
        const rf = await fetch(`${API}/public/ronda/${encodeURIComponent(id)}/funcionarios`);
        if (rf.ok) {
          const funcs = await rf.json();
          setFuncionarios(funcs);
        }
      } catch {
        setStatus('erro_ponto');
      }
    };
    load();
  }, [id]);

  // ─── Geolocalização ───
  useEffect(() => {
    if (status !== 'formulario') return;
    if (!navigator.geolocation) { setGeoStatus('erro'); return; }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setGeoStatus('ok');
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt-BR`,
            { headers: { 'User-Agent': 'GestaoLimpeza/1.0' } }
          );
          const geo = await resp.json();
          if (geo.display_name) setEndereco(geo.display_name);
        } catch { /* ignorar */ }
      },
      () => setGeoStatus('erro'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [status]);

  // ─── Câmera ───
  const abrirCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 800 }, height: { ideal: 800 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraAberta(true);
      // Aguarda o video element montar
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      // Fallback: se getUserMedia falhar, usa input file com capture
      alert('Não foi possível abrir a câmera. Verifique as permissões.');
    }
  }, []);

  const tirarFoto = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/webp', 0.7);
    setSelfie(dataUrl);
    fecharCamera();
  }, []);

  const fecharCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraAberta(false);
  }, []);

  const removerSelfie = () => {
    setSelfie(null);
  };

  // ─── Enviar ───
  const enviar = async () => {
    if (!funcionarioId || !id) return;
    setStatus('enviando');
    try {
      const funcSel = funcionarios.find(f => f.id === funcionarioId);
      const resp = await fetch(`${API}/public/ronda/${encodeURIComponent(id)}/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funcionarioId,
          funcionarioNome: funcSel?.nome || '',
          latitude: lat,
          longitude: lng,
          endereco: endereco || null,
          observacao: observacao.trim() || null,
          fotoSelfie: selfie || null,
        }),
      });
      if (!resp.ok) throw new Error('fail');
      setStatus('sucesso');
    } catch {
      setStatus('erro_envio');
    }
  };

  const agora = new Date();
  const dataStr = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // ─── Carregando ───
  if (status === 'carregando') {
    return (
      <div className={styles.scanPage}>
        <div className={styles.scanCard}>
          <div className={styles.scanLoading}>
            <Loader2 size={36} className={styles.spinIcon} />
            <p>Carregando ponto de ronda...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Ponto não encontrado ───
  if (status === 'erro_ponto') {
    return (
      <div className={styles.scanPage}>
        <div className={styles.scanCard}>
          <div className={styles.scanErrorState}>
            <div className={styles.scanErrorIcon}>
              <AlertTriangle size={32} />
            </div>
            <h2>Ponto não encontrado</h2>
            <p>Este QR Code pode estar desativado ou não existe mais.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Sucesso ───
  if (status === 'sucesso') {
    const funcSel = funcionarios.find(f => f.id === funcionarioId);
    return (
      <div className={styles.scanPage}>
        <div className={styles.scanCard}>
          <div className={styles.scanSuccessState}>
            <div className={styles.scanSuccessIcon}>
              <CheckCircle size={36} />
            </div>
            <h2>Ronda Registrada!</h2>
            <div className={styles.scanSuccessDetails}>
              <p><strong>{ponto?.titulo}</strong></p>
              {funcSel && <p><User size={14} /> {funcSel.nome}</p>}
              <p><Clock size={14} /> {dataStr} — {horaStr}</p>
              {endereco && <p><MapPin size={14} /> {endereco}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Formulário ───
  return (
    <div className={styles.scanPage}>
      <div className={styles.scanCard}>
        {/* Header premium */}
        <div className={styles.scanHeaderPremium}>
          <div className={styles.scanShieldIcon}>
            <Shield size={24} />
          </div>
          <div className={styles.scanHeaderText}>
            <h1>{ponto?.titulo || 'Ponto de Ronda'}</h1>
            {ponto?.condominioNome && <span>{ponto.condominioNome}</span>}
          </div>
        </div>

        {ponto?.descricao && <p className={styles.scanDescText}>{ponto.descricao}</p>}

        {ponto?.imagem && (
          <img src={ponto.imagem} alt={ponto.titulo} className={styles.scanPontoImg} />
        )}

        {/* Info: data + localização */}
        <div className={styles.scanInfoBar}>
          <div className={styles.scanInfoItem}>
            <Clock size={15} />
            <span>{dataStr} — {horaStr}</span>
          </div>
          <div className={styles.scanInfoItem}>
            <MapPin size={15} />
            {geoStatus === 'obtendo' && <span className={styles.scanGeoObtendo}>Obtendo localização...</span>}
            {geoStatus === 'ok' && <span>{endereco || `${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}</span>}
            {geoStatus === 'erro' && <span className={styles.scanGeoErro}>Localização indisponível</span>}
          </div>
        </div>

        {/* Selfie — câmera direta */}
        <div className={styles.scanSection}>
          <label className={styles.scanSectionLabel}>
            <Camera size={15} /> Selfie de identificação *
          </label>
          {cameraAberta ? (
            <div className={styles.scanCameraWrap}>
              <video ref={videoRef} className={styles.scanCameraVideo} autoPlay playsInline muted />
              <div className={styles.scanCameraActions}>
                <button className={styles.scanCameraCaptureBtn} onClick={tirarFoto} type="button">
                  <Camera size={22} />
                </button>
                <button className={styles.scanCameraCancelBtn} onClick={fecharCamera} type="button">
                  <X size={18} /> Cancelar
                </button>
              </div>
            </div>
          ) : selfie ? (
            <div className={styles.scanSelfiePreview}>
              <img src={selfie} alt="Selfie" />
              <button className={styles.scanSelfieRemove} onClick={removerSelfie} type="button">
                <X size={16} />
              </button>
            </div>
          ) : (
            <button className={styles.scanSelfieBtn} onClick={abrirCamera} type="button">
              <Camera size={24} />
              <span>Tirar selfie</span>
              <small>Toque para abrir a câmera</small>
            </button>
          )}
        </div>

        {/* Dropdown funcionário */}
        <div className={styles.scanSection}>
          <label className={styles.scanSectionLabel} htmlFor="scan-func">
            <User size={15} /> Porteiro / Funcionário *
          </label>
          <select
            id="scan-func"
            className={styles.scanSelect}
            value={funcionarioId}
            onChange={e => setFuncionarioId(e.target.value)}
          >
            <option value="">Selecione seu nome</option>
            {funcionarios.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
          {funcionarios.length === 0 && (
            <small className={styles.scanHint}>Nenhum funcionário cadastrado neste condomínio.</small>
          )}
        </div>

        {/* Observação */}
        <div className={styles.scanSection}>
          <label className={styles.scanSectionLabel} htmlFor="scan-obs">Observação (opcional)</label>
          <textarea
            id="scan-obs"
            className={styles.scanTextareaField}
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="Alguma ocorrência?"
            rows={3}
          />
        </div>

        {status === 'erro_envio' && (
          <p className={styles.scanErroMsg}>Erro ao registrar. Tente novamente.</p>
        )}

        <button
          className={styles.scanSubmitBtnPremium}
          onClick={enviar}
          disabled={!funcionarioId || !selfie || status === 'enviando'}
        >
          {status === 'enviando'
            ? <><Loader2 size={18} className={styles.spinIcon} /> Enviando...</>
            : <><Send size={18} /> Registrar Ronda</>}
        </button>
      </div>
    </div>
  );
};

export default ScanRondaPage;
