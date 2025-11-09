import { GoogleGenAI, Modality, Type } from "@google/genai";
import { 
    SalesData, DealStageData, ChurnPrediction, UpsellOpportunity, 
    MarketInsightResult, Empresa, ProspectAnalysis, Vinculo, 
    ParentePotencial, VinculoAnalysis, Deal, DealHealth, DataAccessLog, 
    RedeDeVinculos, ProgramaIndicacoesStatus, Indicacao, Socio
// FIX: Added Socio to the import list.
} from '../types';

// Initialize the Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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

export const generateAutomatedReport = async (data: any): Promise<string> => {
    const prompt = `
        Com base nos dados a seguir, gere um relatório executivo em HTML (use tags <h2>, <p>, <ul>, <li>, <strong>).
        Dados: ${JSON.stringify(data)}
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
}

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

export const generatePerformanceReport = async (status: ProgramaIndicacoesStatus, indicacoes: Indicacao[]): Promise<string> => {
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