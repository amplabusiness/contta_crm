/**
 * mappers.ts
 * 
 * Transformation functions between database types (types-db.ts) and business types (types.ts)
 * 
 * Database types use snake_case and individual fields matching SQL schema
 * Business types use camelCase and may have nested objects
 * 
 * @see types-db.ts for database types
 * @see types.ts for business types
 */

import type {
    EmpresaDB,
    SocioDB,
    SocioComEmpresaDB,
    EmpresaComSociosDB,
    DealDB,
    TaskDB,
    ProfileDB,
    IndicacaoDB,
} from '../types-db';

import type {
    Empresa,
    Endereco,
    CNAE,
    Socio,
    Deal,
    DealHealth,
    Task,
    TeamMember,
    Indicacao,
} from '../types';

// ============================================================================
// EMPRESA MAPPERS
// ============================================================================

/**
 * Transform database EmpresaDB to business Empresa
 * Converts individual address fields to nested endereco_principal object
 * Converts individual CNAE fields to nested cnae_principal object
 * 
 * @param db - EmpresaDB from Supabase query
 * @param socios - Array of Socio from separate query or JOIN
 * @returns Empresa business object
 */
export function mapEmpresaDBToEmpresa(
    db: EmpresaDB,
    socios: Socio[] = []
): Empresa {
    return {
        cnpj: db.cnpj,
        razao_social: db.razao_social,
        nome_fantasia: db.nome_fantasia || '',
        situacao_cadastral: normalizeSituacaoCadastral(db.situacao_cadastral),
        data_abertura: db.data_abertura || '',
        porte: normalizePorte(db.porte),
        
        // Nested endereco object from individual fields
        endereco_principal: {
            logradouro: db.logradouro || '',
            numero: db.numero || '',
            bairro: db.bairro || '',
            cidade: db.cidade || '',
            uf: db.uf || '',
            cep: db.cep || '',
            latitude: db.latitude ?? undefined,
            longitude: db.longitude ?? undefined,
        },
        
        // Nested CNAE object from individual fields
        cnae_principal: {
            codigo: db.cnae_principal_codigo || '',
            descricao: db.cnae_principal_descricao || '',
        },
        
        quadro_socios: socios,
        telefones: db.telefones || [],
        emails: db.emails || [],
        documentos: [], // Not stored in DB, populated from external sources
        createdAt: db.created_at,
    };
}

/**
 * Transform business Empresa to database EmpresaDB
 * Flattens nested objects to individual fields
 * 
 * @param empresa - Business Empresa object
 * @returns EmpresaDB for Supabase insert/update
 */
export function mapEmpresaToEmpresaDB(empresa: Empresa): EmpresaDB {
    return {
        cnpj: empresa.cnpj,
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia || null,
        situacao_cadastral: empresa.situacao_cadastral || null,
        data_abertura: empresa.data_abertura || null,
        porte: empresa.porte || null,
        
        // Flatten endereco_principal to individual fields
        logradouro: empresa.endereco_principal?.logradouro || null,
        numero: empresa.endereco_principal?.numero || null,
        bairro: empresa.endereco_principal?.bairro || null,
        cidade: empresa.endereco_principal?.cidade || null,
        uf: empresa.endereco_principal?.uf || null,
        cep: empresa.endereco_principal?.cep || null,
        latitude: empresa.endereco_principal?.latitude ?? null,
        longitude: empresa.endereco_principal?.longitude ?? null,
        
        // Flatten cnae_principal to individual fields
        cnae_principal_codigo: empresa.cnae_principal?.codigo || null,
        cnae_principal_descricao: empresa.cnae_principal?.descricao || null,
        
        telefones: empresa.telefones || [],
        emails: empresa.emails || [],
        created_at: empresa.createdAt || new Date().toISOString(),
    };
}

/**
 * Transform SocioComEmpresaDB (JOIN result) to business Socio
 * 
 * @param db - SocioComEmpresaDB from JOIN query
 * @returns Socio business object
 */
export function mapSocioDBToSocio(db: SocioComEmpresaDB): Socio {
    return {
        nome_socio: db.nome_socio,
        cpf_parcial: db.cpf_parcial,
        qualificacao: db.qualificacao || '',
        percentual_capital: db.percentual_capital || 0,
    };
}

/**
 * Normalize situacao_cadastral to strict type
 */
function normalizeSituacaoCadastral(value: string | null): 'Ativa' | 'Suspensa' | 'Baixada' {
    const normalized = value?.toLowerCase();
    if (normalized?.includes('ativa')) return 'Ativa';
    if (normalized?.includes('suspensa')) return 'Suspensa';
    if (normalized?.includes('baixada')) return 'Baixada';
    return 'Ativa'; // default
}

/**
 * Normalize porte to strict type
 */
function normalizePorte(value: string | null): 'ME' | 'EPP' | 'Demais' {
    const normalized = value?.toUpperCase();
    if (normalized === 'ME') return 'ME';
    if (normalized === 'EPP') return 'EPP';
    return 'Demais';
}

// ============================================================================
// DEAL MAPPERS
// ============================================================================

/**
 * Transform database DealDB to business Deal
 * Converts snake_case to camelCase
 * Converts individual health fields to nested health object
 * 
 * @param db - DealDB from Supabase query
 * @returns Deal business object
 */
export function mapDealDBToDeal(db: DealDB): Deal {
    return {
        id: db.id,
        companyName: db.company_name,
        contactName: db.contact_name || '',
        contactEmail: db.contact_email || '',
        value: db.value,
        probability: db.probability,
        expectedCloseDate: db.expected_close_date || '',
        lastActivity: db.last_activity,
        stage: db.stage,
        
        // Nested health object from individual fields
        health: db.health_score !== null ? {
            score: db.health_score,
            reasoning: db.health_reasoning || '',
            suggestedAction: db.health_suggested_action || '',
        } : null,
        
        empresaCnpj: db.empresa_cnpj,
        ownerId: db.owner_id,
        createdAt: db.created_at,
    };
}

/**
 * Transform business Deal to database DealDB
 * Converts camelCase to snake_case
 * Flattens nested health object to individual fields
 * 
 * @param deal - Business Deal object
 * @returns DealDB for Supabase insert/update
 */
export function mapDealToDealDB(deal: Deal): DealDB {
    return {
        id: deal.id,
        company_name: deal.companyName,
        contact_name: deal.contactName || null,
        contact_email: deal.contactEmail || null,
        value: deal.value,
        probability: deal.probability,
        stage: deal.stage,
        expected_close_date: deal.expectedCloseDate || null,
        last_activity: deal.lastActivity || new Date().toISOString(),
        
        // Flatten health object to individual fields
        health_score: deal.health?.score ?? null,
        health_reasoning: deal.health?.reasoning ?? null,
        health_suggested_action: deal.health?.suggestedAction ?? null,
        
        empresa_cnpj: deal.empresaCnpj ?? null,
        owner_id: deal.ownerId ?? null,
        created_at: deal.createdAt || new Date().toISOString(),
    };
}

// ============================================================================
// TASK MAPPERS
// ============================================================================

/**
 * Transform database TaskDB to business Task
 * Converts snake_case to camelCase
 * 
 * @param db - TaskDB from Supabase query
 * @returns Task business object
 */
export function mapTaskDBToTask(db: TaskDB): Task {
    return {
        id: db.id,
        title: db.title,
        dueDate: db.due_date,
        priority: db.priority,
        status: db.status,
        relatedDealId: db.deal_id || '',
        relatedDealName: db.related_deal_name || '',
        createdAt: db.created_at,
        description: db.description ?? undefined,
        googleCalendarEventId: db.google_calendar_event_id ?? undefined,
        assigneeId: db.assignee_id,
    };
}

/**
 * Transform business Task to database TaskDB
 * Converts camelCase to snake_case
 * 
 * @param task - Business Task object
 * @returns TaskDB for Supabase insert/update
 */
export function mapTaskToTaskDB(task: Task): TaskDB {
    return {
        id: task.id,
        title: task.title,
        due_date: task.dueDate,
        priority: task.priority,
        status: task.status,
        deal_id: task.relatedDealId || null,
        related_deal_name: task.relatedDealName || null,
        description: task.description ?? null,
        google_calendar_event_id: task.googleCalendarEventId ?? null,
        assignee_id: task.assigneeId ?? null,
        created_at: task.createdAt || new Date().toISOString(),
    };
}

// ============================================================================
// TEAM MEMBER MAPPERS
// ============================================================================

/**
 * Transform database ProfileDB to business TeamMember
 * Converts snake_case to camelCase
 * 
 * @param db - ProfileDB from Supabase query
 * @returns TeamMember business object
 */
export function mapProfileDBToTeamMember(db: ProfileDB): TeamMember {
    return {
        id: db.id,
        name: db.name || '',
        email: db.email || '',
        role: db.role,
        status: normalizeStatus(db.status),
        lastLogin: db.last_login || '',
        emailUsageGB: db.email_usage_gb,
        createdAt: db.created_at,
    };
}

/**
 * Transform business TeamMember to database ProfileDB
 * Converts camelCase to snake_case
 * 
 * @param member - Business TeamMember object
 * @returns ProfileDB for Supabase insert/update
 */
export function mapTeamMemberToProfileDB(member: TeamMember): ProfileDB {
    return {
        id: member.id,
        name: member.name || null,
        email: member.email || null,
        role: member.role,
        status: member.status,
        last_login: member.lastLogin || null,
        email_usage_gb: member.emailUsageGB,
        created_at: member.createdAt || new Date().toISOString(),
    };
}

/**
 * Normalize status to strict type
 */
function normalizeStatus(value: string): 'Ativo' | 'Inativo' {
    return value === 'Ativo' ? 'Ativo' : 'Inativo';
}

// ============================================================================
// INDICACAO MAPPERS
// ============================================================================

/**
 * Transform database IndicacaoDB to business Indicacao
 * Converts snake_case to camelCase
 * 
 * @param db - IndicacaoDB from Supabase query
 * @returns Indicacao business object
 */
export function mapIndicacaoDBToIndicacao(db: IndicacaoDB): Indicacao {
    return {
        id: db.id,
        empresa_nome: db.empresa_nome,
        status: normalizeIndicacaoStatus(db.status),
        data_indicacao: db.data_indicacao,
        recompensa_ganha: db.recompensa_ganha || 0,
        indicadorId: db.indicador_id,
        empresaCnpj: db.empresa_cnpj,
    };
}

/**
 * Transform business Indicacao to database IndicacaoDB
 * Converts camelCase to snake_case
 * 
 * @param indicacao - Business Indicacao object
 * @returns IndicacaoDB for Supabase insert/update
 */
export function mapIndicacaoToIndicacaoDB(indicacao: Indicacao): IndicacaoDB {
    return {
        id: indicacao.id,
        empresa_nome: indicacao.empresa_nome,
        status: indicacao.status,
        data_indicacao: indicacao.data_indicacao || new Date().toISOString(),
        recompensa_ganha: indicacao.recompensa_ganha || 0,
        indicador_id: indicacao.indicadorId ?? null,
        empresa_cnpj: indicacao.empresaCnpj ?? null,
    };
}

/**
 * Normalize indicacao status to strict type
 */
function normalizeIndicacaoStatus(value: string): 'Convertido' | 'Em negociação' | 'Rejeitado' {
    const normalized = value.toLowerCase();
    if (normalized.includes('convertido')) return 'Convertido';
    if (normalized.includes('rejeitado')) return 'Rejeitado';
    return 'Em negociação';
}

// ============================================================================
// BATCH MAPPERS
// ============================================================================

/**
 * Map array of DealDB to array of Deal
 */
export function mapDealsDBToDeals(deals: DealDB[]): Deal[] {
    return deals.map(mapDealDBToDeal);
}

/**
 * Map array of TaskDB to array of Task
 */
export function mapTasksDBToTasks(tasks: TaskDB[]): Task[] {
    return tasks.map(mapTaskDBToTask);
}

/**
 * Map array of ProfileDB to array of TeamMember
 */
export function mapProfilesDBToTeamMembers(profiles: ProfileDB[]): TeamMember[] {
    return profiles.map(mapProfileDBToTeamMember);
}

/**
 * Map array of EmpresaDB to array of Empresa
 * Note: This version doesn't include socios - use with separate query
 */
export function mapEmpresasDBToEmpresas(empresas: EmpresaDB[]): Empresa[] {
    return empresas.map(db => mapEmpresaDBToEmpresa(db, []));
}
