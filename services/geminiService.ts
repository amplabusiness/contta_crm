import { GoogleGenAI, Modality, Type } from "@google/genai";
import { 
  SalesData, DealStageData, ChurnPrediction, UpsellOpportunity, 
  MarketInsightResult, Empresa, ProspectAnalysis, Vinculo, 
  ParentePotencial, VinculoAnalysis, Deal, DealHealth, DataAccessLog, 
  RedeDeVinculos, ProgramaIndicacoesStatus, Indicacao, Socio, ReportIndicacao
// FIX: Added Socio to the import list.
} from '../types.ts';

// Initialize the Gemini client
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!apiKey) {
  throw new Error('GEMINI_API_KEY não configurado em .env.local');
}
const ai = new GoogleGenAI({ apiKey });
const model = "gemini-2.5-flash";

const safelyParseJson = <T>(jsonString: string): T | null => {
    try {
        // Remove markdown backticks if present
        const cleanJsonString = jsonString.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(cleanJsonString);
    } catch (error) {
        console.error("Failed to parse JSON:", error, "Raw string:", jsonString);
        return null;
    }
};

export const getSalesInsights = async (crmData: { salesChartData: SalesData[], dealStageData: DealStageData[] }): Promise<string> => {
    const prompt = `
        Analise os seguintes dados de vendas de um CRM e gere um resumo conciso em HTML (use tags <strong> e <ul>) com os principais insights, destacando pontos positivos, negativos e uma recomendação.
        Dados de Vendas Mensais: ${JSON.stringify(crmData.salesChartData)}
        Dados do Funil de Vendas: ${JSON.stringify(crmData.dealStageData)}
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const getMarketInsightsWithSearch = async (query: string): Promise<MarketInsightResult> => {
    const response = await ai.models.generateContent({
        model,
        contents: query,
        config: { tools: [{ googleSearch: {} }] },
    });

    const sources: { uri: string; title?: string }[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
        if (chunk.web) {
            sources.push({ uri: chunk.web.uri, title: chunk.web.title });
        }
    });

    return { text: response.text, sources };
};

export const generateProspectAnalysis = async (empresa: Empresa): Promise<ProspectAnalysis> => {
    const prompt = `
        Baseado nos dados desta empresa, gere uma análise de prospecção.
        Dados: ${JSON.stringify(empresa)}
        Responda APENAS com um objeto JSON no formato:
        { "potentialScore": number (0-100), "justification": "string", "suggestedPitch": "string" }
    `;
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const result = safelyParseJson<ProspectAnalysis>(response.text);
    if (!result) throw new Error("Could not parse prospect analysis response.");
    return result;
};

export const getLocalAnalysisWithMaps = async (query: string, location: { latitude: number; longitude: number }): Promise<MarketInsightResult> => {
    const response = await ai.models.generateContent({
        model,
        contents: query,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: { retrievalConfig: { latLng: location } }
        },
    });

    const sources: { uri: string; title?: string }[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((chunk: any) => {
        if (chunk.maps) {
            sources.push({ uri: chunk.maps.uri, title: chunk.maps.title });
        }
    });

    return { text: response.text, sources };
};

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = (reader.result as string).split(',')[1];
            resolve(result);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const editImageWithGemini = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Data, mimeType } },
                { text: prompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('image/'));
    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }
    throw new Error('No edited image was returned from the API.');
};

export const getDealHealth = async (deal: Deal): Promise<DealHealth> => {
    const prompt = `
        Analise a saúde deste negócio e retorne um objeto JSON.
        Dados do Negócio: ${JSON.stringify(deal)}
        Responda APENAS com um objeto JSON no formato:
        { "score": number (0-100), "reasoning": "string", "suggestedAction": "string" }
    `;
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const result = safelyParseJson<DealHealth>(response.text);
    if (!result) throw new Error("Could not parse deal health response.");
    return result;
};

export const generateCommunication = async (deal: Deal, commType: string, commTone: string, instructions: string): Promise<string> => {
    const prompt = `
        Você é um assistente de vendas. Crie uma comunicação para o seguinte negócio:
        - Empresa: ${deal.companyName}
        - Contato: ${deal.contactName}
        - Valor: ${deal.value}
        - Tipo: ${commType}
        - Tom: ${commTone}
        - Instruções adicionais: ${instructions || 'Nenhuma'}
        
        Gere apenas o texto da comunicação, sem saudações ou assinaturas genéricas.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const analyzeAuditLogs = async (logs: DataAccessLog[]): Promise<string> => {
    const prompt = `
        Analise os seguintes logs de auditoria de acesso a dados. Identifique qualquer padrão incomum, acesso fora do horário comercial, ou atividade suspeita. Forneça um resumo em HTML (use tags <h2>, <p>, <ul>, <li>, <strong>).
        Logs: ${JSON.stringify(logs)}
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
}

export const generateNetworkReport = async (data: RedeDeVinculos[]): Promise<string> => {
    const prompt = `Gere um relatório em HTML sobre a rede de relacionamentos com base nestes dados: ${JSON.stringify(data)}. Foque em oportunidades de negócio.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const generateTerritorialReport = async (data: Partial<Empresa>[]): Promise<string> => {
    const prompt = `Gere um relatório em HTML sobre a análise territorial com base nestes dados de empresas: ${JSON.stringify(data)}. Foque em oportunidades de prospecção.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const generatePerformanceReport = async (
  status: ProgramaIndicacoesStatus,
  indicacoes: ReadonlyArray<Indicacao | ReportIndicacao>,
): Promise<string> => {
    const prompt = `Gere um relatório em HTML sobre a performance do programa de indicações. Dados de status: ${JSON.stringify(status)}. Dados de indicações: ${JSON.stringify(indicacoes)}. Analise o ROI e engajamento.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const generatePitchFromVinculos = async (targetEmpresa: Empresa, socio: Socio, connection: Vinculo | ParentePotencial): Promise<VinculoAnalysis> => {
    const prompt = `
      Você é um especialista em vendas B2B. Sua tarefa é criar uma sugestão de pitch (abordagem) para vender os serviços da empresa alvo para um contato, usando uma conexão em comum.

      - Empresa Alvo (Sua empresa): Contta CRM, um CRM para contabilidades.
      - Prospect (Empresa que queremos como cliente): ${targetEmpresa.razao_social}
      - Sócio do Prospect: ${socio.nome_socio}
      - Conexão em comum: ${JSON.stringify(connection)}

      Analise a conexão e crie uma lógica e uma sugestão de pitch.
      Responda APENAS com um objeto JSON no formato:
      { "reasoning": "string", "pitch": "string" }
    `;
    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });
    const result = safelyParseJson<VinculoAnalysis>(response.text);
    if (!result) throw new Error("Could not parse pitch analysis response.");
    return result;
}

export const getIntelligentSearchParams = async (query: string): Promise<any> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            clients: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    cnae: { type: Type.STRING },
                }
            },
            deals: {
                type: Type.OBJECT,
                properties: {
                    companyName: { type: Type.STRING },
                    minValue: { type: Type.NUMBER },
                    stage: { type: Type.STRING, enum: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'] }
                }
            },
            tasks: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    companyName: { type: Type.STRING },
                    priority: { type: Type.STRING, enum: ['Alta', 'Média', 'Baixa'] },
                    status: { type: Type.STRING, enum: ['A Fazer', 'Em Andamento', 'Concluída'] }
                }
            }
        }
    };

    const prompt = `Analise a busca do usuário e extraia os parâmetros de busca para cada categoria (clients, deals, tasks).
    Busca: "${query}"`;

    const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
        }
    });

    const result = safelyParseJson<any>(response.text);
    if (!result) throw new Error("Could not parse search params.");
    return result;
};

// ============================================================================
// ANALYTICS COM IA - Agentes Autônomos
// ============================================================================

/**
 * Analisa risco de churn de um cliente usando Gemini AI
 * 
 * @param dealData - Dados do deal + métricas de engajamento
 * @returns Análise de risco com score, razão e ação sugerida
 */
export async function analyzeChurnRisk(dealData: {
  company_name: string;
  deal_value: number;
  days_since_last_activity: number;
  task_completion_rate: number;
  total_tasks: number;
  deal_stage: string;
  contact_email: string | null;
}): Promise<{
  risk_score: number;
  primary_reason: string;
  suggested_action: string;
}> {
  const prompt = `
## IDENTIDADE
Você é um analista de Customer Success especializado em predição de churn B2B.

## MISSÃO
Analisar dados de engajamento e prever risco de churn (0-100).

## REGRAS DE ANÁLISE
1. Risco ALTO (70-100): Sem atividade há >60 dias OU taxa de conclusão <30%
2. Risco MÉDIO (40-69): Atividade irregular OU taxa conclusão 30-60%
3. Risco BAIXO (0-39): Atividade regular E taxa conclusão >60%

## DADOS DO CLIENTE
${JSON.stringify(dealData, null, 2)}

## OUTPUT (JSON)
{
  "risk_score": number (0-100),
  "primary_reason": "string (máx 100 chars)",
  "suggested_action": "string (ação específica e executável)"
}
  `.trim();

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  const result = safelyParseJson<{
    risk_score: number;
    primary_reason: string;
    suggested_action: string;
  }>(response.text);

  if (!result) {
    throw new Error('Falha ao parsear análise de churn');
  }

  return result;
}

/**
 * Identifica oportunidades de upsell/cross-sell usando Gemini AI
 * 
 * @param dealData - Dados do deal + histórico de uso
 * @returns Análise de oportunidade com tipo, produto, confiança e valor potencial
 */
export async function analyzeUpsellOpportunity(dealData: {
  company_name: string;
  current_value: number;
  deal_stage: string;
  services_used?: string[];
  company_size?: string;
  industry?: string;
}): Promise<{
  opportunity_type: 'Upsell' | 'Cross-sell';
  product_suggestion: string;
  confidence: number;
  potential_value: number;
}> {
  const prompt = `
## IDENTIDADE
Você é um especialista em vendas consultivas para escritórios de contabilidade.

## MISSÃO
Identificar oportunidades de expansão de receita.

## SERVIÇOS DISPONÍVEIS
1. Contabilidade Básica (R$ 500-2.000/mês)
2. Folha de Pagamento (R$ 300-1.500/mês)
3. Assessoria Fiscal (R$ 800-3.000/mês)
4. BPO Financeiro (R$ 1.500-5.000/mês)
5. Planejamento Tributário (R$ 2.000-8.000/mês)
6. Compliance & Auditoria (R$ 3.000-10.000/mês)

## DADOS DO CLIENTE
${JSON.stringify(dealData, null, 2)}

## OUTPUT (JSON)
{
  "opportunity_type": "Upsell" ou "Cross-sell",
  "product_suggestion": "string (nome do serviço + benefício chave)",
  "confidence": number (0-100),
  "potential_value": number (valor mensal estimado em R$)
}
  `.trim();

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  const result = safelyParseJson<{
    opportunity_type: 'Upsell' | 'Cross-sell';
    product_suggestion: string;
    confidence: number;
    potential_value: number;
  }>(response.text);

  if (!result) {
    throw new Error('Falha ao parsear análise de upsell');
  }

  return result;
}

/**
 * Gera relatório automatizado com insights de negócio usando Gemini AI
 * 
 * @param analyticsData - Dados agregados de vendas, deals, tasks
 * @returns Relatório com título, sumário e timestamp
 */
export async function generateAutomatedReport(analyticsData: {
  total_deals: number;
  total_value: number;
  won_deals: number;
  lost_deals: number;
  avg_deal_value: number;
  top_cnae?: string;
  conversion_rate: number;
  period: string;
}): Promise<{
  title: string;
  summary: string;
  generatedAt: string;
}> {
  const prompt = `
## IDENTIDADE
Você é um analista de BI especializado em CRM para contadores.

## MISSÃO
Gerar relatório executivo em português com insights acionáveis.

## DADOS DO PERÍODO (${analyticsData.period})
${JSON.stringify(analyticsData, null, 2)}

## ESTRUTURA DO RELATÓRIO
1. Título: curto e impactante (ex: "Crescimento de 25% em Vendas - Jan/2025")
2. Sumário: 3-5 parágrafos com:
   - Performance geral (deals ganhos vs perdidos)
   - Análise de valor médio
   - Taxa de conversão e tendências
   - Recomendações específicas (mínimo 2)

## OUTPUT (JSON)
{
  "title": "string (máx 80 chars)",
  "summary": "string (HTML permitido: <p>, <strong>, <ul>, <li>)",
  "generatedAt": "${new Date().toISOString()}"
}
  `.trim();

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: { responseMimeType: 'application/json' }
  });

  const result = safelyParseJson<{
    title: string;
    summary: string;
    generatedAt: string;
  }>(response.text);

  if (!result) {
    throw new Error('Falha ao parsear relatório automatizado');
  }

  return {
    ...result,
    generatedAt: new Date().toISOString() // Garantir timestamp correto
  };
}