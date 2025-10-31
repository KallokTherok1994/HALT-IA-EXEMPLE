import React from 'react';
import { ModulesIcon } from './icons';
import { modules as appModules } from './data';
import { useAppContext } from './contexts/AppContext';

export const Sidebar: React.FC = React.memo(() => {
  const { activeModule, navigateTo, onBack } = useAppContext();

  const utilityModuleIds = ['coach-ai', 'calm-space', 'settings'];
  const mainModules = appModules.filter(m => !utilityModuleIds.includes(m.id));
  const utilityModules = appModules.filter(m => utilityModuleIds.includes(m.id))
      .sort((a, b) => {
          if (a.id === 'settings') return 1;
          if (b.id === 'settings') return -1;
          return 0;
      });

  const [activeTab, setActiveTab] = React.useState<'main' | 'utility'>('main');

  React.useEffect(() => {
    if (activeModule && utilityModuleIds.includes(activeModule)) {
      setActiveTab('utility');
    } else {
      setActiveTab('main');
    }
  }, [activeModule]);

  const renderModuleItem = (module: typeof appModules[0]) => {
      const Icon = module.icon;
      return (
        <li
          key={module.id}
          className={`sidebar-nav-item ${activeModule === module.id ? 'active' : ''}`}
          onClick={() => navigateTo(module.id)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => e.key === 'Enter' && navigateTo(module.id)}
          aria-label={module.name}
          title={module.name}
        >
          <div className="sidebar-nav-icon"><Icon /></div>
          <span className="sidebar-nav-text">{module.name}</span>
        </li>
      );
  };

  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <h1 className="sidebar-brand">HALTE.IA</h1>
      
      <div className="sidebar-tabs" role="tablist">
        <button
          className={`sidebar-tab ${activeTab === 'main' ? 'active' : ''}`}
          onClick={() => setActiveTab('main')}
          role="tab"
          aria-selected={activeTab === 'main'}
        >
          Principaux
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'utility' ? 'active' : ''}`}
          onClick={() => setActiveTab('utility')}
          role="tab"
          aria-selected={activeTab === 'utility'}
        >
          Outils
        </button>
      </div>
      
      <ul className="sidebar-nav-main">
        {activeTab === 'main' && (
          <>
            <li 
              className={`sidebar-nav-item ${activeModule === null ? 'active' : ''}`}
              onClick={onBack} 
              role="button" 
              tabIndex={0} 
              onKeyPress={(e) => e.key === 'Enter' && onBack()}
              aria-label="Tableau de bord"
              title="Tableau de bord"
            >
              <div className="sidebar-nav-icon"><ModulesIcon /></div>
              <span className="sidebar-nav-text">Tableau de bord</span>
            </li>
            {mainModules.map(renderModuleItem)}
          </>
        )}
        {activeTab === 'utility' && utilityModules.map(renderModuleItem)}
      </ul>
    </nav>
  );
});
