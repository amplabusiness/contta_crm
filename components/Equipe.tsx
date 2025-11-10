import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchTeamMembers, fetchDeals, addTeamMember, updateTeamMemberStatus } from '../services/apiService.ts';
import { fetchLatestEmails, isUserSignedIn, handleSignIn, initGoogleClient } from '../services/googleApiService.ts';
import { supabase } from '../services/supabaseClient.ts';
import { TeamMember, EmailActivity, Deal, UserRole } from '../types.ts';
import { UsersIcon, InboxIcon, SparkleIcon, XIcon, CheckCircleIcon } from './icons/Icons.tsx';

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">{message}</p>
    </div>
);

interface AddMemberModalProps {
    open: boolean;
    submitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (payload: { name: string; email: string; role: UserRole; status: 'Ativo' | 'Inativo' }) => Promise<void>;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ open, submitting, error, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('User');

    useEffect(() => {
        if (!open) {
            // Reset form when modal closes (run after render)
            const timer = setTimeout(() => {
                setName('');
                setEmail('');
                setRole('User');
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [open]);

    if (!open) {
        return null;
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await onSubmit({ name: name.trim(), email: email.trim().toLowerCase(), role, status: 'Ativo' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                    <div className="flex items-center gap-2 text-white">
                        <SparkleIcon className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold">Adicionar novo membro</h2>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-800 hover:text-white" aria-label="Fechar formulário">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
                    <div>
                        <label htmlFor="member-name" className="block text-sm font-medium text-gray-300">Nome completo</label>
                        <input
                            id="member-name"
                            name="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                            maxLength={120}
                            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="member-email" className="block text-sm font-medium text-gray-300">E-mail corporativo</label>
                        <input
                            id="member-email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            maxLength={140}
                            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="member-role" className="block text-sm font-medium text-gray-300">Permissão inicial</label>
                        <select
                            id="member-role"
                            name="role"
                            value={role}
                            onChange={(event) => setRole(event.target.value as UserRole)}
                            className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="User">Usuário</option>
                            <option value="Admin">Administrador</option>
                        </select>
                    </div>
                    {error && (
                        <div className="rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/70 border-t-transparent" aria-hidden="true"></span>}
                            {submitting ? 'Adicionando...' : 'Adicionar membro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Equipe: React.FC = () => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [activities, setActivities] = useState<EmailActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [resolvingUser, setResolvingUser] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addSubmitting, setAddSubmitting] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    const [gapiReady, setGapiReady] = useState(false);
    const [signedIn, setSignedIn] = useState(false);

    const updateAuthStatus = useCallback(() => {
        setSignedIn(isUserSignedIn());
    }, []);

    useEffect(() => {
        initGoogleClient(() => {
            setGapiReady(true);
            updateAuthStatus();
        });
    }, [updateAuthStatus]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [teamData, dealsData] = await Promise.all([
                    fetchTeamMembers(),
                    fetchDeals(),
                ]);
                setTeam(teamData);
                setDeals(dealsData);
            } catch (err) {
                setError('Falha ao carregar os dados da equipe.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const resolveCurrentUser = async () => {
            try {
                setResolvingUser(true);
                const { data, error: userError } = await supabase.auth.getUser();
                if (userError) {
                    console.warn('Falha ao obter usuário autenticado.', userError);
                    setCurrentUserId(null);
                    return;
                }
                setCurrentUserId(data?.user?.id ?? null);
            } catch (resolveError) {
                console.warn('Erro inesperado ao identificar o usuário atual.', resolveError);
                setCurrentUserId(null);
            } finally {
                setResolvingUser(false);
            }
        };

        resolveCurrentUser();
    }, []);

    const handleSyncActivities = useCallback(async () => {
        if (!signedIn) {
            handleSignIn();
            return;
        }
        setSyncing(true);
        setError(null);
        try {
            const allActivities = await fetchLatestEmails(deals, team);
            setActivities(allActivities);
        } catch (err) {
            setError('Falha ao sincronizar atividades da equipe. Tente fazer login no Google novamente.');
            console.error(err);
        } finally {
            setSyncing(false);
        }
    }, [deals, team, signedIn]);
    
    useEffect(() => {
        if (signedIn && deals.length > 0 && team.length > 0 && activities.length === 0) {
            handleSyncActivities();
        }
    }, [signedIn, deals, team, activities.length, handleSyncActivities]);

    const currentUser = useMemo(() => team.find((member) => member.id === currentUserId) ?? null, [team, currentUserId]);
    const canManageTeam = currentUser?.role === 'Admin';

    const handleToggleStatus = async (memberId: string, currentStatus: 'Ativo' | 'Inativo') => {
        if (!canManageTeam) {
            return;
        }
        const nextStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
        const previousTeam = [...team];
        setTeam((members) => members.map((member) => (member.id === memberId ? { ...member, status: nextStatus } : member)));
        try {
            await updateTeamMemberStatus(memberId, nextStatus);
            setActionError(null);
        } catch (updateError) {
            console.error('Falha ao atualizar status do membro.', updateError);
            setTeam(previousTeam);
            setActionError('Não foi possível atualizar o status. Tente novamente.');
        }
    };

    const handleAddMember = async (payload: { name: string; email: string; role: UserRole; status: 'Ativo' | 'Inativo' }) => {
        if (!canManageTeam) {
            return;
        }
        setAddSubmitting(true);
        setAddError(null);
        try {
            const created = await addTeamMember(payload);
            setTeam((members) => [...members, created]);
            setIsAddModalOpen(false);
        } catch (addErr) {
            console.error('Falha ao adicionar membro.', addErr);
            setAddError('Não foi possível adicionar o membro. Verifique os dados e tente novamente.');
        } finally {
            setAddSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Carregando dados da equipe..." />;
    if (error) return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <UsersIcon className="w-8 h-8 text-indigo-400" />
                    Equipe & Comunicação
                </h1>
                <p className="mt-1 text-gray-400">
                    Veja os membros da sua equipe e acompanhe as comunicações recentes com os clientes.
                </p>
                {!resolvingUser && !currentUser && (
                    <p className="mt-2 text-sm text-amber-300/90">Entre na conta para gerenciar permissões da equipe.</p>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Team Members List */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Membros da Equipe</h2>
                            {canManageTeam && (
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                                >
                                    <SparkleIcon className="w-4 h-4" />
                                    Novo membro
                                </button>
                            )}
                        </div>
                        {actionError && (
                            <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-xs text-red-200">{actionError}</div>
                        )}
                        {team.map((member) => {
                            const isCurrent = member.id === currentUserId;
                            const statusBadgeClasses = member.status === 'Ativo'
                                ? 'bg-green-500/15 text-green-300 border border-green-500/30'
                                : 'bg-red-500/15 text-red-300 border border-red-500/30';

                            return (
                                <div key={member.id} className="rounded-lg border border-gray-700/40 bg-gray-900/40 px-4 py-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex gap-3">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                                alt={member.name}
                                                className="h-10 w-10 rounded-full border border-gray-700"
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-white">{member.name}</p>
                                                    {isCurrent && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-semibold text-indigo-200">
                                                            <CheckCircleIcon className="h-3 w-3" />
                                                            Você
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400">{member.email}</p>
                                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-700/60 px-2 py-0.5 text-gray-200">
                                                        {member.role === 'Admin' ? 'Administrador' : 'Usuário'}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${statusBadgeClasses}`}>
                                                        {member.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        {canManageTeam && !isCurrent && (
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(member.id, member.status)}
                                                className="text-xs font-semibold text-indigo-200 hover:text-white"
                                            >
                                                {member.status === 'Ativo' ? 'Desativar' : 'Reativar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Communication Feed */}
                <div className="lg:col-span-2 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6">
                     <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <InboxIcon className="w-6 h-6 text-indigo-400" />
                            Comunicações Recentes
                        </h2>
                        {gapiReady && (
                            <button onClick={handleSyncActivities} disabled={syncing} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                                {syncing ? 'Sincronizando...' : (signedIn ? 'Atualizar E-mails' : 'Conectar ao Google')}
                            </button>
                        )}
                    </div>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {syncing && <p className="text-center text-gray-400">Buscando e-mails recentes...</p>}
                        {!syncing && !signedIn && (
                            <div className="text-center py-10 text-gray-500">
                                <p>Conecte sua conta do Google para ver os e-mails da equipe.</p>
                            </div>
                        )}
                        {!syncing && signedIn && activities.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                <p>Nenhuma atividade de e-mail recente encontrada.</p>
                            </div>
                        )}
                        {activities.map(activity => (
                             <div key={activity.id} className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-indigo-500">
                                 <div className="flex justify-between items-center">
                                     <p className="text-sm font-semibold text-white">{activity.subject}</p>
                                     <p className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString('pt-BR')}</p>
                                 </div>
                                 <p className="text-xs text-gray-400 mt-1">
                                     De: <span className="font-medium text-gray-300">{activity.from}</span> |
                                     Para: <span className="font-medium text-gray-300">{activity.to}</span>
                                 </p>
                                  <p className="text-xs mt-2">
                                     <span className="text-gray-500">Membro: </span>
                                     <span className="font-semibold text-gray-300">{activity.teamMemberName}</span> | 
                                     <span className="text-gray-500"> Negócio: </span>
                                     <span className="font-semibold text-indigo-300">{activity.relatedDealName}</span>
                                 </p>
                             </div>
                        ))}
                    </div>
                </div>
            </div>

            <AddMemberModal
                open={isAddModalOpen && canManageTeam}
                submitting={addSubmitting}
                error={addError}
                onClose={() => {
                    if (!addSubmitting) {
                        setIsAddModalOpen(false);
                        setAddError(null);
                    }
                }}
                onSubmit={handleAddMember}
            />
        </div>
    );
};

export default Equipe;
