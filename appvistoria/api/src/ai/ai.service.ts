import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private anthropic: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    this.anthropic = new Anthropic({ apiKey: config.get('ANTHROPIC_API_KEY') });
  }

  async transcreverAudio(audioPath: string): Promise<string> {
    const audioFile = fs.createReadStream(audioPath);

    const transcription = await this.openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text',
    });

    return transcription as unknown as string;
  }

  async corrigirTextoVistoria(
    textoBruto: string,
    contexto: { pergunta: string; condominio: string; categoria: string },
  ): Promise<string> {
    const mensagem = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Você é um assistente especializado em vistorias condominiais.

Um supervisor de condomínio gravou uma observação por áudio. O texto abaixo foi transcrito automaticamente e pode conter erros de pronúncia, gírias ou linguagem informal.

Contexto da vistoria:
- Condomínio: ${contexto.condominio}
- Categoria: ${contexto.categoria}
- Pergunta: ${contexto.pergunta}

Texto transcrito:
"${textoBruto}"

Reescreva esse texto de forma clara, profissional e adequada para um relatório de vistoria condominial. Mantenha o sentido original. Corrija erros gramaticais e de português. Não invente informações que não estão no texto original. Responda APENAS com o texto corrigido, sem explicações.`,
        },
      ],
    });

    const content = mensagem.content[0];
    if (content.type === 'text') return content.text;
    return textoBruto;
  }

  async estimarTempo(perguntas: number, categoria: string): Promise<number> {
    // Estimativa simples em minutos baseada no tipo de vistoria
    const tempoBase: Record<string, number> = {
      'Portaria e Acesso': 5,
      'Áreas Comuns': 10,
      'Segurança e Vigilância': 8,
      'Limpeza e Conservação': 8,
      'Instalações Elétricas': 12,
      'Hidráulica e Encanamento': 10,
      'Elevadores': 8,
      'Incêndio e Emergência': 10,
      'Documentação e Contratos': 5,
      'Funcionários': 5,
      'Manutenção Preventiva': 10,
    };

    const base = tempoBase[categoria] || 8;
    return Math.round((base * perguntas) / 5);
  }
}
