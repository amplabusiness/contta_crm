

import React, { useState, useCallback } from 'react';
import { editImageWithGemini, fileToBase64 } from '../services/geminiService.ts';
// FIX: Added file extension to import path.
import { ImageIcon, SparkleIcon } from './icons/Icons.tsx';

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setOriginalImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setEditedImage(null);
      setError('');
    }
  };

  const handleGenerateEdit = useCallback(async () => {
    if (!originalImageFile || !prompt) {
      setError('Por favor, carregue uma imagem e insira um comando.');
      return;
    }

    setLoading(true);
    setError('');
    setEditedImage(null);

    try {
      const base64Data = await fileToBase64(originalImageFile);
      const editedBase64 = await editImageWithGemini(base64Data, originalImageFile.type, prompt);
      setEditedImage(`data:${originalImageFile.type};base64,${editedBase64}`);
    } catch (e: any) {
      setError(e.message || 'Ocorreu um erro ao editar a imagem. Tente novamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [originalImageFile, prompt]);
  
  const clearImage = () => {
    setOriginalImage(null);
    setOriginalImageFile(null);
    setEditedImage(null);
    setError('');
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Editor de Imagens com IA</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="space-y-4">
          <div className="bg-gray-800/50 border border-gray-700/50 p-5 rounded-xl">
            <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-2">1. Carregue sua Imagem</label>
            <input id="image-upload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600/20 file:text-indigo-300 hover:file:bg-indigo-600/40 cursor-pointer"/>
          </div>
          
          {originalImage && (
            <div className="bg-gray-800/50 border border-gray-700/50 p-5 rounded-xl">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-semibold text-white">Imagem Original</h3>
                 <button onClick={clearImage} className="text-sm text-red-400 hover:text-red-300">Remover</button>
               </div>
              <img src={originalImage} alt="Original" className="rounded-lg max-h-80 w-auto mx-auto" />
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700/50 p-5 rounded-xl">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">2. Descreva a edição</label>
            <textarea
              id="prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Adicione um filtro retrô, remova o fundo, deixe o céu mais azul..."
              className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleGenerateEdit}
            disabled={loading || !originalImageFile || !prompt}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors duration-200 disabled:bg-indigo-800/50 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <SparkleIcon className="w-5 h-5" />
            {loading ? 'Gerando...' : 'Gerar Edição'}
          </button>
           {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 p-5 rounded-xl flex flex-col items-center justify-center min-h-[400px]">
          <h3 className="text-lg font-semibold text-white mb-4 w-full text-center lg:text-left">Imagem Editada</h3>
          <div className="flex-grow flex items-center justify-center w-full">
            {loading && (
              <div className="text-center">
                <SparkleIcon className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
                <p className="mt-4 text-gray-400">Editando sua imagem...</p>
              </div>
            )}
            {!loading && editedImage && (
              <img src={editedImage} alt="Edited" className="rounded-lg max-h-96 w-auto" />
            )}
            {!loading && !editedImage && (
               <div className="text-center text-gray-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4"/>
                  <p>Sua imagem editada aparecerá aqui.</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;