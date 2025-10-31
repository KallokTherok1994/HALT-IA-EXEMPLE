import React from 'react';
import { ModulesIcon, StarIcon, SearchIcon } from '../icons';
import { modules as appModules } from '../data';
import { useSettings } from '../contexts/SettingsContext';
import { ModuleId } from '../types';

interface SidebarProps {
  activeModule: ModuleId | null;
  navigateTo: (moduleId: ModuleId) => void;
  onBack: () => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ activeModule, navigateTo, onBack }) => {
  const { settings, updateSetting } = useSettings();
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleToggleFavorite = (e: React.MouseEvent, moduleId: ModuleId) => {
      e.stopPropagation(); // Prevent navigation when clicking the star
      const favorites = settings.favoriteModules || [];
      const isFavorite = favorites.includes(moduleId);
      const newFavorites = isFavorite
          ? favorites.filter(id => id !== moduleId)
          : [...favorites, moduleId];
      updateSetting('favoriteModules', newFavorites);
  };

  const utilityModuleIds = ['coach-ai', 'calm-space', 'settings', 'admin'];
  const mainModules = appModules.filter(m => !utilityModuleIds.includes(m.id));
  const utilityModules = appModules.filter(m => utilityModuleIds.includes(m.id))
      .sort((a, b) => {
          if (a.id === 'settings') return 1; // settings always last
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

  const lowerCaseSearchTerm = searchTerm.toLowerCase();

  const filterModule = (module: (typeof appModules)[0]) => {
      if (!lowerCaseSearchTerm) return true;
      return (
          module.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          module.description.toLowerCase().includes(lowerCaseSearchTerm)
      );
  };

  const favoriteModuleIds = settings.favoriteModules || [];

  const favoriteMainModules = mainModules
      .filter(m => favoriteModuleIds.includes(m.id))
      .filter(filterModule)
      .sort((a, b) => favoriteModuleIds.indexOf(a.id) - favoriteModuleIds.indexOf(b.id));

  const nonFavoriteMainModules = mainModules
      .filter(m => !favoriteModuleIds.includes(m.id))
      .filter(filterModule);
  
  const filteredUtilityModules = utilityModules.filter(filterModule);

  const showDashboardItem = searchTerm === '' || 'tableau de bord'.includes(lowerCaseSearchTerm);
  const noMainResults = favoriteMainModules.length === 0 && nonFavoriteMainModules.length === 0 && !showDashboardItem;
  const noUtilityResults = filteredUtilityModules.length === 0;

  const renderModuleItem = (module: typeof appModules[0], isFavoritable: boolean) => {
      const Icon = module.icon;
      const isFavorite = favoriteModuleIds.includes(module.id);

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
          {isFavoritable && (
            <button
              className={`favorite-toggle ${isFavorite ? 'is-favorite' : ''}`}
              onClick={(e) => handleToggleFavorite(e, module.id)}
              aria-label={isFavorite ? `Retirer ${module.name} des favoris` : `Ajouter ${module.name} aux favoris`}
            >
              <StarIcon style={{width: 16, height: 16}}/>
            </button>
          )}
        </li>
      );
  };

  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <h1 className="sidebar-brand">HALTE.IA</h1>

      <div className="sidebar-search">
        <SearchIcon />
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Rechercher un module"
        />
      </div>
      
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
            {favoriteMainModules.length > 0 && (
                <>
                    <div className="sidebar-nav-header"><StarIcon /> Favoris</div>
                    {favoriteMainModules.map(m => renderModuleItem(m, true))}
                </>
            )}
            { showDashboardItem &&
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
            }
            {nonFavoriteMainModules.map(m => renderModuleItem(m, true))}
            {searchTerm && noMainResults && (
                <li className="sidebar-no-results">Aucun résultat</li>
            )}
          </>
        )}
        {activeTab === 'utility' && (
            <>
                {filteredUtilityModules.map(m => renderModuleItem(m, false))}
                {searchTerm && noUtilityResults && (
                    <li className="sidebar-no-results">Aucun résultat</li>
                )}
            </>
        )}
      </ul>
    </nav>
  );
});