import {
    StatCardData, SalesData, DealStageData, RecentActivity, Empresa,
    ChurnPrediction, UpsellOpportunity, AutomatedReport, ConsentStatus, DataAccessLog,
    ProgramaIndicacoesStatus, Indicacao, EmpresaParaIndicar, Deal, Task, TaskStatus, TeamMember, UserRole, CompanyActivity,
    GlobalSearchResults
} from './types.ts';
import {
    mockStatCardsData, mockSalesChartData, mockDealStageData, mockRecentActivities, mockProspectsCnpjs,
    mockChurnPredictions, mockUpsellOpportunities, mockAutomatedReport, mockConsentStatus, mockDataAccessLogs,
    mockIndicacoesStatus, mockMinhasIndicacoes, mockEmpresasParaIndicar, mockDeals, mockTasks, mockTeamMembers,
    mockNetworkData, mockTerritorialData, mockPerformanceData, mockEmpresas
} from '../data/mockData.ts';
import { generateAutomatedReport } from './geminiService.ts';

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Dashboard
export const fetchDashboardData = async (): Promise<{
  statCardsData: StatCardData[];
  salesChartData: SalesData[];
  dealStageData: DealStageData[];
  recentActivities: RecentActivity[];
}> => {
  // This now fetches from the real backend API endpoint.
  const response = await fetch('/api/dashboard-data');
  if (!response.ok) {
      throw new Error('Falha ao buscar os dados do dashboard da API.');
  }
  return await response.json();
};

// Prospecção
export const fetchProspectCompanies = async (): Promise<Empresa[]> => {
  const response = await fetch('/api/empresas');
  if (!response.ok) {
    throw new Error('Falha ao buscar prospects da API.');
  }
  const empresas: Empresa[] = await response.json();
  return empresas;
};

export const fetchEmpresaByCnpj = async (cnpj: string): Promise<Empresa | null> => {
    const sanitizedCnpj = cnpj.replace(/[^\d]/g, '');
    const response = await fetch(`/api/empresas/${sanitizedCnpj}`);
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error('Falha ao buscar dados da empresa da API.');
    }
    return await response.json();
};


// Analytics
export const fetchAnalyticsData = async () => {
  await simulateDelay(1500);
  const summary = await generateAutomatedReport({
      salesData: mockSalesChartData,
      dealData: mockDealStageData,
      churnData: mockChurnPredictions,
      upsellData: mockUpsellOpportunities,
  });
  return {
    report: { ...mockAutomatedReport, summary },
    churnPredictions: mockChurnPredictions,
    upsellOpportunities: mockUpsellOpportunities,
  };
};

// Compliance
export const fetchComplianceData = async () => {
  await simulateDelay(600);
  return {
    consentStatus: mockConsentStatus,
    accessLogs: mockDataAccessLogs,
  };
};

// Indicações
export const fetchIndicacoesStatus = async (): Promise<ProgramaIndicacoesStatus> => {
    await simulateDelay(400);
    return mockIndicacoesStatus;
}
export const fetchMinhasIndicacoes = async (): Promise<Indicacao[]> => {
    await simulateDelay(500);
    return mockMinhasIndicacoes;
}
export const fetchEmpresasParaIndicar = async (cepOrigem: string): Promise<EmpresaParaIndicar[]> => {
    await simulateDelay(800);
    // In a real app, you would use cepOrigem to query a backend service
    return mockEmpresasParaIndicar;
}

// Negócios
export const fetchDeals = async (): Promise<Deal[]> => {
    // This now fetches from the real backend API endpoint.
    // Ensure the Vercel serverless function at /api/deals is created and connected to Supabase as per BACKEND_DOCUMENTATION.md.
    const response = await fetch('/api/deals');
    if (!response.ok) {
        // The Negocios.tsx component will catch this error and display a message.
        throw new Error('Falha ao buscar negócios da API. Verifique se o backend está funcionando.');
    }
    const deals: Deal[] = await response.json();
    return deals;
}

// Tarefas
export const fetchTasks = async (): Promise<Task[]> => {
    const response = await fetch('/api/tasks');
    if (!response.ok) {
        throw new Error('Falha ao buscar tarefas da API.');
    }
    const tasks: Task[] = await response.json();
    return tasks;
};

export const updateTask = async (taskId: string, updates: Partial<Task>): Promise<Task> => {
    const response = await fetch(`/api/tasks/${taskId}`, {
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
    const response = await fetch('/api/tasks', {
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

// Equipe & Admin
export const fetchTeamMembers = async (): Promise<TeamMember[]> => {
    const response = await fetch('/api/team');
    if (!response.ok) {
        throw new Error('Falha ao buscar membros da equipe da API.');
    }
    const team: TeamMember[] = await response.json();
    return team;
}

export const addTeamMember = async (memberData: Omit<TeamMember, 'id' | 'lastLogin' | 'emailUsageGB'>): Promise<TeamMember> => {
    const response = await fetch('/api/team', {
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
    const response = await fetch(`/api/team/${memberId}`, {
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
export const fetchMockDataForReport = async (reportType: 'network' | 'territorial' | 'performance') => {
    await simulateDelay(800);
    switch (reportType) {
        case 'network':
            return { networkData: mockNetworkData };
        case 'territorial':
            return { territorialData: mockTerritorialData };
        case 'performance':
            return { performanceData: mockPerformanceData };
        default:
            return {};
    }
};

// Empresa Detalhe
export const fetchActivitiesForCompany = async (companyName: string): Promise<CompanyActivity[]> => {
    await simulateDelay(500);
    const activities: CompanyActivity[] = [];
    const relatedDeals = mockDeals.filter(d => d.companyName.toLowerCase() === companyName.toLowerCase());
    const relatedTasks = mockTasks.filter(t => t.relatedDealName.toLowerCase() === companyName.toLowerCase());

    relatedDeals.forEach(deal => {
        activities.push({
            id: `act-deal-${deal.id}`,
            type: 'deal',
            title: `Negócio de ${deal.value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}`,
            description: `Contato com ${deal.contactName}`,
            date: deal.lastActivity,
            status: deal.stage
        });
    });

     relatedTasks.forEach(task => {
        activities.push({
            id: `act-task-${task.id}`,
            type: 'task',
            title: task.title,
            description: `Prioridade: ${task.priority}`,
            date: task.dueDate,
            status: task.status
        });
    });

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Global Search
export const executeGlobalSearch = async (params: any): Promise<GlobalSearchResults> => {
    await simulateDelay(300); // Simulate search time
    const results: GlobalSearchResults = { clients: [], deals: [], tasks: [] };

    // Search Clients (Empresas)
    if (params.clients) {
        let filteredClients = mockEmpresas;
        if (params.clients.name) {
            const name = params.clients.name.toLowerCase();
            filteredClients = filteredClients.filter(c =>
                c.razao_social.toLowerCase().includes(name) ||
                (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(name))
            );
        }
        if (params.clients.cnae) {
             const cnae = params.clients.cnae.toLowerCase();
             filteredClients = filteredClients.filter(c => c.cnae_principal.descricao.toLowerCase().includes(cnae));
        }
        results.clients = filteredClients.slice(0, 5).map(c => ({
            id: c.cnpj,
            type: 'client',
            title: c.nome_fantasia || c.razao_social,
            description: c.razao_social,
            payload: c,
        }));
    }

    // Search Deals
    if (params.deals) {
        let filteredDeals = mockDeals;
        if (params.deals.companyName) {
            const companyName = params.deals.companyName.toLowerCase();
            filteredDeals = filteredDeals.filter(d => d.companyName.toLowerCase().includes(companyName));
        }
        if (params.deals.minValue) {
            filteredDeals = filteredDeals.filter(d => d.value >= params.deals.minValue);
        }
        if (params.deals.stage) {
            const stage = params.deals.stage.toLowerCase();
            filteredDeals = filteredDeals.filter(d => d.stage.toLowerCase().replace(' ', '') === stage.replace(' ', ''));
        }
        results.deals = filteredDeals.slice(0, 5).map(d => ({
            id: d.id,
            type: 'deal',
            title: d.companyName,
            description: `Valor: ${d.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - Estágio: ${d.stage}`,
            payload: d
        }));
    }

    // Search Tasks
    if (params.tasks) {
        let filteredTasks = mockTasks;
        if (params.tasks.title) {
            const title = params.tasks.title.toLowerCase();
            filteredTasks = filteredTasks.filter(t => t.title.toLowerCase().includes(title));
        }
        if (params.tasks.companyName) {
            const companyName = params.tasks.companyName.toLowerCase();
            filteredTasks = filteredTasks.filter(t => t.relatedDealName.toLowerCase().includes(companyName));
        }
        if (params.tasks.priority) {
            const priority = params.tasks.priority.toLowerCase();
            filteredTasks = filteredTasks.filter(t => t.priority.toLowerCase() === priority);
        }
        if (params.tasks.status) {
             const status = params.tasks.status.toLowerCase();
             filteredTasks = filteredTasks.filter(t => t.status.toLowerCase().replace(/\s/g, '') === status.replace(/\s/g, ''));
        }
        results.tasks = filteredTasks.slice(0, 5).map(t => ({
            id: t.id,
            type: 'task',
            title: t.title,
            description: `Para: ${t.relatedDealName} - Vencimento: ${new Date(t.dueDate).toLocaleDateString('pt-BR')}`,
            payload: t,
        }));
    }
    
    return results;
};