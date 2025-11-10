import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchTasks, updateTask, deleteTask, addTask, fetchDeals } from '../services/apiService.ts';
import { createCalendarEvent } from '../services/googleApiService.ts';
import { Task, TaskStatus, GoogleCalendarEvent, Deal } from '../types.ts';
import { TasksIcon, ClockIcon, SearchIcon, TrashIcon, CalendarIcon, CheckCircleIcon, XIcon } from './icons/Icons.tsx';
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

interface TaskFormValues {
    title: string;
    dueDate: string;
    priority: Task['priority'];
    status: TaskStatus;
    relatedDealId: string;
    description: string;
}

const defaultFormValues: TaskFormValues = {
    title: '',
    dueDate: '',
    priority: 'Média',
    status: 'A Fazer',
    relatedDealId: '',
    description: '',
};

const formatDateForInput = (value: string | null): string => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toISOString().slice(0, 10);
};

interface TaskFormModalProps {
    open: boolean;
    mode: 'create' | 'edit';
    submitting: boolean;
    error: string | null;
    deals: Deal[];
    initialValues: TaskFormValues;
    onClose: () => void;
    onSubmit: (values: TaskFormValues) => Promise<void>;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ open, mode, submitting, error, deals, initialValues, onClose, onSubmit }) => {
    const [values, setValues] = useState<TaskFormValues>(initialValues);

    // Reset form when modal opens with new initial values
    const prevOpenRef = React.useRef(open);
    React.useEffect(() => {
        if (open && !prevOpenRef.current) {
            // Modal just opened - reset form
            setValues(initialValues);
        }
        prevOpenRef.current = open;
    }, [open, initialValues]);

    if (!open) {
        return null;
    }

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setValues((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!values.title.trim()) {
            setValues((current) => ({ ...current, title: current.title.trim() }));
            return;
        }
        await onSubmit({ ...values, title: values.title.trim() });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-2xl rounded-lg bg-gray-900 border border-gray-700 shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white">
                        {mode === 'create' ? 'Nova Tarefa' : 'Editar Tarefa'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 hover:text-white hover:bg-gray-800"
                        aria-label="Fechar formulário"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm text-gray-300">
                            Título
                            <input
                                name="title"
                                value={values.title}
                                onChange={handleChange}
                                required
                                maxLength={140}
                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-300">
                            Data de vencimento
                            <input
                                type="date"
                                name="dueDate"
                                value={values.dueDate}
                                onChange={handleChange}
                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </label>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="flex flex-col gap-2 text-sm text-gray-300">
                            Prioridade
                            <select
                                name="priority"
                                value={values.priority}
                                onChange={handleChange}
                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="Alta">Alta</option>
                                <option value="Média">Média</option>
                                <option value="Baixa">Baixa</option>
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-300">
                            Status
                            <select
                                name="status"
                                value={values.status}
                                onChange={handleChange}
                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {taskStatuses.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm text-gray-300">
                            Negócio relacionado
                            <select
                                name="relatedDealId"
                                value={values.relatedDealId}
                                onChange={handleChange}
                                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Nenhum</option>
                                {deals
                                    .slice()
                                    .sort((a, b) => a.companyName.localeCompare(b.companyName))
                                    .map((deal) => (
                                        <option key={deal.id} value={deal.id}>{deal.companyName}</option>
                                    ))}
                            </select>
                        </label>
                    </div>
                    <label className="flex flex-col gap-2 text-sm text-gray-300">
                        Descrição
                        <textarea
                            name="description"
                            value={values.description}
                            onChange={handleChange}
                            rows={4}
                            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Detalhes adicionais, próximos passos ou contexto."
                        />
                    </label>
                    {error && (
                        <div className="rounded-lg border border-red-500/40 bg-red-900/30 px-4 py-2 text-sm text-red-300">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-3 pt-2 md:flex-row md:justify-end">
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
                            className="rounded-lg bg-indigo-600/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 disabled:opacity-60"
                        >
                            {submitting ? 'Salvando...' : mode === 'create' ? 'Criar tarefa' : 'Salvar alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TaskCard: React.FC<{ task: Task; onDelete: (taskId: string) => Promise<void>; onUpdate: (task: Task) => void; onEdit: (task: Task) => void; }> = ({ task, onDelete, onUpdate, onEdit }) => {
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
                <button
                    onClick={() => onEdit(task)}
                    className="w-full mt-2 rounded-md border border-gray-700 bg-transparent py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-gray-800"
                >
                    Editar tarefa
                </button>
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
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'Todos'>('Todos');
    const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'Todas'>('Todas');
    const [deals, setDeals] = useState<Deal[]>([]);
    const [formOpen, setFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [tasksData, dealsData] = await Promise.all([
                    fetchTasks(),
                    fetchDeals().catch((dealError) => {
                        console.warn('Falha ao carregar negócios para formulário de tarefas.', dealError);
                        return [] as Deal[];
                    }),
                ]);
                setTasks(tasksData);
                setDeals(dealsData);
                setError(null);
            } catch (err) {
                setError('Falha ao carregar as tarefas. Tente recarregar a página.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
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
            && (statusFilter === 'Todos' || task.status === statusFilter)
            && (priorityFilter === 'Todas' || task.priority === priorityFilter)
        );
    }, [tasks, searchTerm, statusFilter, priorityFilter]);

    const handleOpenCreate = () => {
        setEditingTask(null);
        setFormMode('create');
        setFormError(null);
        setFormOpen(true);
    };

    const handleOpenEdit = (task: Task) => {
        setEditingTask(task);
        setFormMode('edit');
        setFormError(null);
        setFormOpen(true);
    };

    const currentFormValues: TaskFormValues = useMemo(() => (
        editingTask
            ? {
                title: editingTask.title,
                dueDate: formatDateForInput(editingTask.dueDate),
                priority: editingTask.priority,
                status: editingTask.status,
                relatedDealId: editingTask.relatedDealId ?? '',
                description: editingTask.description ?? '',
            }
            : { ...defaultFormValues }
    ), [editingTask, formMode, formOpen]);

    const handleFormSubmit = async (values: TaskFormValues) => {
        try {
            setFormSubmitting(true);
            setFormError(null);

            if (formMode === 'edit' && editingTask) {
                const updates: Partial<Task> & { relatedDealId?: string | null } = {
                    title: values.title,
                    dueDate: values.dueDate ? values.dueDate : null,
                    priority: values.priority,
                    status: values.status,
                    description: values.description ? values.description : null,
                    relatedDealId: values.relatedDealId ? values.relatedDealId : null,
                };

                const updated = await updateTask(editingTask.id, updates as Partial<Task>);
                setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
            } else {
                const relatedDeal = values.relatedDealId ? deals.find((deal) => deal.id === values.relatedDealId) : null;
                const payload: Partial<Omit<Task, 'id' | 'createdAt'>> = {
                    title: values.title,
                    dueDate: values.dueDate ? values.dueDate : null,
                    priority: values.priority,
                    status: values.status,
                    description: values.description ? values.description : null,
                    relatedDealId: values.relatedDealId || undefined,
                    relatedDealName: relatedDeal?.companyName ?? 'N/A',
                };

                const created = await addTask(payload as Omit<Task, 'id' | 'createdAt'>);
                setTasks((current) => [created, ...current]);
            }

            setFormOpen(false);
            setEditingTask(null);
        } catch (err) {
            console.error('Falha ao salvar tarefa', err);
            setFormError('Não foi possível salvar a tarefa. Tente novamente.');
        } finally {
            setFormSubmitting(false);
        }
    };

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
            
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar tarefa por título..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-64 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'Todos')}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Filtrar tarefas por status"
                    >
                        <option value="Todos">Status: Todos</option>
                        {taskStatuses.map((status) => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as Task['priority'] | 'Todas')}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Filtrar tarefas por prioridade"
                    >
                        <option value="Todas">Prioridade: Todas</option>
                        {Object.keys(priorityConfig).map((priority) => (
                            <option key={priority} value={priority}>{priority}</option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="rounded-lg bg-indigo-600/80 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                >
                    Nova tarefa
                </button>
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
                                    <TaskCard key={task.id} task={task} onDelete={handleDeleteTask} onUpdate={handleUpdateTask} onEdit={handleOpenEdit} />
                                ))
                            }
                        </div>
                    </div>
                ))}
            </div>

            <TaskFormModal
                open={formOpen}
                mode={formMode}
                submitting={formSubmitting}
                error={formError}
                deals={deals}
                initialValues={currentFormValues}
                onClose={() => {
                    if (!formSubmitting) {
                        setFormOpen(false);
                        setEditingTask(null);
                    }
                }}
                onSubmit={handleFormSubmit}
            />
        </div>
    );
};

export default Tarefas;