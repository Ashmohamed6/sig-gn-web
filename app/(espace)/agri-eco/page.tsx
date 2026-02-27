'use client'
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Package, Building, Droplets, AlertCircle, MapPin, Bell, Search } from 'lucide-react';

export default function DashboardDSTF() {
  const [activeProject, setActiveProject] = useState('AGRIECO/FIERE');
  const [filters, setFilters] = useState({
    region: '',
    prefecture: '',
    commune: '',
    campagne: '2024',
    filiere: ''
  });


  const kpiData = [
    { 
      id: 1, 
      title: '2 450 ha', 
      subtitle: 'Surfaces CEP', 
      icon: <MapPin className="w-6 h-6" />, 
      color: '#10b981', 
      trend: '+25%',
      bgColor: '#10b981'
    },
    { 
      id: 2, 
      title: '1 234', 
      subtitle: 'Bénéficiaires', 
      icon: <Users className="w-6 h-6" />, 
      color: '#3b82f6', 
      trend: '+6%',
      bgColor: '#3b82f6'
    },
    { 
      id: 3, 
      title: '45 t', 
      subtitle: 'Intrants distribués', 
      icon: <Package className="w-6 h-6" />, 
      color: '#8b5cf6', 
      trend: '+15%',
      bgColor: '#8b5cf6'
    },
    { 
      id: 4, 
      title: '18', 
      subtitle: 'Communes actives', 
      icon: <Building className="w-6 h-6" />, 
      color: '#f97316', 
      trend: '+2',
      bgColor: '#f97316'
    },
    { 
      id: 5, 
      title: '87%', 
      subtitle: 'Taux adoption', 
      icon: <TrendingUp className="w-6 h-6" />, 
      color: '#22c55e', 
      trend: '+5%',
      bgColor: '#22c55e'
    },
    { 
      id: 6, 
      title: '3', 
      subtitle: 'Anomalies QA', 
      icon: <AlertCircle className="w-6 h-6" />, 
      color: '#ef4444', 
      trend: '-2',
      bgColor: '#ef4444'
    }
  ];

  const cultureData = [
    { name: 'Riz', value: 800 },
    { name: 'Maïs', value: 650 },
    { name: 'Arachide', value: 500 },
    { name: 'Manioc', value: 350 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold">
                  D
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Dispositif SIG | Projet: {activeProject}</h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-semibold">
                  MS
                </div>
                <span className="text-sm font-medium text-gray-700">Mselove</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Cartes KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {kpiData.map((kpi) => (
            <div 
              key={kpi.id} 
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: kpi.bgColor }}
                >
                  {kpi.icon}
                </div>
                <span 
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    kpi.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {kpi.trend}
                </span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{kpi.title}</h3>
                <p className="text-xs text-gray-600">{kpi.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Graphique - Surfaces CEP par culture */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Surfaces CEP par culture</h2>
          </div>
          
          <div className="space-y-3">
            {cultureData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-24 text-sm font-medium text-gray-700">{item.name}</div>
                <div className="flex-1 mx-4">
                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-lg transition-all duration-500"
                      style={{ width: `${(item.value / 800) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-semibold text-gray-900">{item.value} ha</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}