import React from 'react';
import { BriefcaseIcon, UserIcon, LinkIcon } from './icons/Icons.tsx';

interface NetworkNodeProps {
  type: 'empresa' | 'socio' | 'parente';
  name: string;
  detail: string;
  connection?: string;
  children?: React.ReactNode;
}

const nodeConfig = {
    empresa: { icon: BriefcaseIcon, color: 'text-teal-400' },
    socio: { icon: UserIcon, color: 'text-indigo-400' },
    parente: { icon: UserIcon, color: 'text-yellow-400' },
};

const NetworkNode: React.FC<NetworkNodeProps> = ({ type, name, detail, connection }) => {
    const { icon: Icon, color } = nodeConfig[type];

    return (
        <div className="bg-gray-800/70 p-4 rounded-lg border border-gray-700/50">
            <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 mt-1 ${color}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-grow">
                    <h4 className="font-semibold text-white">{name}</h4>
                    <p className="text-sm text-gray-400">{detail}</p>
                </div>
            </div>
            {connection && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2 text-xs text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                    <span className="font-medium capitalize">{connection}</span>
                </div>
            )}
        </div>
    );
};

export default NetworkNode;
