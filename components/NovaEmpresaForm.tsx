import React, { useState } from 'react';
import CNPJInput from './CNPJInput';
import { supabase } from '../services/supabaseClient';

interface NovaEmpresaFormProps {
  onSuccess?: (empresa: any) => void;
  onCancel?: () => void;
}

/**
 * Formulário de Nova Empresa com Auto-Complete por CNPJ
 * 
 * Workflow:
 * 1. Usuário digita CNPJ
 * 2. Sistema busca automaticamente dados na CNPJá
 * 3. Formulário é preenchido automaticamente
 * 4. Usuário pode editar campos se necessário
 * 5. Salva como indicação/prospect
 */
export default function NovaEmpresaForm({ onSuccess, onCancel }: NovaEmpresaFormProps) {
  const [formData, setFormData] = useState({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    cnae_principal: '',
    descricao_cnae: '',
    porte_empresa: '',
    situacao_cadastral: '',
    telefone: '',
    email: '',
    observacoes: ''
  });

  const [socios, setSocios] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Callback quando CNPJ é encontrado
  const handleEmpresaLoaded = (empresa: any, sociosData: any[]) => {
    console.log('✅ Empresa carregada:', empresa);
    
    setFormData({
      cnpj: empresa.cnpj,
      razao_social: empresa.razao_social || '',
      nome_fantasia: empresa.nome_fantasia || '',
      cnae_principal: empresa.cnae_principal || '',
      descricao_cnae: empresa.descricao_cnae || '',
      porte_empresa: empresa.porte_empresa || '',
      situacao_cadastral: empresa.situacao_cadastral || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      observacoes: formData.observacoes
    });

    setSocios(sociosData);
    setAutoFilled(true);
  };

  const handleError = (error: string) => {
    console.error('❌ Erro ao buscar CNPJ:', error);
    setAutoFilled(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cnpj || !formData.razao_social) {
      alert('CNPJ e Razão Social são obrigatórios');
      return;
    }

    setSaving(true);

    try {
      // Pegar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Criar indicação
      const { data: indicacao, error: indicacaoError } = await supabase
        .from('indicacoes')
        .insert({
          cnpj: formData.cnpj,
          razao_social: formData.razao_social,
          nome_fantasia: formData.nome_fantasia,
          cnae_principal: formData.cnae_principal,
          porte: formData.porte_empresa,
          telefone: formData.telefone,
          email: formData.email,
          observacoes: formData.observacoes,
          status: 'nova',
          usuario_id: user.id,
          fonte: 'cnpj_manual'
        })
        .select()
        .single();

      if (indicacaoError) throw indicacaoError;

      console.log('✅ Indicação criada:', indicacao);

      // Notificar sucesso
      if (onSuccess) {
        onSuccess(indicacao);
      }

      // Limpar formulário
      setFormData({
        cnpj: '',
        razao_social: '',
        nome_fantasia: '',
        cnae_principal: '',
        descricao_cnae: '',
        porte_empresa: '',
        situacao_cadastral: '',
        telefone: '',
        email: '',
        observacoes: ''
      });
      setSocios([]);
      setAutoFilled(false);

      alert('✅ Empresa cadastrada com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      alert('Erro ao salvar empresa. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Nova Empresa</h2>
        <p className="mt-1 text-sm text-gray-600">
          Digite o CNPJ e os dados serão preenchidos automaticamente
        </p>
      </div>

      {/* CNPJ Input com Auto-Complete */}
      <div>
        <CNPJInput
          label="CNPJ"
          required
          onEmpresaLoaded={handleEmpresaLoaded}
          onError={handleError}
        />
      </div>

      {/* Razão Social */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Razão Social <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.razao_social}
          onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Razão social da empresa"
          disabled={!formData.cnpj}
        />
      </div>

      {/* Nome Fantasia */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome Fantasia
        </label>
        <input
          type="text"
          value={formData.nome_fantasia}
          onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Nome fantasia (opcional)"
        />
      </div>

      {/* Grid 2 colunas */}
      <div className="grid grid-cols-2 gap-4">
        {/* CNAE */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNAE Principal
          </label>
          <input
            type="text"
            value={formData.cnae_principal}
            onChange={(e) => setFormData({ ...formData, cnae_principal: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0000-0/00"
          />
        </div>

        {/* Porte */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Porte
          </label>
          <select
            aria-label="Porte da empresa"
            value={formData.porte_empresa}
            onChange={(e) => setFormData({ ...formData, porte_empresa: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Selecione...</option>
            <option value="ME">Microempresa</option>
            <option value="EPP">Pequeno Porte</option>
            <option value="DEMAIS">Demais</option>
          </select>
        </div>
      </div>

      {/* Grid 2 colunas - Contato */}
      <div className="grid grid-cols-2 gap-4">
        {/* Telefone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone
          </label>
          <input
            type="tel"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="(00) 0000-0000"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-mail
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="contato@empresa.com"
          />
        </div>
      </div>

      {/* Descrição CNAE (readonly, apenas exibir) */}
      {formData.descricao_cnae && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Atividade Principal
          </label>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
            {formData.descricao_cnae}
          </p>
        </div>
      )}

      {/* Sócios encontrados */}
      {socios.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sócios Identificados ({socios.length})
          </label>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <ul className="space-y-2">
              {socios.map((socio, idx) => (
                <li key={idx} className="flex items-start text-sm">
                  <svg className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{socio.nome}</p>
                    <p className="text-gray-600">{socio.qualificacao}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações
        </label>
        <textarea
          value={formData.observacoes}
          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Anotações sobre o prospect..."
        />
      </div>

      {/* Auto-filled indicator */}
      {autoFilled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center text-sm text-green-800">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Dados preenchidos automaticamente via CNPJá
          </div>
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 pt-4 border-t">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        )}
        
        <button
          type="submit"
          disabled={saving || !formData.cnpj || !formData.razao_social}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Salvando...
            </span>
          ) : (
            'Salvar Empresa'
          )}
        </button>
      </div>
    </form>
  );
}
