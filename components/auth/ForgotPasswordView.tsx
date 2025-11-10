import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient.ts';

interface ForgotPasswordViewProps {
  onBackToLogin: () => void;
}

const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug: verificar se Supabase está configurado
  React.useEffect(() => {
    console.log('🔧 ForgotPasswordView - Environment Check:');
    console.log('  VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '✅ OK' : '❌ MISSING');
    console.log('  VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ OK' : '❌ MISSING');
    console.log('  Todas as variáveis:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!email) {
      setFormError('Informe seu e-mail.');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError('Digite um e-mail válido.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log('🔑 Enviando email de recuperação para:', email);
      
      // Usar redirectTo conforme documentação Supabase
      const recoveryRedirect = `${window.location.origin}/#type=recovery`;
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: recoveryRedirect,
      });

      console.log('🔗 Redirect configurado:', recoveryRedirect);

      console.log('📊 Resposta completa do Supabase:', { error, data });

      if (error) {
        console.error('❌ Erro do Supabase:', error);
        console.error('❌ Código do erro:', error.status);
        console.error('❌ Detalhes:', JSON.stringify(error, null, 2));
        setFormError(error.message ?? 'Não foi possível enviar o e-mail de recuperação.');
      } else {
        console.log('✅ Email de recuperação enviado com sucesso!');
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('❌ Erro ao enviar email de recuperação:', err);
      setFormError(err.message || 'Erro ao enviar e-mail. Verifique sua conexão e tente novamente.');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">E-mail enviado!</h2>
            <p className="text-gray-400 mb-6">
              Verifique sua caixa de entrada em <strong className="text-white">{email}</strong> e clique no link para redefinir sua senha.
            </p>
            <button
              onClick={onBackToLogin}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
            >
              Voltar para o login
            </button>
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
              🔑
            </span>
            <div>
              <p className="text-sm uppercase tracking-widest text-indigo-400">Contta CRM</p>
              <h1 className="text-2xl font-semibold text-white">Recuperar Senha</h1>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400">
            Digite seu e-mail para receber as instruções de recuperação.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-300">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-gray-100 placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              placeholder="voce@empresa.com"
              disabled={isSubmitting}
            />
          </div>

          {formError ? <p className="text-sm text-rose-400">{formError}</p> : null}

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar E-mail de Recuperação'}
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

export default ForgotPasswordView;
