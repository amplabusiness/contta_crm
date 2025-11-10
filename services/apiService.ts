import React from 'react';
import {
    StatCardData, SalesData, DealStageData, RecentActivity, Empresa,
    ChurnPrediction, UpsellOpportunity, AutomatedReport, ConsentStatus, DataAccessLog,
    ProgramaIndicacoesStatus, Indicacao, EmpresaParaIndicar, Deal, DealStage, Task, TaskStatus, TeamMember, UserRole, CompanyActivity,
    GlobalSearchResults
} from '../types.ts';
import { supabase } from './supabaseClient.ts';
import {
    computeDashboardMetrics,
    type DealRecord,
    type TaskRecord,
} from './dashboardMetrics.ts';
import {
    DollarSignIcon,
    BriefcaseIcon,
    ClockIcon,
    TrendingUpIcon,
} from '../components/icons/Icons.tsx';

export const authorizedFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers ?? {});

    try {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
    } catch (error) {
        console.warn('Não foi possível resolver a sessão ativa para a requisição autenticada.', error);
    }

    return fetch(input, { ...init, headers });
};

// Dashboard
export const fetchDashboardData = async (): Promise<{
    statCardsData: StatCardData[];
    salesChartData: SalesData[];
    dealStageData: DealStageData[];
    recentActivities: RecentActivity[];
}> => {
    const [dealsResult, tasksResult] = await Promise.all([
        supabase
            .from('deals')
            .select('id, company_name, value, stage, probability, expected_close_date, last_activity, created_at')
            .order('created_at', { ascending: false })
            .limit(400),
        supabase
            .from('tasks')
            .select('id, title, status, priority, due_date, created_at, related_deal_name')
            .order('created_at', { ascending: false })
            .limit(400),
    ]);

    if (dealsResult.error) {
        console.error('Falha ao buscar dados de negócios no Supabase:', dealsResult.error);
        throw new Error('Falha ao buscar os dados do dashboard.');
    }

    if (tasksResult.error) {
        console.error('Falha ao buscar dados de tarefas no Supabase:', tasksResult.error);
        throw new Error('Falha ao buscar os dados do dashboard.');
    }

    const deals = (dealsResult.data ?? []) as DealRecord[];
    const tasks = (tasksResult.data ?? []) as TaskRecord[];

    const metrics = computeDashboardMetrics(deals, tasks);

    const iconMap: Record<string, React.ReactElement> = {
        'Receita Total': React.createElement(DollarSignIcon, { className: 'w-6 h-6 text-gray-400' }),
        'Negócios Ativos': React.createElement(BriefcaseIcon, { className: 'w-6 h-6 text-gray-400' }),
        'Tarefas Pendentes': React.createElement(ClockIcon, { className: 'w-6 h-6 text-gray-400' }),
        'Taxa de Conversão': React.createElement(TrendingUpIcon, { className: 'w-6 h-6 text-gray-400' }),
    };

    const statCardsData: StatCardData[] = metrics.statCardsData.map((card) => {
        const icon = iconMap[card.title];
        return icon ? { ...card, icon } : card;
    });

    return {
        ...metrics,
        statCardsData,
    };
};

// Prospecção
export interface FetchProspectCompaniesOptions {
    search?: string;
    limit?: number;
    offset?: number;
    signal?: AbortSignal;
}

export interface FetchProspectCompaniesResult {
    data: Empresa[];
    total: number;
}

export const fetchProspectCompanies = async (
    options: FetchProspectCompaniesOptions = {},
): Promise<FetchProspectCompaniesResult> => {
    const params = new URLSearchParams();

    if (options.search) {
        params.set('search', options.search);
    }
    if (typeof options.limit === 'number') {
        params.set('limit', String(Math.max(1, options.limit)));
    }
    if (typeof options.offset === 'number') {
        params.set('offset', String(Math.max(0, options.offset)));
    }

    const query = params.toString();
    const response = await authorizedFetch(`/api/prospects${query ? `?${query}` : ''}`, {
        signal: options.signal,
    });

    if (!response.ok) {
        throw new Error('Falha ao buscar prospects da API.');
    }

    const totalHeader = response.headers.get('X-Total-Count');
    const parsedTotal = totalHeader ? Number.parseInt(totalHeader, 10) : Number.NaN;
    const data: Empresa[] = await response.json();
    const total = Number.isFinite(parsedTotal) ? parsedTotal : data.length;

    return { data, total };
};

export const fetchEmpresaByCnpj = async (cnpj: string): Promise<Empresa | null> => {
    const sanitizedCnpj = cnpj.replace(/[^\d]/g, '');
    if (!sanitizedCnpj) {
        throw new Error('CNPJ inválido.');
    }

    const params = new URLSearchParams({ cnpj: sanitizedCnpj });
    const response = await authorizedFetch(`/api/prospects?${params.toString()}`);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error('Falha ao buscar dados da empresa da API.');
    }

    const payload = await response.json();

    if (Array.isArray(payload)) {
        return payload[0] ?? null;
    }

    return payload ?? null;
};


// Analytics
export interface AnalyticsDataResult {
    report: AutomatedReport;
    churnPredictions: ChurnPrediction[];
    upsellOpportunities: UpsellOpportunity[];
    insightsHtml: string | null;
}

export const fetchAnalyticsData = async (): Promise<AnalyticsDataResult> => {
    // Buscar dados REAIS dos 3 novos endpoints
    const [reportRes, churnRes, upsellRes] = await Promise.all([
        authorizedFetch('/api/analytics-report?days=30'),
        authorizedFetch('/api/analytics-churn'),
        authorizedFetch('/api/analytics-upsell'),
    ]);

    if (!reportRes.ok || !churnRes.ok || !upsellRes.ok) {
        throw new Error('Falha ao buscar dados analíticos da API.');
    }

    const report = await reportRes.json() as AutomatedReport;
    const churnPredictions = await churnRes.json() as ChurnPrediction[];
    const upsellOpportunities = await upsellRes.json() as UpsellOpportunity[];

    return {
        report,
        churnPredictions,
        upsellOpportunities,
        insightsHtml: null, // Deprecated - dados agora vêm dos agentes IA
    };
};

// Compliance
export const fetchComplianceData = async (): Promise<{
        consentStatus: ConsentStatus;
        accessLogs: DataAccessLog[];
}> => {
    const response = await authorizedFetch('/api/compliance');
        if (!response.ok) {
                throw new Error('Falha ao buscar dados de compliance da API.');
        }
        const payload = await response.json();
        return {
                consentStatus: payload.consentStatus as ConsentStatus,
                accessLogs: (payload.accessLogs ?? []) as DataAccessLog[],
        };
};

// Indicações
export const fetchIndicacoesStatus = async (): Promise<ProgramaIndicacoesStatus> => {
    const response = await authorizedFetch('/api/indicacoes?section=status');
    if (!response.ok) {
        throw new Error('Falha ao buscar o status do programa de indicações.');
    }
    return await response.json();
}

export const fetchMinhasIndicacoes = async (): Promise<Indicacao[]> => {
    const response = await authorizedFetch('/api/indicacoes?section=minhas');
    if (!response.ok) {
        throw new Error('Falha ao buscar suas indicações.');
    }
    return await response.json();
}

export const fetchEmpresasParaIndicar = async (cepOrigem: string): Promise<EmpresaParaIndicar[]> => {
    const params = new URLSearchParams({ section: 'sugestoes' });
    if (cepOrigem) {
        params.set('cep', cepOrigem);
    }

    const response = await authorizedFetch(`/api/indicacoes?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Falha ao buscar empresas para indicar.');
    }
    return await response.json();
}

// Negócios
export const fetchDeals = async (): Promise<Deal[]> => {
    const response = await authorizedFetch('/api/deals');
    if (!response.ok) {
        throw new Error('Falha ao buscar negócios da API. Verifique se o backend está funcionando.');
    }
    const deals: Deal[] = await response.json();
    return deals;
}

export const createDeal = async (dealData: Omit<Deal, 'id' | 'createdAt'>): Promise<Deal> => {
    const response = await authorizedFetch('/api/deals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
    });
    if (!response.ok) {
        throw new Error('Falha ao criar negócio.');
    }
    return await response.json();
};

export const updateDealStage = async (dealId: string, nextStage: DealStage): Promise<Deal> => {
    const response = await authorizedFetch(`/api/deals/${dealId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: nextStage }),
    });

    if (!response.ok) {
        throw new Error('Falha ao atualizar o estágio do negócio.');
    }

    return await response.json();
};

export const deleteDeal = async (dealId: string): Promise<void> => {
    const response = await authorizedFetch(`/api/deals/${dealId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Falha ao deletar negócio.');
    }
};

// Tarefas
export const fetchTasks = async (): Promise<Task[]> => {
    const response = await authorizedFetch('/api/tasks');
    if (!response.ok) {
        throw new Error('Falha ao buscar tarefas da API.');
    }
    const tasks: Task[] = await response.json();
    return tasks;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    const response = await authorizedFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error("Falha ao atualizar a tarefa.");
    }
    return await response.json();
}

export const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
    const response = await authorizedFetch('/api/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
    });
    if (!response.ok) {
        throw new Error("Falha ao adicionar a tarefa.");
    }
    return await response.json();
};

export const deleteTask = async (taskId: string): Promise<void> => {
    const response = await authorizedFetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error("Falha ao excluir a tarefa.");
    }
};

// Equipe & Admin
export const fetchTeamMembers = async (): Promise<TeamMember[]> => {
    const response = await authorizedFetch('/api/team');
    if (!response.ok) {
        throw new Error('Falha ao buscar membros da equipe da API.');
    }
    const team: TeamMember[] = await response.json();
    return team;
}

export const addTeamMember = async (memberData: Omit<TeamMember, 'id' | 'lastLogin' | 'emailUsageGB'>): Promise<TeamMember> => {
    const response = await authorizedFetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memberData),
    });
    if (!response.ok) {
        throw new Error("Falha ao adicionar novo membro.");
    }
    return await response.json();
}

export const updateTeamMemberStatus = async (memberId: string, status: 'Ativo' | 'Inativo'): Promise<TeamMember> => {
    const response = await authorizedFetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
     if (!response.ok) {
        throw new Error("Falha ao atualizar status do membro.");
    }
    return await response.json();
}

// Report Generation
export const fetchReportData = async (reportType: 'network' | 'territorial' | 'performance') => {
    const params = new URLSearchParams({ type: reportType });
    const response = await authorizedFetch(`/api/reports?${params.toString()}`);
    if (!response.ok) {
        throw new Error('Falha ao buscar dados para geração de relatórios.');
    }
    return await response.json();
};

// Empresa Detalhe
export const fetchActivitiesForCompany = async (companyName: string): Promise<CompanyActivity[]> => {
    const normalizedName = companyName.trim().toLowerCase();
    if (!normalizedName) {
        return [];
    }

    const activities: CompanyActivity[] = [];

    let deals: Deal[] = [];
    let tasks: Task[] = [];

    try {
        deals = await fetchDeals();
    } catch (error) {
        console.error('Falha ao carregar negócios para a empresa:', error);
    }

    try {
        tasks = await fetchTasks();
    } catch (error) {
        console.error('Falha ao carregar tarefas para a empresa:', error);
    }

    deals
        .filter((deal) => deal.companyName.toLowerCase().includes(normalizedName))
        .forEach((deal) => {
            const activityDate = deal.lastActivity || deal.expectedCloseDate || deal.createdAt;
            activities.push({
                id: `act-deal-${deal.id}`,
                type: 'deal',
                title: `Negócio de ${deal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                description: `Contato com ${deal.contactName}`,
                date: activityDate,
                status: deal.stage,
            });
        });

    tasks
        .filter((task) => task.relatedDealName.toLowerCase().includes(normalizedName))
        .forEach((task) => {
            const taskDate = task.dueDate ?? task.createdAt;
            activities.push({
                id: `act-task-${task.id}`,
                type: 'task',
                title: task.title,
                description: `Prioridade: ${task.priority}`,
                date: taskDate,
                status: task.status,
            });
        });

    return activities
        .filter((activity) => Boolean(activity.date))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Global Search
export const executeGlobalSearch = async (params: any): Promise<GlobalSearchResults> => {
    const results: GlobalSearchResults = { clients: [], deals: [], tasks: [] };
    const loaders: Array<Promise<void>> = [];

    if (params?.clients) {
        loaders.push((async () => {
            try {
                const nameFilter = typeof params.clients.name === 'string' ? params.clients.name.trim() : '';
                const cnaeFilter = typeof params.clients.cnae === 'string' ? params.clients.cnae.trim() : '';
                const searchTerm = nameFilter || cnaeFilter;

                const { data } = await fetchProspectCompanies({
                    search: searchTerm || undefined,
                    limit: 25,
                });

                let candidates = data;

                if (cnaeFilter) {
                    const lowered = cnaeFilter.toLowerCase();
                    candidates = candidates.filter((empresa) =>
                        (empresa.cnae_principal?.descricao?.toLowerCase() ?? '').includes(lowered) ||
                        (empresa.cnae_principal?.codigo?.toLowerCase() ?? '').includes(lowered),
                    );
                }

                if (nameFilter) {
                    const lowered = nameFilter.toLowerCase();
                    candidates = candidates.filter((empresa) => {
                        const razao = empresa.razao_social?.toLowerCase() ?? '';
                        const fantasia = empresa.nome_fantasia?.toLowerCase() ?? '';
                        return razao.includes(lowered) || fantasia.includes(lowered);
                    });
                }

                results.clients = candidates.slice(0, 5).map((empresa) => ({
                    id: empresa.cnpj,
                    type: 'client',
                    title: empresa.nome_fantasia || empresa.razao_social,
                    description: empresa.razao_social,
                    payload: empresa,
                }));
            } catch (error) {
                console.error('Falha ao buscar clientes na pesquisa global:', error);
            }
        })());
    }

    if (params?.deals) {
        loaders.push((async () => {
            try {
                const deals = await fetchDeals();
                let filteredDeals = deals;

                if (params.deals.companyName) {
                    const name = params.deals.companyName.toLowerCase();
                    filteredDeals = filteredDeals.filter((deal) =>
                        deal.companyName.toLowerCase().includes(name),
                    );
                }

                if (typeof params.deals.minValue === 'number') {
                    filteredDeals = filteredDeals.filter((deal) => deal.value >= params.deals.minValue);
                }

                if (params.deals.stage) {
                    const stage = params.deals.stage.toLowerCase().replace(/\s+/g, '');
                    filteredDeals = filteredDeals.filter((deal) =>
                        deal.stage.toLowerCase().replace(/\s+/g, '') === stage,
                    );
                }

                results.deals = filteredDeals.slice(0, 5).map((deal) => ({
                    id: deal.id,
                    type: 'deal',
                    title: deal.companyName,
                    description: `Valor: ${deal.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - Estágio: ${deal.stage}`,
                    payload: deal,
                }));
            } catch (error) {
                console.error('Falha ao buscar negócios na pesquisa global:', error);
            }
        })());
    }

    if (params?.tasks) {
        loaders.push((async () => {
            try {
                const tasks = await fetchTasks();
                let filteredTasks = tasks;

                if (params.tasks.title) {
                    const title = params.tasks.title.toLowerCase();
                    filteredTasks = filteredTasks.filter((task) =>
                        task.title.toLowerCase().includes(title),
                    );
                }

                if (params.tasks.companyName) {
                    const companyName = params.tasks.companyName.toLowerCase();
                    filteredTasks = filteredTasks.filter((task) =>
                        task.relatedDealName.toLowerCase().includes(companyName),
                    );
                }

                if (params.tasks.priority) {
                    const priority = params.tasks.priority.toLowerCase();
                    filteredTasks = filteredTasks.filter((task) =>
                        task.priority.toLowerCase() === priority,
                    );
                }

                if (params.tasks.status) {
                    const status = params.tasks.status.toLowerCase().replace(/\s+/g, '');
                    filteredTasks = filteredTasks.filter((task) =>
                        task.status.toLowerCase().replace(/\s+/g, '') === status,
                    );
                }

                results.tasks = filteredTasks.slice(0, 5).map((task) => {
                    const dueDateLabel = task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString('pt-BR')
                        : 'Sem data de vencimento';

                    return {
                        id: task.id,
                        type: 'task',
                        title: task.title,
                        description: `Para: ${task.relatedDealName} - Vencimento: ${dueDateLabel}`,
                        payload: task,
                    };
                });
            } catch (error) {
                console.error('Falha ao buscar tarefas na pesquisa global:', error);
            }
        })());
    }

    await Promise.all(loaders);

    return results;
};