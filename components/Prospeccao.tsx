import React, { useState, useEffect, useMemo, useCallback } from 'react';
// FIX: Added file extensions to import paths.
import { fetchProspectCompanies } from '../services/apiService.ts';
import { getCoordinatesForCep, calculateDistance } from '../services/geolocationService.ts';
import { Empresa } from '../types.ts';
import EmpresaCard from './EmpresaCard.tsx';
import Pagination from './Pagination.tsx';
import { SearchIcon, MapPinIcon } from './icons/Icons.tsx';
import { View } from '../App.tsx';

interface ProspeccaoProps {
    navigate: (view: View, payload?: any) => void;
}

const ESCRITORIO_CEP = '04551-010'; 

const Prospeccao: React.FC<ProspeccaoProps> = ({ navigate }) => {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'razao_social' | 'distancia_km'>('razao_social');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const [inputCep, setInputCep] = useState(ESCRITORIO_CEP);
    const [cepError, setCepError] = useState<string | null>(null);
    const [loadingDistances, setLoadingDistances] = useState(false);

    useEffect(() => {
        const loadProspects = async () => {
            try {
                setLoading(true);
                setError(null);
                setCepError(null);
                
                const empresasData = await fetchProspectCompanies();

                const escritorioCoords = await getCoordinatesForCep(ESCRITORIO_CEP);
                if (!escritorioCoords) {
                    console.warn("Could not get coordinates for the office CEP. Distance calculation will be skipped.");
                    setCepError("CEP do escritório inválido. Distâncias iniciais não calculadas.");
                }

                const empresasComDados = await Promise.all(
                    empresasData.map(async (empresa) => {
                        const newEmpresa = { ...empresa };
                        const coords = await getCoordinatesForCep(empresa.endereco_principal.cep);
                        if (coords) {
                            newEmpresa.endereco_principal.latitude = coords.latitude;
                            newEmpresa.endereco_principal.longitude = coords.longitude;
                            if (escritorioCoords) {
                                newEmpresa.distancia_km = calculateDistance(
                                    escritorioCoords.latitude,
                                    escritorioCoords.longitude,
                                    coords.latitude,
                                    coords.longitude
                                );
                            }
                        }
                        return newEmpresa;
                    })
                );
                setEmpresas(empresasComDados);

            } catch (err) {
                setError("Falha ao carregar prospects. Verifique a conexão com o backend e tente recarregar a página.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadProspects();
    }, []);

    const handleRecalculateDistances = useCallback(async () => {
        setLoadingDistances(true);
        setCepError(null);

        const newOriginCoords = await getCoordinatesForCep(inputCep);

        if (!newOriginCoords) {
            setCepError('CEP de origem inválido ou não encontrado. As distâncias não puderam ser calculadas.');
            setEmpresas(prevEmpresas =>
                prevEmpresas.map(e => {
                    const newE = { ...e };
                    delete newE.distancia_km;
                    return newE;
                })
            );
            setLoadingDistances(false);
            return;
        }

        setEmpresas(prevEmpresas =>
            prevEmpresas.map(empresa => {
                if (empresa.endereco_principal.latitude && empresa.endereco_principal.longitude) {
                    return {
                        ...empresa,
                        distancia_km: calculateDistance(
                            newOriginCoords.latitude,
                            newOriginCoords.longitude,
                            empresa.endereco_principal.latitude,
                            empresa.endereco_principal.longitude
                        )
                    };
                }
                const newE = { ...empresa };
                delete newE.distancia_km;
                return newE;
            })
        );

        setLoadingDistances(false);
    }, [inputCep]);


    const filteredAndSortedEmpresas = useMemo(() => {
        return empresas
            .filter(empresa =>
                empresa.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
                empresa.nome_fantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
                empresa.cnpj.replace(/[^\d]/g, '').includes(searchTerm.replace(/[^\d]/g, ''))
            )
            .sort((a, b) => {
                if (sortBy === 'distancia_km') {
                    return (a.distancia_km ?? Infinity) - (b.distancia_km ?? Infinity);
                }
                return a.razao_social.localeCompare(b.razao_social);
            });
    }, [empresas, searchTerm, sortBy]);

    const totalPages = Math.ceil(filteredAndSortedEmpresas.length / itemsPerPage);
    const paginatedEmpresas = filteredAndSortedEmpresas.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Prospecção de Clientes</h1>

            {!loading && error && (
                <div className="text-center p-8 text-red-400 bg-red-900/20 border border-red-500/30 rounded-lg">{error}</div>
            )}

            {!loading && !error && (
                <>
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                        <label htmlFor="cep-origem" className="block text-sm font-medium text-gray-300 mb-2">Calcular distância a partir de:</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-grow">
                                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                <input
                                    id="cep-origem"
                                    type="text"
                                    value={inputCep}
                                    onChange={(e) => setInputCep(e.target.value)}
                                    placeholder="Digite um CEP"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                onClick={handleRecalculateDistances}
                                disabled={loadingDistances}
                                className="flex-shrink-0 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
                            >
                                {loadingDistances ? 'Calculando...' : 'Atualizar Distâncias'}
                            </button>
                        </div>
                        {cepError && <p className="text-red-400 text-sm mt-2">{cepError}</p>}
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative w-full md:w-auto">
                           <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, fantasia ou CNPJ..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full md:w-80 pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                             <label htmlFor="sort" className="text-sm text-gray-400">Ordenar por:</label>
                             <select
                                id="sort"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'razao_social' | 'distancia_km')}
                                className="bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                             >
                                 <option value="razao_social">Razão Social</option>
                                 <option value="distancia_km">Distância</option>
                             </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {paginatedEmpresas.map(empresa => (
                            <EmpresaCard key={empresa.cnpj} empresa={empresa} navigate={navigate} />
                       ))}
                    </div>

                    {totalPages > 1 && (
                         <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}

                    {filteredAndSortedEmpresas.length === 0 && !loading && (
                        <div className="text-center p-12 text-gray-500 border-2 border-dashed border-gray-700 rounded-xl mt-6">
                             <h3 className="text-lg font-semibold text-gray-400">Nenhum resultado encontrado.</h3>
                             <p className="mt-1 text-sm">Tente ajustar seus filtros de busca.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Prospeccao;