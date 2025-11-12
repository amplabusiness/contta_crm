import React, { useState, useEffect, useCallback } from 'react';
import { fetchTeamMembers, fetchDeals, addTeamMember, updateTeamMemberStatus } from '../services/apiService.ts';
import { fetchLatestEmails } from '../services/googleApiService.ts'; // Assuming service account handles auth for admin
import { TeamMember, UserRole, EmailActivity, Deal } from '../types.ts';
import { CogIcon, UsersIcon, SparkleIcon, InboxIcon } from './icons/Icons.tsx';

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">{message}</p>
    </div>
);

const AddMemberModal: React.FC<{ onClose: () => void; onAddMember: (member: Omit<TeamMember, 'id' | 'lastLogin' | 'emailUsageGB'>) => void; }> = ({ onClose, onAddMember }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>('User');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddMember({ name, email, role, status: 'Ativo' });
        onClose();
    };

    return (
         <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-white">Adicionar Novo Membro</h2>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nome</label>
                                <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email</label>
                                <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500" />
                            </div>
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-300">Função</label>
                                <select id="role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500">
                                    <option value="User">Usuário</option>
                                    <option value="Admin">Administrador</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600">Cancelar</button>
                        <button type="submit" className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500">Adicionar Membro</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Admin: React.FC = () => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activities, setActivities] = useState<EmailActivity[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [teamData, dealsData] = await Promise.all([
                    fetchTeamMembers(),
                    fetchDeals()
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

    const handleRoleChange = (memberId: string, newRole: UserRole) => {
        setTeam(team.map(member => member.id === memberId ? { ...member, role: newRole } : member));
        console.log(`User ${memberId} role changed to ${newRole} (simulation).`);
    };
    
    const handleStatusChange = async (memberId: string, currentStatus: 'Ativo' | 'Inativo') => {
        const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
        const originalTeam = [...team];
        setTeam(team.map(member => member.id === memberId ? { ...member, status: newStatus } : member));
        try {
            await updateTeamMemberStatus(memberId, newStatus);
        } catch (error) {
            console.error("Failed to update status", error);
            setError("Falha ao atualizar status do membro.");
            setTeam(originalTeam); // Revert on failure
        }
    };

    const handleAddMember = async (memberData: Omit<TeamMember, 'id' | 'lastLogin' | 'emailUsageGB'>) => {
        try {
            const newMember = await addTeamMember(memberData);
            setTeam([...team, newMember]);
        } catch (error) {
            console.error("Failed to add member", error);
            setError("Falha ao adicionar novo membro.");
        }
    };


    const handleSyncActivities = useCallback(async () => {
        setSyncing(true);
        setError(null);
        try {
            const allActivities = await fetchLatestEmails(deals, team);
            setActivities(allActivities);
        } catch (err) {
            setError('Falha ao sincronizar atividades da equipe.');
            console.error(err);
        } finally {
            setSyncing(false);
        }
    }, [deals, team]);

    const filteredActivities = selectedMemberId === 'all'
        ? activities
        : activities.filter(act => team.find(t => t.name === act.teamMemberName)?.id === selectedMemberId);


    if (loading) return <LoadingState message="Carregando painel de administração..." />;
    if (error && !syncing) return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;

    return (
        <>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <CogIcon className="w-8 h-8 text-indigo-400" />
                        Painel de Administração
                    </h1>
                    <p className="mt-1 text-gray-400">
                        Gerencie usuários, permissões e supervisione as atividades da equipe.
                    </p>
                </div>

                {/* Gerenciamento de Usuários */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <UsersIcon className="w-6 h-6" />
                            Gerenciamento de Usuários
                        </h2>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500">
                            Adicionar Membro
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Nome</th>
                                    <th scope="col" className="px-4 py-3">E-mail</th>
                                    <th scope="col" className="px-4 py-3">Função</th>
                                    <th scope="col" className="px-4 py-3">Status</th>
                                    <th scope="col" className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {team.map(member => (
                                    <tr key={member.id} className="border-b border-gray-700/50 hover:bg-gray-800/40">
                                        <td className="px-4 py-3 font-medium text-white">{member.name}</td>
                                        <td className="px-4 py-3">{member.email}</td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={member.role}
                                                onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                                                className="bg-gray-700 border border-gray-600 rounded-md p-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                disabled={member.email === 'sergio@amplabusiness.com.br'}
                                                aria-label={`Alterar função de ${member.name}`}
                                            >
                                                <option value="Admin">Admin</option>
                                                <option value="User">User</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${member.status === 'Ativo' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                                {member.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => handleStatusChange(member.id, member.status)}
                                                className={`text-xs font-medium ${member.status === 'Ativo' ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                                                disabled={member.email === 'sergio@amplabusiness.com.br'}
                                            >
                                                {member.status === 'Ativo' ? 'Desativar' : 'Ativar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Painel de Supervisão */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6">
                    <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <InboxIcon className="w-6 h-6 text-indigo-400" />
                            Linha do Tempo de Comunicação da Equipe
                        </h2>
                         <button onClick={handleSyncActivities} disabled={syncing} className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 disabled:opacity-50">
                            <SparkleIcon className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar Atividades da Equipe'}
                        </button>
                    </div>
                     <div className="mb-4">
                        <label htmlFor="member-filter" className="text-sm text-gray-400 mr-2">Filtrar por membro:</label>
                        <select
                            id="member-filter"
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="all">Toda a Equipe</option>
                            {team.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {syncing && <p className="text-center text-gray-400">Buscando e-mails recentes de toda a equipe...</p>}
                        {!syncing && activities.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                <p>Nenhuma atividade de e-mail encontrada.</p>
                                <p className="text-sm">Clique em &quot;Sincronizar&quot; para buscar as comunicações.</p>
                            </div>
                        )}
                        {filteredActivities.map(activity => (
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
            {isAddModalOpen && <AddMemberModal onClose={() => setIsAddModalOpen(false)} onAddMember={handleAddMember} />}
        </>
    );
};

export default Admin;