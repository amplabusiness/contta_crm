

import React, { useState, useCallback, useRef } from 'react';
// FIX: Added file extensions to import paths.
import { ReportType } from '../types.ts';
import { fetchMockDataForReport } from '../services/apiService.ts';
import {
  generateNetworkReport,
  generateTerritorialReport,
  generatePerformanceReport,
} from '../services/geminiService.ts';
import { NetworkIcon, MapIcon, GiftIcon, SparkleIcon, DownloadIcon } from './icons/Icons.tsx';

// This is needed because jspdf and html2canvas are loaded from a CDN
declare var jspdf: any;
declare var html2canvas: any;

interface ReportGenerationModalProps {
  onClose: () => void;
}

const reportOptions = [
  {
    type: 'network' as ReportType,
    title: 'Rede de Relacionamentos',
    description: 'Analisa os vínculos societários para encontrar oportunidades de cross-selling.',
    icon: NetworkIcon,
  },
  {
    type: 'territorial' as ReportType,
    title: 'Mercado Territorial',
    description: 'Mapeia a densidade de prospects para otimizar a prospecção geográfica.',
    icon: MapIcon,
  },
  {
    type: 'performance' as ReportType,
    title: 'Performance do Programa',
    description: 'Avalia o ROI e o engajamento do programa de indicações.',
    icon: GiftIcon,
  },
];

const ReportGenerationModal: React.FC<ReportGenerationModalProps> = ({ onClose }) => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const reportContentRef = useRef<HTMLDivElement>(null);

  const generatePdf = async (reportHtml: string, reportTitle: string) => {
    if (!reportContentRef.current) return;
    setStatusMessage('Formatando PDF...');
    
    // Set the content
    reportContentRef.current.innerHTML = `
      <div class="p-8 bg-white text-gray-800 font-sans">
        <div class="flex justify-between items-center border-b-2 border-gray-200 pb-4">
          <h1 class="text-2xl font-bold text-gray-900">Contta CRM</h1>
          <h2 class="text-xl font-semibold text-indigo-600">${reportTitle}</h2>
        </div>
        <div class="mt-6 text-sm report-body">${reportHtml}</div>
        <div class="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
          Relatório gerado em ${new Date().toLocaleString('pt-BR')} por Contta CRM para Ampla Contabilidade.
        </div>
      </div>
    `;

    // Ensure images are loaded before rendering canvas
    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(reportContentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;
    const imgWidth = pdfWidth;
    const imgHeight = imgWidth / ratio;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save(`${reportTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateReport = useCallback(async (reportType: ReportType) => {
    setSelectedReport(reportType);
    setLoading(true);
    setError('');
    
    try {
      setStatusMessage('Buscando dados relevantes...');
      const data = await fetchMockDataForReport(reportType);

      setStatusMessage('IA está gerando a análise...');
      let reportHtml = '';
      const reportTitle = reportOptions.find(r => r.type === reportType)?.title || 'Relatório';

      switch (reportType) {
        case 'network':
          reportHtml = await generateNetworkReport(data.networkData);
          break;
        case 'territorial':
          reportHtml = await generateTerritorialReport(data.territorialData);
          break;
        case 'performance':
          reportHtml = await generatePerformanceReport(data.performanceData.status, data.performanceData.indicacoes);
          break;
      }
      
      await generatePdf(reportHtml, reportTitle);
      
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      console.error(err);
    } finally {
      setLoading(false);
      setStatusMessage('');
      setSelectedReport(null);
    }
  }, []);

  return (
    <div
      className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700/50 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700/50">
          <h2 className="text-xl font-bold text-white">Gerar Relatório Executivo</h2>
          <p className="text-sm text-gray-400">Selecione o tipo de relatório que a IA deve gerar.</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <SparkleIcon className="w-12 h-12 text-indigo-400 animate-spin"/>
                <p className="mt-4 text-lg font-semibold text-white">Gerando Relatório...</p>
                <p className="text-sm text-gray-400">{statusMessage}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reportOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleGenerateReport(opt.type)}
                  className="flex flex-col items-center p-6 text-center bg-gray-900/50 border border-gray-700 rounded-lg hover:bg-indigo-600/20 hover:border-indigo-500 transition-all duration-200"
                >
                  <opt.icon className="w-10 h-10 mb-3 text-indigo-400" />
                  <h3 className="font-semibold text-white">{opt.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{opt.description}</p>
                </button>
              ))}
            </div>
          )}
          {error && <p className="text-center text-sm text-red-400 mt-4">{error}</p>}
        </div>
        
        <div className="p-4 bg-gray-900/50 border-t border-gray-700/50 text-right rounded-b-xl">
          <button
            onClick={onClose}
            className="bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
      {/* Hidden div for rendering report content for PDF conversion */}
      <div ref={reportContentRef} className="fixed -left-[9999px] top-0 w-[800px] z-0"></div>
    </div>
  );
};

export default ReportGenerationModal;