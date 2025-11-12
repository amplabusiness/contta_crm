import React, { useState } from 'react';
import { Socio } from '../types.ts';
import { updateSocioData } from '../services/apiService.ts';
import { XIcon, CalendarIcon } from './icons/Icons.tsx';

interface EditSocioModalProps {
    socio: Socio;
    onClose: () => void;
    onUpdated: (updated: Socio) => void;
}

const toDateInputValue = (value?: string | null): string => {
    if (!value) {
        return '';
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    return '';
};

const digitsOnly = (value: string): string => value.replace(/[^0-9]/g, '');

const formatCpf = (value: string): string => {
    const digits = digitsOnly(value).slice(0, 11);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const EditSocioModal: React.FC<EditSocioModalProps> = ({ socio, onClose, onUpdated }) => {
    const [birthdate, setBirthdate] = useState<string>(() => toDateInputValue(socio.data_nascimento));
    const [cpfCompleto, setCpfCompleto] = useState<string>(() => formatCpf(socio.cpf_completo ?? ''));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);

        const cpfDigits = digitsOnly(cpfCompleto);

        if (cpfDigits && cpfDigits.length !== 11) {
            setSaving(false);
            setError('Informe um CPF completo com 11 dígitos.');
            return;
        }

        try {
            const updated = await updateSocioData({
                cpfParcial: socio.cpf_parcial,
                dataNascimento: birthdate ? birthdate : null,
                nomeSocio: socio.nome_socio,
                cpfCompleto: cpfDigits ? cpfDigits : null,
            });

            onUpdated({
                ...socio,
                nome_socio: updated.nome_socio ?? socio.nome_socio,
                data_nascimento: updated.data_nascimento ?? null,
                cpf_completo: updated.cpf_completo ?? null,
            });
            onClose();
        } catch (err: any) {
            const message = err?.message ?? 'Falha ao atualizar dados do sócio.';
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !saving) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
            onClick={handleOverlayClick}
        >
            <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 shadow-2xl" role="dialog" aria-modal="true">
                <div className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
                    <div className="flex items-center gap-2 text-white">
                        <CalendarIcon className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold">Editar aniversário</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
                        aria-label="Fechar"
                        disabled={saving}
                    >
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">
                    <div>
                        <p className="text-sm text-gray-400">Sócio</p>
                        <p className="text-base font-medium text-white">{socio.nome_socio}</p>
                        <p className="text-xs text-gray-500">CPF parcial: {socio.cpf_parcial}</p>
                    </div>
                    <div>
                        <label htmlFor="cpfCompleto" className="block text-sm font-medium text-gray-300">
                            CPF completo
                        </label>
                        <input
                            id="cpfCompleto"
                            name="cpfCompleto"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={cpfCompleto}
                            onChange={(event) => setCpfCompleto(formatCpf(event.target.value))}
                            placeholder="000.000.000-00"
                            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            maxLength={14}
                            disabled={saving}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Informe os 11 dígitos do CPF (somente números). Se não informado, será usado o valor parcial.
                        </p>
                        <button
                            type="button"
                            onClick={() => setCpfCompleto('')}
                            className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-200"
                            disabled={saving || !cpfCompleto}
                        >
                            Limpar CPF
                        </button>
                    </div>
                    <div>
                        <label htmlFor="birthdate" className="block text-sm font-medium text-gray-300">
                            Data de nascimento
                        </label>
                        <input
                            id="birthdate"
                            name="birthdate"
                            type="date"
                            value={birthdate}
                            onChange={(event) => setBirthdate(event.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            max={new Date().toISOString().split('T')[0]}
                            disabled={saving}
                        />
                        <button
                            type="button"
                            onClick={() => setBirthdate('')}
                            className="mt-2 text-xs font-medium text-indigo-400 hover:text-indigo-200"
                            disabled={saving || !birthdate}
                        >
                            Limpar data
                        </button>
                    </div>
                    {error && (
                        <p className="rounded-md border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
                            {error}
                        </p>
                    )}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-60"
                            disabled={saving}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                            disabled={saving}
                        >
                            {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSocioModal;
