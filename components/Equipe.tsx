import React, { useState, useEffect, useCallback } from 'react';
import { fetchTeamMembers, fetchDeals } from '../services/apiService.ts';
import { fetchLatestEmails, isUserSignedIn, handleSignIn, initGoogleClient } from '../services/googleApiService.ts';
import { TeamMember, EmailActivity, Deal } from '../types.ts';
import { UsersIcon, InboxIcon } from './icons/Icons.tsx';

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center p-10 text-center text-gray-400">
        <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">{message}</p>
    </div>
);

const Equipe: React.FC = () => {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [activities, setActivities] = useState<EmailActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Team Members List */}
                <div className="lg:col-span-1 bg-gray-800/50 border border-gray-700/50 rounded-xl shadow-lg p-6 space-y-4">
                    <h2 className="text-lg font-semibold text-white">Membros da Equipe</h2>
                    {team.map(member => (
                        <div key={member.id} className="flex items-center gap-4">
                            <img
                                src={`https://ui-avatars.com/api/?name=${member.name.replace(' ', '+')}&background=random`}
                                alt={member.name}
                                className="w-10 h-10 rounded-full"
                            />
                            <div>
                                <p className="font-semibold text-white">{member.name}</p>
                                <p className="text-xs text-gray-400">{member.email}</p>
                            </div>
                        </div>
                    ))}
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
        </div>
    );
};

export default Equipe;
