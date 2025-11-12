import React, { useState, useEffect, useCallback } from 'react';
import { Empresa, ContratoPublico, SancaoPublica, CompanyActivity, GenealogyNode, Socio, NavigateFn } from '../types.ts';
import { fetchPublicData } from '../services/transparenciaService.ts';
import { fetchActivitiesForCompany } from '../services/apiService.ts';
import { fetchBusinessGenealogy } from '../services/businessGenealogyService.ts';
import { ArrowLeftIcon, BriefcaseIcon, MapPinIcon, UsersIcon, ClockIcon, DollarSignIcon, ShieldIcon, LinkIcon, InboxIcon, TasksIcon, UserIcon } from './icons/Icons.tsx';
import EditSocioModal from './EditSocioModal.tsx';

interface EmpresaDetalheProps {
    empresa: Empresa;
    navigate: NavigateFn;
}

type Tab = 'geral' | 'publico' | 'atividades' | 'genealogia';

const getStatusColor = (status: Empresa['situacao_cadastral']) => {
    switch (status) {
        case 'Ativa': return 'bg-green-500/20 text-green-300 border border-green-500/30';
        case 'Suspensa': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
        case 'Baixada': return 'bg-red-500/20 text-red-300 border border-red-500/30';
        default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30';
    }
};

const LoadingSection: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4">{message}</p>
    </div>
);

const RenderNode: React.FC<{ node: GenealogyNode }> = ({ node }) => {
    const isRoot = node.level === 0;
    const Icon = node.type === 'empresa' ? BriefcaseIcon : UserIcon;
    const color = node.type === 'empresa' ? 'border-teal-500' : 'border-indigo-500';

    return (
        <div className={`pl-4 ${!isRoot ? 'ml-6 border-l-2 border-gray-700' : ''}`}>
            <div className={`bg-gray-800 p-3 rounded-lg border-l-4 ${color} my-2`}>
                <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-white">{node.name}</h4>
                        <p className="text-xs text-gray-400">{node.details}</p>
                    </div>
                </div>
            </div>
            {node.children && node.children.length > 0 && (
                <div className="space-y-1">
                    {node.children.map(child => <RenderNode key={child.id} node={child} />)}
                </div>
            )}
        </div>
    );
};


const formatBirthday = (value?: string | null) => {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    try {
        return parsed.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
        });
    } catch (_) {
        return parsed.toISOString().split('T')[0];
    }
};

const formatCpfDisplay = (full?: string | null, fallback?: string) => {
    if (full) {
        const digits = full.replace(/[^0-9]/g, '');
        if (digits.length === 11) {
            return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
        }
        return full;
    }

    return fallback ?? 'Não informado';
};

const EmpresaDetalhe: React.FC<EmpresaDetalheProps> = ({ empresa, navigate }) => {
    const [empresaData, setEmpresaData] = useState<Empresa | null>(empresa ?? null);
    const [activeTab, setActiveTab] = useState<Tab>('geral');

    const [publicData, setPublicData] = useState<{ contratos: ContratoPublico[], sancoes: SancaoPublica[] }>({ contratos: [], sancoes: [] });
    const [activities, setActivities] = useState<CompanyActivity[]>([]);
    const [genealogy, setGenealogy] = useState<GenealogyNode | null>(null);

    const [loadingPublic, setLoadingPublic] = useState(false);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [loadingGenealogy, setLoadingGenealogy] = useState(false);
    const [editingSocio, setEditingSocio] = useState<Socio | null>(null);

    useEffect(() => {
        setEmpresaData(empresa ?? null);
    }, [empresa]);

    const handleSocioUpdated = useCallback((updatedSocio: Socio) => {
        setEmpresaData((current) => {
            if (!current) {
                return current;
            }

            return {
                ...current,
                quadro_socios: current.quadro_socios.map((item) =>
                    item.cpf_parcial === updatedSocio.cpf_parcial
                        ? {
                            ...item,
                            data_nascimento: updatedSocio.data_nascimento ?? null,
                            cpf_completo: updatedSocio.cpf_completo ?? null,
                        }
                        : item,
                ),
            };
        });
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!empresaData) return;

            if (activeTab === 'publico' && publicData.contratos.length === 0 && publicData.sancoes.length === 0) {
                setLoadingPublic(true);
                try {
                    const data = await fetchPublicData(empresaData.cnpj);
                    setPublicData(data);
                } catch (error) { console.error(error); }
                finally { setLoadingPublic(false); }
            }
            if (activeTab === 'atividades' && activities.length === 0) {
                setLoadingActivities(true);
                try {
                    const data = await fetchActivitiesForCompany(empresaData.razao_social);
                    setActivities(data);
                } catch (error) { console.error(error); }
                finally { setLoadingActivities(false); }
            }
            if (activeTab === 'genealogia' && !genealogy) {
                setLoadingGenealogy(true);
                try {
                    const data = await fetchBusinessGenealogy(empresaData.cnpj);
                    setGenealogy(data);
                } catch (error) { console.error(error); }
                finally { setLoadingGenealogy(false); }
            }
        };
        loadData();
    }, [activeTab, empresaData, publicData, activities, genealogy]);


    if (!empresaData) {
        return (
            <div className="space-y-6">
                <button onClick={() => navigate('Prospecção')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Voltar para Prospecção
                </button>
                <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">
                    Nenhuma empresa selecionada. Por favor, retorne e selecione um prospect.
                </div>
            </div>
        );
    }

    const tabs: { id: Tab; label: string; icon: React.FC<any> }[] = [
        { id: 'geral', label: 'Visão Geral', icon: BriefcaseIcon },
        { id: 'publico', label: 'Dados Públicos', icon: ShieldIcon },
        { id: 'atividades', label: 'Atividades', icon: ClockIcon },
        { id: 'genealogia', label: 'Genealogia', icon: LinkIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'publico':
                return loadingPublic ? <LoadingSection message="Buscando em fontes públicas..." /> : (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><DollarSignIcon className="w-5 h-5 text-green-400" />Contratos Públicos</h3>
                            {publicData.contratos.length > 0 ? publicData.contratos.map(c => (
                                <div key={c.id} className="p-4 bg-gray-800 rounded-lg mb-2">
                                    <p className="font-semibold text-indigo-300">{c.objeto}</p>
                                    <p><strong>Valor:</strong> {c.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    <p><strong>Órgão:</strong> {c.orgao}</p>
                                    <p><strong>Data:</strong> {new Date(c.data_assinatura).toLocaleDateString('pt-BR')}</p>
                                </div>
                            )) : <p className="text-gray-500">Nenhum contrato público encontrado.</p>}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><ShieldIcon className="w-5 h-5 text-red-400" />Sanções e Penalidades</h3>
                            {publicData.sancoes.length > 0 ? publicData.sancoes.map(s => (
                                <div key={s.id} className="p-4 bg-gray-800 rounded-lg mb-2 border-l-4 border-red-500">
                                    <p className="font-semibold text-red-300">{s.motivo}</p>
                                    <p><strong>Órgão:</strong> {s.orgao}</p>
                                    <p><strong>Data:</strong> {new Date(s.data_publicacao).toLocaleDateString('pt-BR')}</p>
                                </div>
                            )) : <p className="text-gray-500">Nenhuma sanção encontrada.</p>}
                        </div>
                    </div>
                );
            case 'atividades':
                return loadingActivities ? <LoadingSection message="Carregando atividades..." /> : (
                    <div>
                        {activities.length > 0 ? activities.map(act => (
                            <div key={act.id} className="p-4 bg-gray-800 rounded-lg mb-2 flex items-start gap-4">
                                <div className={`mt-1 p-2 bg-gray-700/50 rounded-full ${act.type === 'deal' ? 'text-indigo-400' : 'text-yellow-400'}`}>
                                    {act.type === 'deal' ? <InboxIcon className="w-5 h-5" /> : <TasksIcon className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-semibold text-white">{act.title}</p>
                                    <p className="text-sm text-gray-400">{act.description}</p>
                                    <p className="text-xs text-gray-500 mt-1">{new Date(act.date).toLocaleDateString('pt-BR')} - {act.status}</p>
                                </div>
                            </div>
                        )) : <p className="text-gray-500">Nenhuma atividade recente encontrada para esta empresa.</p>}
                    </div>
                );
            case 'genealogia':
                return loadingGenealogy ? <LoadingSection message="Analisando genealogia empresarial..." /> : (
                    <div>
                        {genealogy ? <RenderNode node={genealogy} /> : <p className="text-gray-500">Não foi possível gerar a árvore de relacionamentos.</p>}
                    </div>
                );
            default: // geral
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><BriefcaseIcon className="w-5 h-5 text-indigo-400"/>Informações Gerais</h3>
                            <p><strong>CNPJ:</strong> {empresaData.cnpj}</p>
                            <p><strong>Razão Social:</strong> {empresaData.razao_social}</p>
                            <p><strong>Nome Fantasia:</strong> {empresaData.nome_fantasia}</p>
                            <p><strong>Data de Abertura:</strong> {new Date(empresaData.data_abertura).toLocaleDateString('pt-BR')}</p>
                            <p><strong>Porte:</strong> {empresaData.porte}</p>
                            <p><strong>CNAE Principal:</strong> {empresaData.cnae_principal.descricao}</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><MapPinIcon className="w-5 h-5 text-indigo-400" />Endereço Principal</h3>
                            <p>{`${empresaData.endereco_principal.logradouro}, ${empresaData.endereco_principal.numero}`}</p>
                            <p>{empresaData.endereco_principal.bairro}</p>
                            <p>{`${empresaData.endereco_principal.cidade} - ${empresaData.endereco_principal.uf}`}</p>
                            <p><strong>CEP:</strong> {empresaData.endereco_principal.cep}</p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg md:col-span-2">
                            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2"><UsersIcon className="w-5 h-5 text-indigo-400" />Quadro Societário</h3>
                            {empresaData.quadro_socios.length > 0 ? (
                                <ul className="space-y-3">
                                    {empresaData.quadro_socios.map((socio) => {
                                        const birthdayLabel = formatBirthday(socio.data_nascimento);
                                        const cpfLabel = formatCpfDisplay(socio.cpf_completo, socio.cpf_parcial);
                                        return (
                                            <li key={socio.cpf_parcial} className="flex items-start justify-between gap-3 rounded-lg border border-gray-700/60 bg-gray-900/40 p-3">
                                                <div className="flex items-start gap-3">
                                                    <UserIcon className="w-5 h-5 text-gray-400" />
                                                    <div>
                                                        <p className="font-medium text-white">{socio.nome_socio}</p>
                                                        <p className="text-sm text-gray-400">{socio.qualificacao}</p>
                                                        <p className="text-xs text-gray-400">CPF: {cpfLabel}</p>
                                                        {!socio.cpf_completo && (
                                                            <p className="text-xs italic text-amber-300/80">Informe o CPF completo para habilitar pesquisas avançadas.</p>
                                                        )}
                                                        {birthdayLabel ? (
                                                            <p className="text-xs text-gray-300">
                                                                Aniversário: {birthdayLabel}
                                                            </p>
                                                        ) : (
                                                            <p className="text-xs text-gray-500 italic">
                                                                Sem data de aniversário cadastrada
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSocio(socio)}
                                                    className="rounded-md border border-indigo-500/50 px-3 py-1 text-xs font-semibold text-indigo-300 transition hover:border-indigo-400 hover:text-indigo-200"
                                                >
                                                    Atualizar dados
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <p className="text-gray-500">Quadro societário não informado.</p>}
                        </div>
                    </div>
                );
        }
    };


    return (
        <>
            <div className="space-y-6">
                <button onClick={() => navigate('Prospecção')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4">
                    <ArrowLeftIcon className="h-4 w-4" />
                    Voltar para Prospecção
                </button>
                
                {/* Header */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-white">{empresaData.nome_fantasia}</h1>
                            <p className="text-lg text-gray-400">{empresaData.razao_social}</p>
                        </div>
                        <span className={`text-sm font-semibold px-3 py-1 rounded-full whitespace-nowrap ${getStatusColor(empresaData.situacao_cadastral)}`}>
                            {empresaData.situacao_cadastral}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                
                {/* Content */}
                <div className="mt-6">
                    {renderContent()}
                </div>

            </div>
            {editingSocio && (
                <EditSocioModal
                    socio={editingSocio}
                    onClose={() => setEditingSocio(null)}
                    onUpdated={handleSocioUpdated}
                />
            )}
        </>
    );
};

export default EmpresaDetalhe;
