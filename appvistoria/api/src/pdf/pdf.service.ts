import { Injectable, Inject } from '@nestjs/common';
import { SQL } from '../database/database.module';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

@Injectable()
export class PdfService {
  constructor(@Inject(SQL) private readonly sql: any) {}

  async gerarPdfVisita(visitaId: string): Promise<Buffer> {
    // Busca todos os dados da visita
    const [visita] = await this.sql`
      SELECT v.*,
             c.nome as condominio_nome, c.endereco, c.cidade, c.estado,
             c.sindico_nome, c.sindico_email, c.total_unidades,
             u.nome as supervisor_nome, u.email as supervisor_email, u.telefone as supervisor_telefone,
             e.nome as empresa_nome, e.logo_url as empresa_logo
      FROM visitas v
      JOIN condominios c ON c.id = v.condominio_id
      JOIN usuarios u ON u.id = v.supervisor_id
      JOIN empresas e ON e.id = v.empresa_id
      WHERE v.id = ${visitaId}
    `;

    const respostas = await this.sql`
      SELECT r.*, p.texto as pergunta_texto, c.nome as categoria_nome, c.icone as categoria_icone
      FROM respostas r
      JOIN perguntas p ON p.id = r.pergunta_id
      JOIN categorias c ON c.id = p.categoria_id
      WHERE r.visita_id = ${visitaId}
      ORDER BY c.ordem, p.ordem
    `;

    const pendencias = await this.sql`
      SELECT * FROM pendencias WHERE visita_id = ${visitaId} ORDER BY prioridade DESC
    `;

    const fotos = await this.sql`
      SELECT * FROM fotos WHERE visita_id = ${visitaId} ORDER BY criado_em
    `;

    // Agrupa respostas por categoria
    const porCategoria = respostas.reduce((acc: any, r: any) => {
      if (!acc[r.categoria_nome]) acc[r.categoria_nome] = [];
      acc[r.categoria_nome].push(r);
      return acc;
    }, {});

    const totalOk = respostas.filter((r: any) => r.resultado === 'ok').length;
    const totalNaoOk = respostas.filter((r: any) => r.resultado === 'nao_ok').length;
    const totalNA = respostas.filter((r: any) => r.resultado === 'na').length;
    const percentual = respostas.length > 0 ? Math.round((totalOk / (respostas.length - totalNA)) * 100) : 0;

    const templatePath = path.join(__dirname, 'templates', 'relatorio.hbs');
    const templateSrc = fs.readFileSync(templatePath, 'utf-8');
    const template = Handlebars.compile(templateSrc);

    const html = template({
      visita,
      categorias: Object.entries(porCategoria).map(([nome, itens]) => ({ nome, itens })),
      pendencias,
      fotos,
      totalOk,
      totalNaoOk,
      totalNA,
      percentual,
      data_geracao: dayjs().format('DD/MM/YYYY HH:mm'),
      data_visita: visita.iniciada_em ? dayjs(visita.iniciada_em).format('DD/MM/YYYY') : '',
    });

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
