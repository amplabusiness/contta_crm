import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTasks, updateTask, deleteTask } from '../services/apiService.ts';
import { createCalendarEvent } from '../services/googleApiService.ts';
import { Task, TaskStatus, GoogleCalendarEvent } from '../types.ts';
import { TasksIcon, ClockIcon, SearchIcon, TrashIcon, CalendarIcon, CheckCircleIcon } from './icons/Icons.tsx';
import Tooltip from './Tooltip.tsx';

const taskStatuses: TaskStatus[] = ['A Fazer', 'Em Andamento', 'Concluída'];

const statusConfig: Record<TaskStatus, { title: string; color: string; }> = {
    'A Fazer': { title: 'A Fazer', color: 'border-t-yellow-500' },
    'Em Andamento': { title: 'Em Andamento', color: 'border-t-blue-500' },
    'Concluída': { title: 'Concluída', color: 'border-t-green-500' },
};

const priorityConfig: Record<Task['priority'], { label: string; color: string }> = {
    'Alta': { label: 'Alta', color: 'bg-red-500' },
    'Média': { label: 'Média', color: 'bg-yellow-500' },
    'Baixa': { label: 'Baixa', color: 'bg-gray-500' },
}

const LoadingState: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full py-20">
        <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const TaskCard: React.FC<{ task: Task; onDelete: (taskId: string) => Promise<void>, onUpdate: (task: Task) => void; }> = ({ task, onDelete, onUpdate }) => {
    const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDateObj ? dueDateObj < new Date() && task.status !== 'Concluída' : false;
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSyncToCalendar = useCallback(async () => {
        setIsSyncing(true);
        setSyncError('');
        try {
            if (!task.dueDate) {
                throw new Error('Defina uma data de vencimento antes de sincronizar com a Agenda.');
            }
            const event: GoogleCalendarEvent = {
                summary: task.title,
                description: `Tarefa do Contta CRM relacionada ao negócio: ${task.relatedDealName}. Detalhes: ${task.description || ''}`,
                start: { date: task.dueDate },
                end: { date: task.dueDate },
            };
            const createdEvent = await createCalendarEvent(event);
            const updatedTask = await updateTask(task.id, { googleCalendarEventId: createdEvent.id });
            onUpdate(updatedTask);
        } catch (error: any) {
            console.error("Failed to sync with Google Calendar", error);
            setSyncError(error.message || 'Falha ao sincronizar.');
        } finally {
            setIsSyncing(false);
        }
    }, [task, onUpdate]);

    const handleDelete = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setIsDeleting(true);
        try {
            await onDelete(task.id);
        } finally {
            setIsDeleting(false);
        }
    }, [onDelete, task.id]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700/80 shadow-md group relative flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start">
                    <p className="font-semibold text-white pr-8">{task.title}</p>
                    <Tooltip text={`Prioridade: ${priorityConfig[task.priority].label}`}>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${priorityConfig[task.priority].color}`}></div>
                    </Tooltip>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className={`absolute top-3 right-3 p-1 rounded-full text-gray-500 hover:bg-red-900/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ${isDeleting ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
                    aria-label="Excluir tarefa"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
                <p className="text-xs text-indigo-300 mt-1">
                    Relacionado a: <span className="font-medium">{task.relatedDealName}</span>
                </p>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3">
                <div className={`text-xs flex items-center ${isOverdue ? 'text-red-400 font-bold' : 'text-gray-400'}`}>
                    <ClockIcon className="w-4 h-4 mr-2"/>
                    <span>Vencimento: {dueDateObj ? dueDateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Sem data definida'}</span>
                </div>
                <div>
                    {task.googleCalendarEventId ? (
                        <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/30 py-1.5 px-3 rounded-md">
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>Sincronizado com Google Agenda</span>
                        </div>
                    ) : (
                        <button 
                            onClick={handleSyncToCalendar}
                            disabled={isSyncing}
                            className="w-full flex items-center justify-center gap-2 text-xs bg-gray-700/50 text-gray-300 font-semibold py-1.5 px-3 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                           <CalendarIcon className="w-4 h-4" />
                           {isSyncing ? 'Sincronizando...' : 'Adicionar ao Google Agenda'}
                        </button>
                    )}
                    {syncError && <p className="text-xs text-red-400 mt-1">{syncError}</p>}
                </div>
            </div>
        </div>
    );
};

const Tarefas: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadTasks = async () => {
            try {
                setLoading(true);
                const tasksData = await fetchTasks();
                setTasks(tasksData);
                setError(null);
            } catch (err) {
                setError('Falha ao carregar as tarefas. Tente recarregar a página.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadTasks();
    }, []);
    
    const handleDeleteTask = useCallback(async (taskId: string) => {
        try {
            setActionError(null);
            await deleteTask(taskId);
            setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
        } catch (err) {
            console.error('Falha ao excluir a tarefa', err);
            setActionError('Falha ao excluir a tarefa. Tente novamente.');
        }
    }, []);
    
    const handleUpdateTask = (updatedTask: Task) => {
        setTasks(currentTasks => currentTasks.map(task => task.id === updatedTask.id ? updatedTask : task));
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(task =>
            task.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tasks, searchTerm]);

    if (loading) return <LoadingState />;
    if (error) return <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <TasksIcon className="w-8 h-8 text-indigo-400" />
                    Gerenciador de Tarefas
                </h1>
                <p className="mt-1 text-gray-400">
                    Organize suas atividades e nunca perca um prazo.
                </p>
            </div>

            {actionError && (
                <div className="text-sm text-red-300 bg-red-900/40 border border-red-500/40 rounded-lg px-4 py-2">
                    {actionError}
                </div>
            )}
            
            <div className="mb-4">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar tarefa por título..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                {taskStatuses.map(status => (
                    <div key={status} className="flex-shrink-0 w-80 bg-gray-900/50 rounded-lg flex flex-col">
                        <div className={`p-4 border-t-4 ${statusConfig[status].color} rounded-t-lg`}>
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-white">{statusConfig[status].title}</h3>
                                <span className="text-sm font-bold text-gray-400 bg-gray-700/50 px-2 py-0.5 rounded-full">
                                    {filteredTasks.filter(t => t.status === status).length}
                                </span>
                            </div>
                        </div>
                        <div className="p-2 space-y-3 overflow-y-auto flex-1 bg-gray-800/20 rounded-b-lg">
                           {filteredTasks
                                .filter(t => t.status === status)
                                .sort((a, b) => {
                                    const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
                                    const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
                                    return dateA - dateB;
                                })
                                .map(task => (
                                    <TaskCard key={task.id} task={task} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} />
                                ))
                            }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Tarefas;