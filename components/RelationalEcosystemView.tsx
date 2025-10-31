import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ModuleHeader } from './common/ModuleHeader';
import { RelationalContact, RelationalEcosystemStorage, RELATIONAL_ECOSYSTEM_STORAGE_KEY, InfluenceType, ArchetypeType, RelationalEcosystemAnalysis } from '../types';
import { storage } from '../utils/storage';
import { PlusIcon, EditIcon, DeleteIcon, RelationalEcosystemIcon, SaveIcon, BrainCircuitIcon, StarIcon, FlagIcon, LightbulbIcon, XIcon } from '../icons';
import { useToast } from '../contexts/ToastContext';
import { analyzeRelationalEcosystem } from '../services/generative-ai';
import { LoadingIndicator } from './common/LoadingIndicator';
import { ErrorMessage } from './common/ErrorMessage';
import { useSettings } from '../contexts/SettingsContext';
import { EmptyState } from './common/EmptyState';
import { Modal } from './common/Modal';
import * as d3 from 'https://esm.sh/d3@7';

const INFLUENCE_OPTIONS: { value: InfluenceType; label: string; }[] = [
    { value: 'ascendante', label: 'Ascendante (vous tire vers le haut)' },
    { value: 'neutre', label: 'Neutre (équilibre)' },
    { value: 'descendante', label: 'Descendante (vous pèse)' },
];

const ARCHETYPE_OPTIONS: { value: ArchetypeType; label: string; description: string }[] = [
    { value: 'Architecte', label: 'Architecte', description: 'Bâtit, structure, vision à long terme.' },
    { value: 'Gardien', label: 'Gardien', description: 'Protège, soutient, assure la stabilité.' },
    { value: 'Éclaireur', label: 'Éclaireur', description: 'Explore, inspire, apporte de la nouveauté.' },
    { value: 'Compagnon', label: 'Compagnon', description: 'Accompagne, écoute, partage le chemin.' },
    { value: 'Indéfini', label: 'Indéfini', description: 'Pas encore catégorisé.' },
];

const ARCHETYPE_COLORS: Record<ArchetypeType, string> = {
    'Architecte': '#3498db', // Blue
    'Gardien': '#2ecc71',    // Green
    'Éclaireur': '#f1c40f',  // Yellow
    'Compagnon': '#e67e22',  // Orange
    'Indéfini': '#95a5a6'   // Grey
};

const EcosystemGraph: React.FC<{
    contacts: RelationalContact[];
    onNodeClick: (contactId: string) => void;
}> = ({ contacts, onNodeClick }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); // Clear previous render

        const width = svgRef.current.clientWidth;
        const height = svgRef.current.clientHeight;

        const userNode = { id: 'user', name: 'Moi', isUser: true };
        const nodes = [userNode, ...contacts.map(c => ({...c}))];
        const links = contacts.map(c => ({ source: 'user', target: c.id, influence: c.influence }));

        const simulation = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = svg.append("g")
            .attr("class", "links")
            .selectAll("line")
            .data(links)
            .enter().append("line")
            .attr("class", d => `link ${d.influence}`);

        const node = svg.append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(nodes)
            .enter().append("g")
            .attr("class", d => d.isUser ? "node user-node" : "node")
            .on("click", (event, d) => {
                if (!d.isUser) {
                    onNodeClick(d.id as string);
                }
            })
            .call(d3.drag<SVGGElement, any>()
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }));

        node.append("circle")
            .attr("r", d => d.isUser ? 25 : 15)
            .attr("fill", d => d.isUser ? 'var(--color-primary)' : ARCHETYPE_COLORS[d.archetype as ArchetypeType]);

        node.append("text")
            .text(d => d.name)
            .attr("dy", d => d.isUser ? 35 : 25);
            
        node.on("mouseover", (event, d) => {
            if (tooltipRef.current && !d.isUser) {
                tooltipRef.current.innerHTML = d.name;
                tooltipRef.current.style.left = `${event.pageX + 10}px`;
                tooltipRef.current.style.top = `${event.pageY - 10}px`;
                tooltipRef.current.classList.add('visible');
            }
        }).on("mouseout", () => {
            if (tooltipRef.current) {
                 tooltipRef.current.classList.remove('visible');
            }
        });

        simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as any).x)
                .attr("y1", d => (d.source as any).y)
                .attr("x2", d => (d.target as any).x)
                .attr("y2", d => (d.target as any).y);
            node
                .attr("transform", d => `translate(${d.x},${d.y})`);
        });

    }, [contacts, onNodeClick]);

    return (
        <div className="ecosystem-graph-container">
            <svg ref={svgRef}></svg>
            <div ref={tooltipRef} className="ecosystem-tooltip"></div>
        </div>
    );
};

const SelectedContactCard: React.FC<{
    contact: RelationalContact;
    onEdit: () => void;
    onDelete: () => void;
    onClose: () => void;
}> = ({ contact, onEdit, onDelete, onClose }) => {
    const influenceInfo = INFLUENCE_OPTIONS.find(o => o.value === contact.influence);
    const archetypeInfo = ARCHETYPE_OPTIONS.find(o => o.value === contact.archetype);

    return (
        <div className="selected-contact-card content-card">
            <button onClick={onClose} className="button-icon" style={{ float: 'right' }}><XIcon /></button>
            <h4>{contact.name}</h4>
            <p><strong>Archétype:</strong> {archetypeInfo?.label}</p>
            <p><strong>Influence:</strong> {influenceInfo?.label}</p>
            <div className="action-button-group" style={{ marginTop: 'var(--spacing-md)' }}>
                <button className="button-secondary" onClick={onEdit}><EditIcon /> Modifier</button>
                <button className="button-destructive" onClick={onDelete}><DeleteIcon /> Supprimer</button>
            </div>
        </div>
    );
};

export const RelationalEcosystemView: React.FC = () => {
    const [contacts, setContacts] = useState<RelationalEcosystemStorage>(() => storage.get(RELATIONAL_ECOSYSTEM_STORAGE_KEY, []));
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [contactToEdit, setContactToEdit] = useState<RelationalContact | null>(null);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<RelationalEcosystemAnalysis | null>(null);
    const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const { showToast } = useToast();
    const { settings } = useSettings();

    useEffect(() => {
        storage.set(RELATIONAL_ECOSYSTEM_STORAGE_KEY, contacts);
    }, [contacts]);

    const handleOpenEditor = (contact: RelationalContact | null) => {
        setContactToEdit(contact);
        setIsEditorOpen(true);
    };

    const handleSave = (contactData: Omit<RelationalContact, 'id'>) => {
        if (contactToEdit) {
            setContacts(prev => prev.map(c => c.id === contactToEdit.id ? { ...c, ...contactData } : c));
            showToast("Contact mis à jour.", "success");
        } else {
            const newContact: RelationalContact = { id: Date.now().toString(), ...contactData };
            setContacts(prev => [newContact, ...prev]);
            showToast("Contact ajouté.", "success");
        }
        setIsEditorOpen(false);
        setContactToEdit(null);
        setAnalysis(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) {
            setContacts(prev => prev.filter(c => c.id !== id));
            if (selectedContactId === id) {
                setSelectedContactId(null);
            }
            setAnalysis(null);
            showToast("Contact supprimé.", "info");
        }
    };

    const handleAnalyze = async () => {
        if (contacts.length < 3) {
            showToast("Ajoutez au moins 3 contacts pour une analyse pertinente.", "info");
            return;
        }
        setIsAnalysisLoading(true);
        setAnalysisError(null);
        setAnalysis(null);
        try {
            const result = await analyzeRelationalEcosystem(contacts, settings);
            setAnalysis(result);
        } catch (err) {
            const msg = "L'analyse a échoué. Veuillez réessayer.";
            setAnalysisError(msg);
            showToast(msg, "destructive");
        } finally {
            setIsAnalysisLoading(false);
        }
    };
    
    const selectedContact = contacts.find(c => c.id === selectedContactId);

    return (
        <div className="module-view fade-in">
            <ModuleHeader title="Écosystème Relationnel" />
            <div className="module-content relational-ecosystem-content">
                {contacts.length === 0 ? (
                    <EmptyState
                        Icon={RelationalEcosystemIcon}
                        title="Cartographiez votre entourage"
                        message="Prenez conscience des influences qui vous entourent pour cultiver un environnement qui vous soutient."
                        action={{ text: "Ajouter mon premier contact", onClick: () => handleOpenEditor(null) }}
                    />
                ) : (
                    <>
                        {isAnalysisLoading && <LoadingIndicator />}
                        {analysisError && <ErrorMessage message={analysisError} />}
                        {analysis && (
                             <div className="ecosystem-analysis-card content-card fade-in">
                                <div className="analysis-header">
                                    <BrainCircuitIcon />
                                    <h3>Analyse de votre Écosystème</h3>
                                </div>
                                <ul>
                                    {analysis.strengths.map((item, i) => <li key={i}><StarIcon style={{color: 'var(--color-success)'}}/> {item}</li>)}
                                    {analysis.imbalances.map((item, i) => <li key={i}><FlagIcon style={{color: 'var(--color-info)'}}/> {item}</li>)}
                                </ul>
                                <p className="reflection-question"><strong>Suggestion:</strong> "{analysis.suggestion}"</p>
                            </div>
                        )}
                        <EcosystemGraph contacts={contacts} onNodeClick={setSelectedContactId} />
                        {selectedContact && (
                            <SelectedContactCard 
                                contact={selectedContact}
                                onEdit={() => handleOpenEditor(selectedContact)}
                                onDelete={() => handleDelete(selectedContact.id)}
                                onClose={() => setSelectedContactId(null)}
                            />
                        )}
                        <div className="ecosystem-controls">
                            <button onClick={() => handleOpenEditor(null)} className="button-primary"><PlusIcon /> Ajouter</button>
                            <button onClick={handleAnalyze} className="button-secondary" disabled={isAnalysisLoading || contacts.length < 3}><BrainCircuitIcon/> Analyser</button>
                        </div>
                    </>
                )}
            </div>

            {isEditorOpen && (
                <Modal isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} title={contactToEdit ? "Modifier le Contact" : "Nouveau Contact"}>
                     <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleSave({
                            name: formData.get('name') as string,
                            influence: formData.get('influence') as InfluenceType,
                            archetype: formData.get('archetype') as ArchetypeType,
                        });
                     }}>
                        <div className="form-group">
                            <label htmlFor="contact-name">Nom</label>
                            <input id="contact-name" name="name" type="text" defaultValue={contactToEdit?.name || ''} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="contact-influence">Son influence sur vous</label>
                            <select id="contact-influence" name="influence" defaultValue={contactToEdit?.influence || 'neutre'}>
                                {INFLUENCE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="contact-archetype">Son archétype relationnel</label>
                            <select id="contact-archetype" name="archetype" defaultValue={contactToEdit?.archetype || 'Indéfini'}>
                                {ARCHETYPE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                        </div>
                        <div className="wizard-actions">
                            <button type="button" onClick={() => setIsEditorOpen(false)} className="button-secondary">Annuler</button>
                            <button type="submit" className="button-primary"><SaveIcon /> Enregistrer</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};