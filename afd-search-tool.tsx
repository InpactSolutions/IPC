import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, Filter, ChevronRight, Database, Code, FileText, Hash, Type, Calendar, 
  ToggleLeft, Package, Copy, Check, Sun, Moon, Grid, List, Info, Clock,
  Star, Link2, Home, ChevronDown, X, Settings, HelpCircle, BookOpen
} from 'lucide-react';
import Papa from 'papaparse';

function AFDSearchTool() {
  const [data, setData] = useState([]);
  const [codelistData, setCodelistData] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState('normal');
  const [typeFilter, setTypeFilter] = useState('all');
  const [datatypeFilter, setDatatypeFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, entities: 0, attributes: 0 });
  const [viewMode, setViewMode] = useState('table');
  const [darkMode, setDarkMode] = useState(false);
  const [copiedItem, setCopiedItem] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedCodelist, setSelectedCodelist] = useState(null);
  const [codelistSearch, setCodelistSearch] = useState('');
  const searchInputRef = useRef(null);

  // Datatype info
  const datatypeInfo = {
    'JN': { 
      label: 'Ja/Nee', 
      icon: ToggleLeft, 
      color: 'text-blue-600',
      example: 'J of N',
      description: 'Boolean waarde'
    },
    'A0': { 
      label: 'Alfanumeriek', 
      icon: Type, 
      color: 'text-green-600',
      example: 'ABC123',
      description: 'Letters en cijfers'
    },
    'A1': { label: 'Alfanumeriek', icon: Type, color: 'text-green-600' },
    'A2': { label: 'Alfanumeriek', icon: Type, color: 'text-green-600' },
    'D1': { 
      label: 'Datum', 
      icon: Calendar, 
      color: 'text-purple-600',
      example: 'JJJJMMDD',
      description: 'Datum formaat'
    },
    'D3': { label: 'Datum', icon: Calendar, color: 'text-purple-600' },
    'B2': { 
      label: 'Bedrag', 
      icon: Hash, 
      color: 'text-yellow-600',
      example: '12345.67',
      description: 'Numeriek bedrag'
    },
    'T1': { 
      label: 'Tijd', 
      icon: Calendar, 
      color: 'text-indigo-600',
      example: 'UUMM',
      description: 'Tijd formaat'
    },
    'P3': { 
      label: 'Percentage', 
      icon: Hash, 
      color: 'text-orange-600',
      example: '12.345',
      description: 'Percentage waarde'
    },
    'ME': { 
      label: 'Memo', 
      icon: FileText, 
      color: 'text-gray-600',
      example: 'Vrije tekst',
      description: 'Memo veld'
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !selectedCodelist) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (selectedCodelist) {
          setSelectedCodelist(null);
          setCodelistSearch('');
        } else if (document.activeElement === searchInputRef.current) {
          setSearchTerm('');
          setShowSuggestions(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedCodelist]);

  // Load preferences
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('afd-darkmode') === 'true';
    setDarkMode(savedDarkMode);
    const savedFavorites = JSON.parse(localStorage.getItem('afd-favorites') || '[]');
    setFavorites(new Set(savedFavorites));
    const savedHistory = JSON.parse(localStorage.getItem('afd-search-history') || '[]');
    setSearchHistory(savedHistory);
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('afd-darkmode', darkMode);
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const csvContent = await window.fs.readFile('data.csv', { encoding: 'utf8' });
        
        const parsed = Papa.parse(csvContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimitersToGuess: [',', '\t', '|', ';']
        });

        const cleanedData = parsed.data.map(row => {
          const cleanRow = {};
          Object.keys(row).forEach(key => {
            cleanRow[key.trim()] = row[key];
          });
          return cleanRow;
        });

        // Load codelist data
        try {
          const codelistContent = await window.fs.readFile('Codelist.afm.csv', { encoding: 'utf8' });
          const parsedCodelist = Papa.parse(codelistContent, {
            header: false,
            dynamicTyping: true,
            skipEmptyLines: true,
            delimiter: ';'
          });

          const codelistGroups = {};
          parsedCodelist.data.slice(1).forEach(row => {
            const [codelijst, code, omschrijving, actief] = row;
            if (!codelistGroups[codelijst]) {
              codelistGroups[codelijst] = [];
            }
            codelistGroups[codelijst].push({
              code: code || '',
              omschrijving: omschrijving || '',
              actief: actief || ''
            });
          });

          setCodelistData(codelistGroups);
        } catch (err) {
          console.warn('Codelijst data kon niet worden geladen:', err);
        }

        setData(cleanedData);
        
        const entities = cleanedData.filter(row => row['Entiteit/Attribuut'] === 'E').length;
        const attributes = cleanedData.filter(row => row['Entiteit/Attribuut'] === 'A').length;
        setStats({
          total: cleanedData.length,
          entities,
          attributes
        });
        
        setLoading(false);
      } catch (err) {
        setError('Fout bij het laden van data: ' + err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Update search history
  useEffect(() => {
    if (searchTerm && searchTerm.length > 2) {
      const newHistory = [searchTerm, ...searchHistory.filter(h => h !== searchTerm)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('afd-search-history', JSON.stringify(newHistory));
    }
  }, [searchTerm]);

  // Unique datatypes
  const uniqueDatatypes = useMemo(() => {
    const types = new Set(data.map(row => row.Datatype).filter(dt => dt));
    return Array.from(types).sort();
  }, [data]);

  // Search filter
  const searchFilter = useCallback((row, term) => {
    if (!term) return true;

    const searchFields = [
      row.Naam,
      row.Omschrijving,
      row.Entiteitcode,
      row.Attribuutcode
    ].filter(Boolean).join(' ').toLowerCase();

    if (searchMode === 'regex') {
      try {
        const regex = new RegExp(term, 'i');
        return regex.test(searchFields);
      } catch {
        return false;
      }
    } else if (searchMode === 'wildcard') {
      const regexPattern = term
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(regexPattern, 'i');
      return regex.test(searchFields);
    } else {
      return searchFields.includes(term.toLowerCase());
    }
  }, [searchMode]);

  // Available entities
  const availableEntities = useMemo(() => {
    let preFiltered = data;

    if (typeFilter !== 'all') {
      preFiltered = preFiltered.filter(row => row['Entiteit/Attribuut'] === typeFilter);
    }

    if (datatypeFilter !== 'all') {
      preFiltered = preFiltered.filter(row => row.Datatype === datatypeFilter);
    }

    if (searchTerm) {
      preFiltered = preFiltered.filter(row => searchFilter(row, searchTerm));
    }

    const entityMap = new Map();
    preFiltered.forEach(row => {
      if (row.Entiteitcode && !entityMap.has(row.Entiteitcode)) {
        const entity = data.find(d => 
          d['Entiteit/Attribuut'] === 'E' && 
          d.Entiteitcode === row.Entiteitcode
        );
        entityMap.set(row.Entiteitcode, entity ? entity.Naam : row.Entiteitcode);
      }
    });

    return Array.from(entityMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([code, name]) => ({ code, name }));
  }, [data, searchTerm, typeFilter, datatypeFilter, searchFilter]);

  // Reset entity filter
  useEffect(() => {
    if (entityFilter !== 'all' && !availableEntities.find(e => e.code === entityFilter)) {
      setEntityFilter('all');
    }
  }, [availableEntities, entityFilter]);

  // Filtered data
  const filteredData = useMemo(() => {
    let filtered = data;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(row => row['Entiteit/Attribuut'] === typeFilter);
    }

    if (datatypeFilter !== 'all') {
      filtered = filtered.filter(row => row.Datatype === datatypeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(row => searchFilter(row, searchTerm));
    }

    if (entityFilter !== 'all') {
      filtered = filtered.filter(row => row.Entiteitcode === entityFilter);
    }

    return filtered;
  }, [data, searchTerm, typeFilter, datatypeFilter, entityFilter, searchFilter]);

  // Filtered codelist items
  const filteredCodelistItems = useMemo(() => {
    if (!selectedCodelist || !codelistData[selectedCodelist.codelijst]) return [];
    
    const items = codelistData[selectedCodelist.codelijst];
    if (!codelistSearch) return items;
    
    const searchLower = codelistSearch.toLowerCase();
    return items.filter(item => 
      item.code.toLowerCase().includes(searchLower) ||
      item.omschrijving.toLowerCase().includes(searchLower)
    );
  }, [selectedCodelist, codelistData, codelistSearch]);

  // Suggestions
  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const searchLower = searchTerm.toLowerCase();
    return data
      .filter(row => 
        row.Naam && 
        row.Naam.toLowerCase().includes(searchLower) &&
        !row.Naam.toLowerCase().startsWith(searchLower)
      )
      .slice(0, 5);
  }, [data, searchTerm]);

  // Grouped data
  const groupedData = useMemo(() => {
    if (typeFilter === 'A') {
      return filteredData;
    }

    const entities = filteredData.filter(row => row['Entiteit/Attribuut'] === 'E');
    const attributes = filteredData.filter(row => row['Entiteit/Attribuut'] === 'A');
    
    const grouped = entities.map(entity => {
      const entityAttrs = attributes.filter(attr => attr.Entiteitcode === entity.Entiteitcode);
      return {
        ...entity,
        attributes: entityAttrs,
        attributeCount: data.filter(row => 
          row['Entiteit/Attribuut'] === 'A' && 
          row.Entiteitcode === entity.Entiteitcode
        ).length
      };
    });

    if (typeFilter === 'all' && (searchTerm || entityFilter !== 'all')) {
      const shownEntityCodes = new Set(entities.map(e => e.Entiteitcode));
      const orphanAttributes = attributes.filter(attr => !shownEntityCodes.has(attr.Entiteitcode));
      orphanAttributes.forEach(attr => {
        grouped.push({
          ...attr,
          isOrphanAttribute: true
        });
      });
    }

    return grouped;
  }, [filteredData, typeFilter, searchTerm, entityFilter, data]);

  // Toggle functions
  const toggleExpand = useCallback((id) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      localStorage.setItem('afd-favorites', JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  // Copy function
  const copyToClipboard = useCallback((text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(id);
    setTimeout(() => setCopiedItem(null), 2000);
  }, []);

  // Open codelist
  const openCodelist = useCallback((codelijst, naam) => {
    setSelectedCodelist({ codelijst, naam });
    setCodelistSearch('');
  }, []);

  // Highlight text
  const highlightText = (text, term) => {
    if (!text || !term || searchMode === 'regex') return text;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{part}</mark>
        : part
    );
  };

  // Get direct link
  const getDirectLink = (item) => {
    const params = new URLSearchParams();
    if (item['Entiteit/Attribuut'] === 'E') {
      params.set('entity', item.Entiteitcode);
    } else {
      params.set('entity', item.Entiteitcode);
      params.set('attribute', item.Attribuutcode);
    }
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  // Format syntax
  const formatSyntax = (format) => {
    if (!format) return null;
    return (
      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
        {format}
      </code>
    );
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>AFD datacatalogus laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center text-red-600">
          <p className="text-xl">❌ {error}</p>
        </div>
      </div>
    );
  }

  const containerClass = darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50';
  const cardClass = darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white';

  // Render table view
  const renderTableView = () => (
    <div className={`${cardClass} rounded-lg shadow-sm overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Naam</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datatype</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formaat</th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Codelijst</th>
              <th className="relative px-3 py-3"><span className="sr-only">Acties</span></th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.slice(0, 100).map((item, index) => {
              const isEntity = item['Entiteit/Attribuut'] === 'E';
              const itemId = isEntity ? item.Entiteitcode : `${item.Entiteitcode}_${item.Attribuutcode}`;
              const isFavorite = favorites.has(itemId);
              
              return (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {isEntity ? (
                      <Database className="h-4 w-4 text-blue-600" title="Entiteit" />
                    ) : (
                      <Package className="h-4 w-4 text-green-600" title="Attribuut" />
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {isEntity ? item.Entiteitcode : `${item.Entiteitcode}_${item.Attribuutcode}`}
                    </code>
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                      {highlightText(item.Naam, searchTerm)}
                    </div>
                    {!isEntity && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md" title={item.Omschrijving}>
                        {item.Omschrijving}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {item.Datatype && datatypeInfo[item.Datatype] && (
                      <span className={`text-xs ${datatypeInfo[item.Datatype].color}`}>
                        {datatypeInfo[item.Datatype].label}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {item.Formaat && formatSyntax(item.Formaat)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {item.Codelijst && codelistData[item.Codelijst] && (
                      <button
                        onClick={() => openCodelist(item.Codelijst, item.Naam)}
                        className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        title={`Bekijk codelijst ${item.Codelijst} (${codelistData[item.Codelijst].length} items)`}
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>{item.Codelijst}</span>
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => toggleFavorite(itemId)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title="Favoriet"
                      >
                        <Star className={`h-3 w-3 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(itemId, itemId)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                        title="Kopieer code"
                      >
                        {copiedItem === itemId ? 
                          <Check className="h-3 w-3 text-green-500" /> : 
                          <Copy className="h-3 w-3 text-gray-400" />
                        }
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render compact view
  const renderCompactView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {filteredData.slice(0, 100).map((item, index) => {
        const isEntity = item['Entiteit/Attribuut'] === 'E';
        const itemId = isEntity ? item.Entiteitcode : `${item.Entiteitcode}_${item.Attribuutcode}`;
        const isFavorite = favorites.has(itemId);
        
        return (
          <div key={index} className={`${cardClass} rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {isEntity ? (
                  <Database className="h-4 w-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Package className="h-4 w-4 text-green-600 flex-shrink-0" />
                )}
                <code className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                  {isEntity ? item.Entiteitcode : `${item.Entiteitcode}_${item.Attribuutcode}`}
                </code>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => toggleFavorite(itemId)}
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <Star className={`h-3 w-3 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => copyToClipboard(itemId, itemId)}
                  className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  {copiedItem === itemId ? 
                    <Check className="h-3 w-3 text-green-500" /> : 
                    <Copy className="h-3 w-3 text-gray-400" />
                  }
                </button>
              </div>
            </div>
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
              {highlightText(item.Naam, searchTerm)}
            </h4>
            <div className="flex items-center flex-wrap gap-1">
              {item.Datatype && datatypeInfo[item.Datatype] && (
                <span className={`text-xs ${datatypeInfo[item.Datatype].color}`}>
                  {datatypeInfo[item.Datatype].label}
                </span>
              )}
              {item.Codelijst && codelistData[item.Codelijst] && (
                <button
                  onClick={() => openCodelist(item.Codelijst, item.Naam)}
                  className="inline-flex items-center space-x-0.5 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <BookOpen className="h-3 w-3" />
                  <span>{item.Codelijst}</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  // Render expanded view
  const renderExpandedView = () => (
    <div className="space-y-2">
      {groupedData.slice(0, 100).map((item, index) => {
        const isEntity = item['Entiteit/Attribuut'] === 'E';
        const isExpanded = expandedItems.has(item.Entiteitcode);
        const hasAttributes = item.attributes && item.attributes.length > 0;
        const isFavorite = favorites.has(isEntity ? item.Entiteitcode : `${item.Entiteitcode}_${item.Attribuutcode}`);
        const itemId = isEntity ? item.Entiteitcode : `${item.Entiteitcode}_${item.Attribuutcode}`;
        
        if (item.isOrphanAttribute) {
          return (
            <div key={index} className={`${cardClass} rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <Package className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                        {item.Entiteitcode}_{item.Attribuutcode}
                      </span>
                      {item.Datatype && datatypeInfo[item.Datatype] && (
                        <span className={`text-xs ${datatypeInfo[item.Datatype].color}`}>
                          {datatypeInfo[item.Datatype].label}
                        </span>
                      )}
                      {item.Formaat && formatSyntax(item.Formaat)}
                      {item.Codelijst && codelistData[item.Codelijst] && (
                        <button
                          onClick={() => openCodelist(item.Codelijst, item.Naam)}
                          className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>{item.Codelijst}</span>
                        </button>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {highlightText(item.Naam, searchTerm)}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                      {highlightText(item.Omschrijving, searchTerm)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => toggleFavorite(itemId)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => copyToClipboard(`${item.Entiteitcode}_${item.Attribuutcode}`, itemId)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copiedItem === itemId ? 
                      <Check className="h-4 w-4 text-green-500" /> : 
                      <Copy className="h-4 w-4 text-gray-400" />
                    }
                  </button>
                  <button
                    onClick={() => copyToClipboard(getDirectLink(item), `link-${itemId}`)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copiedItem === `link-${itemId}` ? 
                      <Check className="h-4 w-4 text-green-500" /> : 
                      <Link2 className="h-4 w-4 text-gray-400" />
                    }
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div key={index} className={`${cardClass} rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
            <div 
              className={`p-4 ${isEntity && hasAttributes ? 'cursor-pointer' : ''}`}
              onClick={() => isEntity && hasAttributes && toggleExpand(item.Entiteitcode)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {isEntity && hasAttributes && (
                    <ChevronRight 
                      className={`h-5 w-5 text-gray-400 mt-0.5 transform transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} 
                    />
                  )}
                  <div className={`${!isEntity || !hasAttributes ? 'ml-8' : ''} flex-1`}>
                    {!isEntity && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <Home className="h-3 w-3 mr-1" />
                        <span>{item.Entiteitcode}</span>
                        <ChevronRight className="h-3 w-3 mx-1" />
                        <span>{item.Attribuutcode}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-2 flex-wrap">
                      {isEntity ? (
                        <Database className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Package className="h-5 w-5 text-green-600" />
                      )}
                      <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                        {isEntity ? item.Entiteitcode : `${item.Entiteitcode}_${item.Attribuutcode}`}
                      </span>
                      {!isEntity && item.Datatype && datatypeInfo[item.Datatype] && (
                        <span className={`text-xs ${datatypeInfo[item.Datatype].color}`}>
                          {datatypeInfo[item.Datatype].label}
                        </span>
                      )}
                      {item.Formaat && formatSyntax(item.Formaat)}
                      {item.Codelijst && codelistData[item.Codelijst] && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCodelist(item.Codelijst, item.Naam);
                          }}
                          className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>{item.Codelijst}</span>
                        </button>
                      )}
                      {isEntity && item.attributeCount !== undefined && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {item.attributeCount} attributen
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mt-1">
                      {highlightText(item.Naam, searchTerm)}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                      {highlightText(item.Omschrijving, searchTerm)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(itemId);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(itemId, itemId);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copiedItem === itemId ? 
                      <Check className="h-4 w-4 text-green-500" /> : 
                      <Copy className="h-4 w-4 text-gray-400" />
                    }
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(getDirectLink(item), `link-${itemId}`);
                    }}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copiedItem === `link-${itemId}` ? 
                      <Check className="h-4 w-4 text-green-500" /> : 
                      <Link2 className="h-4 w-4 text-gray-400" />
                    }
                  </button>
                </div>
              </div>
            </div>

            {isEntity && isExpanded && hasAttributes && (
              <div className={`border-t ${darkMode ? 'border-gray-700 bg-gray-900' : 'bg-gray-50'}`}>
                {item.attributes.map((attr, attrIndex) => (
                  <div key={attrIndex} className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-100'} last:border-b-0`}>
                    <div className="ml-8 flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <Package className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                              {attr.Attribuutcode}
                            </span>
                            {attr.Datatype && datatypeInfo[attr.Datatype] && (
                              <span className={`text-xs ${datatypeInfo[attr.Datatype].color}`}>
                                {datatypeInfo[attr.Datatype].label}
                              </span>
                            )}
                            {attr.Formaat && formatSyntax(attr.Formaat)}
                            {attr.Codelijst && codelistData[attr.Codelijst] && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCodelist(attr.Codelijst, attr.Naam);
                                }}
                                className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                              >
                                <BookOpen className="h-3 w-3" />
                                <span>{attr.Codelijst}</span>
                              </button>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {highlightText(attr.Naam, searchTerm)}
                          </h4>
                          <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">
                            {highlightText(attr.Omschrijving, searchTerm)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => copyToClipboard(`${attr.Entiteitcode}_${attr.Attribuutcode}`, `${attr.Entiteitcode}_${attr.Attribuutcode}`)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          {copiedItem === `${attr.Entiteitcode}_${attr.Attribuutcode}` ? 
                            <Check className="h-3 w-3 text-green-500" /> : 
                            <Copy className="h-3 w-3 text-gray-400" />
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`min-h-screen ${containerClass}`}>
      {/* Header */}
      <div className={`${cardClass} shadow-sm border-b ${darkMode ? 'border-gray-700' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  AFD 1.0 Datacatalogus
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{stats.total.toLocaleString()} items</span>
                  <span>•</span>
                  <span>{stats.entities} entiteiten</span>
                  <span>•</span>
                  <span>{stats.attributes.toLocaleString()} attributen</span>
                  {Object.keys(codelistData).length > 0 && (
                    <>
                      <span>•</span>
                      <span>{Object.keys(codelistData).length} codelijsten</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 border rounded-lg p-1 dark:border-gray-600">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900' : 'text-gray-500'}`}
                  title="Tabel weergave"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900' : 'text-gray-500'}`}
                  title="Compacte weergave"
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('expanded')}
                  className={`p-1.5 rounded ${viewMode === 'expanded' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900' : 'text-gray-500'}`}
                  title="Uitgebreide weergave"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Help"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className={`${cardClass} border-b ${darkMode ? 'border-gray-700' : ''} p-4`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">/</kbd> Focus zoekbalk</div>
                  <div><kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">Esc</kbd> Clear zoekveld / Sluit modal</div>
                </div>
                <h3 className="font-semibold mt-4 mb-2">Zoek Modi</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Normaal:</strong> Zoekt op exacte tekst</div>
                  <div><strong>Wildcard:</strong> Gebruik * voor meerdere karakters, ? voor één karakter</div>
                  <div><strong>Regex:</strong> Reguliere expressies voor geavanceerd zoeken</div>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className={`${cardClass} border-b ${darkMode ? 'border-gray-700' : ''} sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                    setSelectedSuggestion(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Zoek op naam, omschrijving of code... (druk / voor focus)"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : ''
                  }`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              <select
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value)}
                className={`px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600' : ''}`}
                title="Zoek modus"
              >
                <option value="normal">Normaal</option>
                <option value="wildcard">Wildcard (* ?)</option>
                <option value="regex">Regex</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode ? 'bg-gray-700 border-gray-600' : ''
                  }`}
                >
                  <option value="all">Alle types</option>
                  <option value="E">Alleen entiteiten</option>
                  <option value="A">Alleen attributen</option>
                </select>
              </div>

              {availableEntities.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-gray-400" />
                  <select
                    value={entityFilter}
                    onChange={(e) => setEntityFilter(e.target.value)}
                    className={`border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent max-w-xs ${
                      darkMode ? 'bg-gray-700 border-gray-600' : ''
                    }`}
                  >
                    <option value="all">Alle entiteiten ({availableEntities.length})</option>
                    {availableEntities.map(({ code, name }) => (
                      <option key={code} value={code}>
                        {code} - {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Code className="h-5 w-5 text-gray-400" />
                <select
                  value={datatypeFilter}
                  onChange={(e) => setDatatypeFilter(e.target.value)}
                  className={`border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode ? 'bg-gray-700 border-gray-600' : ''
                  }`}
                >
                  <option value="all">Alle datatypes</option>
                  {uniqueDatatypes.map(dt => (
                    <option key={dt} value={dt}>
                      {datatypeInfo[dt]?.label || dt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                {filteredData.length} resultaten
              </div>
            </div>

            {(searchTerm || typeFilter !== 'all' || entityFilter !== 'all' || datatypeFilter !== 'all') && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Actieve filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Zoekterm: "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm('')}
                      className="ml-2 hover:text-blue-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Type: {typeFilter === 'E' ? 'Entiteiten' : 'Attributen'}
                    <button
                      onClick={() => setTypeFilter('all')}
                      className="ml-2 hover:text-green-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {entityFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Entiteit: {entityFilter}
                    <button
                      onClick={() => setEntityFilter('all')}
                      className="ml-2 hover:text-purple-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {datatypeFilter !== 'all' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    Datatype: {datatypeInfo[datatypeFilter]?.label || datatypeFilter}
                    <button
                      onClick={() => setDatatypeFilter('all')}
                      className="ml-2 hover:text-orange-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setEntityFilter('all');
                    setDatatypeFilter('all');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                >
                  Wis alle filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Geen resultaten gevonden</p>
            <p className="text-gray-400 dark:text-gray-500 mt-2">Probeer een andere zoekterm of pas de filters aan</p>
          </div>
        ) : viewMode === 'table' ? (
          renderTableView()
        ) : viewMode === 'compact' ? (
          renderCompactView()
        ) : (
          renderExpandedView()
        )}

        {filteredData.length > 100 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Eerste 100 van {filteredData.length} resultaten getoond
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Verfijn je zoekopdracht voor specifiekere resultaten
            </p>
          </div>
        )}
      </div>

      {/* Codelist Modal */}
      {selectedCodelist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardClass} rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col`}>
            <div className="flex-shrink-0 p-6 border-b dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">Codelijst: {selectedCodelist.codelijst}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedCodelist.naam}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filteredCodelistItems.length} van {codelistData[selectedCodelist.codelijst]?.length || 0} items
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCodelist(null);
                    setCodelistSearch('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={codelistSearch}
                    onChange={(e) => setCodelistSearch(e.target.value)}
                    placeholder="Zoek in codelijst..."
                    className={`w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600' : ''
                    }`}
                    autoFocus
                  />
                  {codelistSearch && (
                    <button
                      onClick={() => setCodelistSearch('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto min-h-0 p-6">
              {filteredCodelistItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    {codelistSearch ? 'Geen items gevonden voor deze zoekopdracht' : 'Geen items in deze codelijst'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCodelistItems.map((item, index) => (
                    <div 
                      key={index}
                      className={`flex items-start justify-between p-3 rounded-lg hover:shadow-sm transition-shadow ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center space-x-2">
                          <code className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {highlightText(item.code, codelistSearch)}
                          </code>
                          {item.actief === 'J' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Actief
                            </span>
                          )}
                          {item.actief === 'N' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Inactief
                            </span>
                          )}
                        </div>
                        <p className="text-sm mt-1 text-gray-700 dark:text-gray-300 break-words">
                          {highlightText(item.omschrijving, codelistSearch)}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.code, `cl-${index}`)}
                        className="flex-shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
                        title="Kopieer code"
                      >
                        {copiedItem === `cl-${index}` ? 
                          <Check className="h-4 w-4 text-green-500" /> : 
                          <Copy className="h-4 w-4 text-gray-400" />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AFDSearchTool;