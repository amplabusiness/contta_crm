import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    const [totalEmpresas, setTotalEmpresas] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'razao_social' | 'distancia_km'>('razao_social');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 6;

    const [inputCep, setInputCep] = useState(ESCRITORIO_CEP);
    const [cepError, setCepError] = useState<string | null>(null);
    const [loadingDistances, setLoadingDistances] = useState(false);
    const [officeCoords, setOfficeCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const officeCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

    const totalPages = useMemo(() => (
        totalEmpresas > 0 ? Math.ceil(totalEmpresas / itemsPerPage) : 0
    ), [totalEmpresas]);

    useEffect(() => {
        let cancelled = false;

        const resolveOfficeCoordinates = async () => {
            const coords = await getCoordinatesForCep(ESCRITORIO_CEP);
            if (cancelled) {
                return;
            }

            if (coords) {
                setOfficeCoords(coords);
                officeCoordsRef.current = coords;
                setCepError(null);
            } else {
                console.warn('Could not get coordinates for the office CEP. Distance calculation will be skipped.');
                setOfficeCoords(null);
                officeCoordsRef.current = null;
                setCepError('CEP do escritório inválido. Distâncias iniciais não calculadas.');
            }
        };

        resolveOfficeCoordinates();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const loadProspects = async () => {
            try {
                setLoading(true);
                setError(null);

                const search = searchTerm.trim();
                const offset = (currentPage - 1) * itemsPerPage;
                const { data, total } = await fetchProspectCompanies({
                    search: search.length > 0 ? search : undefined,
                    limit: itemsPerPage,
                    offset,
                    signal: controller.signal,
                });
                const originCoords = officeCoordsRef.current;

                const empresasComDados = await Promise.all(
                    data.map(async (empresa) => {
                        const newEmpresa = { ...empresa };
                        if (!cancelled) {
                            const coords = await getCoordinatesForCep(empresa.endereco_principal.cep);
                            if (coords) {
                                newEmpresa.endereco_principal.latitude = coords.latitude;
                                newEmpresa.endereco_principal.longitude = coords.longitude;
                                if (originCoords) {
                                    newEmpresa.distancia_km = calculateDistance(
                                        originCoords.latitude,
                                        originCoords.longitude,
                                        coords.latitude,
                                        coords.longitude,
                                    );
                                }
                            } else {
                                delete newEmpresa.distancia_km;
                            }
                        }
                        return newEmpresa;
                    }),
                );

                if (!cancelled) {
                    const totalPagesFromApi = total > 0 ? Math.ceil(total / itemsPerPage) : 0;

                    if (totalPagesFromApi === 0 && currentPage !== 1) {
                        setTotalEmpresas(total);
                        setEmpresas(empresasComDados);
                        setCurrentPage(1);
                        return;
                    }

                    if (totalPagesFromApi > 0 && currentPage > totalPagesFromApi) {
                        setTotalEmpresas(total);
                        setEmpresas(empresasComDados);
                        setCurrentPage(totalPagesFromApi);
                        return;
                    }

                    setEmpresas(empresasComDados);
                    setTotalEmpresas(total);
                }
            } catch (err) {
                if (controller.signal.aborted || cancelled) {
                    return;
                }
                setError('Falha ao carregar prospects. Verifique a conexão com o backend e tente recarregar a página.');
                console.error(err);
            } finally {
                if (!controller.signal.aborted && !cancelled) {
                    setLoading(false);
                }
            }
        };

        loadProspects();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [currentPage, itemsPerPage, searchTerm]);

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

    setOfficeCoords(newOriginCoords);
    officeCoordsRef.current = newOriginCoords;
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


    const sortedEmpresas = useMemo(() => {
        if (sortBy === 'distancia_km') {
            return [...empresas].sort((a, b) => (a.distancia_km ?? Infinity) - (b.distancia_km ?? Infinity));
        }
        return empresas;
    }, [empresas, sortBy]);

    useEffect(() => {
        if (!officeCoords) {
            return;
        }

        setEmpresas(prevEmpresas =>
            prevEmpresas.map(empresa => {
                if (empresa.endereco_principal.latitude !== undefined && empresa.endereco_principal.longitude !== undefined) {
                    return {
                        ...empresa,
                        distancia_km: calculateDistance(
                            officeCoords.latitude,
                            officeCoords.longitude,
                            empresa.endereco_principal.latitude,
                            empresa.endereco_principal.longitude,
                        ),
                    };
                }
                return empresa;
            }),
        );
    }, [officeCoords]);

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(prevPage => {
            if (page < 1) {
                return 1;
            }
            if (totalPages > 0 && page > totalPages) {
                return totalPages;
            }
            return page;
        });
    }, [totalPages]);

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
                   {sortedEmpresas.map(empresa => (
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

                {sortedEmpresas.length === 0 && !loading && (
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