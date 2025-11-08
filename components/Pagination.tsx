

import React from 'react';
// FIX: Added file extension to import path.
import { ChevronLeftIcon, ChevronRightIcon } from './icons/Icons.tsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    const halfPagesToShow = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      if (currentPage > halfPagesToShow + 2) {
        pageNumbers.push('...');
      }

      let startPage = Math.max(2, currentPage - halfPagesToShow);
      let endPage = Math.min(totalPages - 1, currentPage + halfPagesToShow);
      
      if (currentPage <= halfPagesToShow + 1) {
          endPage = maxPagesToShow;
      }
      if (currentPage >= totalPages - halfPagesToShow) {
          startPage = totalPages - maxPagesToShow + 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      if (currentPage < totalPages - halfPagesToShow - 1) {
        pageNumbers.push('...');
      }
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-center mt-8">
      <nav className="flex items-center space-x-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Anterior
        </button>
        
        <div className="hidden md:flex items-center space-x-1">
            {getPageNumbers().map((page, index) =>
            typeof page === 'number' ? (
                <button
                key={index}
                onClick={() => onPageChange(page)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === page
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                >
                {page}
                </button>
            ) : (
                <span key={index} className="px-4 py-2 text-sm font-medium text-gray-500">
                ...
                </span>
            )
            )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Próximo
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;