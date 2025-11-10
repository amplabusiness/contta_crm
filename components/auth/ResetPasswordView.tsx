import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient.ts';

interface ResetPasswordViewProps {
  onBackToLogin: () => void;
}

const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!newPassword || !confirmPassword) {
      setFormError('Preencha ambos os campos de senha.');
      return;
    }

    if (newPassword.length < 6) {
      setFormError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('As senhas não coincidem.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setFormError(error.message ?? 'Não foi possível redefinir a senha.');
      } else {
        setSuccess(true);
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          onBackToLogin();
        }, 2000);
      }
    } catch (err: any) {
      setFormError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
        <div className="w-full max-w-md rounded-2xl border border-green-800 bg-gray-900/80 backdrop-blur-sm p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20">
              <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Senha redefinida!</h2>
            <p className="text-gray-400 mb-4">
              Sua senha foi atualizada com sucesso. Você será redirecionado para a tela de login.
            </p>
            <div className="h-1 w-32 bg-green-600/20 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur-sm p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
              🔒
            </span>
            <div>
              <p className="text-sm uppercase tracking-widest text-indigo-400">Contta CRM</p>
              <h1 className="text-2xl font-semibold text-white">Redefinir Senha</h1>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium text-gray-300">
              Nova Senha
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Mínimo 6 caracteres"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
              Confirmar Nova Senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Digite a senha novamente"
              disabled={isSubmitting}
            />
          </div>

          {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : 'Redefinir Senha'}
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full text-sm text-gray-400 hover:text-gray-300 transition"
          >
            Voltar para o login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordView;
