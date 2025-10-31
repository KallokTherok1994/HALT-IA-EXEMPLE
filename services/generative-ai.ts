import { GoogleGenAI, Type } from "@google/genai";
// FIX: Added 'DreamEntry' to the import list to fix 'Cannot find name' error.
import { JournalCoachAnalysis, ThoughtCase, Ritual, GuidedJourney, JournalEntry, AssessmentQuestion, AssessmentResult, RitualTask, Suggestion, ConversationFeedback, ProactiveSuggestion, UnsentLetterAnalysis, GoalLinkedModule, FoodLog, HerbariumInfo, CrystalInfo, ArtTherapyAnalysis, SynthesisReport, TreeInfo, AnimalInfo, Chronotype, InnerSeason, CoreWound, ProgressAnalysis, RelationalContact, RelationalEcosystemAnalysis, AppSettings, BodyMapAnalysis, PersonalizedPath, CoachPersonality, CoachTone, Connection, FearSettingExercise, FearSettingAnalysis, ConnectableItem, JOURNAL_STORAGE_KEY, THOUGHT_COURT_STORAGE_KEY, GOALS_STORAGE_KEY, UNSENT_LETTER_STORAGE_KEY, BODY_MAP_STORAGE_KEY, FEAR_SETTING_STORAGE_KEY, Goal, UnsentLetter, BodyMapEntry, ThematicSynthesis, OracleCard, OracleDraw, DreamAnalysis, NarrativeArcEntry, NarrativeArcAnalysis, ModuleId, DREAM_JOURNAL_STORAGE_KEY, DreamEntry } from '../types';
import { GEMINI_FLASH_MODEL } from './constants';
import { moodOptions } from '../data';
import { getTimeOfDay } from '../utils/dateHelpers';
import { generateContextualSummary } from '../utils/dataSummary';
import { storage } from "../utils/storage";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A helper function to generate JSON content from the AI model.
 * It abstracts the API call, response parsing, and basic error handling.
 * @param prompt The instructional string sent to the model.
 * @param schema The expected JSON schema for the response.
 * @returns A promise that resolves to the parsed JSON object of type T.
 */
async function generateJsonFromAi<T>(prompt: string, schema: object): Promise<T> {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("AI returned an empty response, which cannot be parsed as JSON.");
    }
    return JSON.parse(jsonText) as T;
}

export const getCoachSystemInstruction = (settings: AppSettings): string => {
    const personalityMap: Record<CoachPersonality, string> = {
        'Bienveillant': "Tu es Hal, un coach en bien-être bienveillant, sage et empathique. Ton approche est douce et tu privilégies l'écoute et le soutien inconditionnel.",
        'Direct': "Tu es Hal, un coach en bien-être direct et pragmatique. Tu vas droit au but pour aider l'utilisateur à atteindre ses objectifs, en posant des questions claires et en proposant des actions concrètes.",
        'Philosophe': "Tu es Hal, un coach en bien-être philosophe et introspectif. Tu aimes poser des questions profondes qui invitent à la réflexion sur le sens et les valeurs, en utilisant des métaphores et des perspectives plus larges."
    };

    const toneMap: Record<CoachTone, string> = {
        'Encourageant': "Ton ton est toujours positif, chaleureux et plein d'encouragements. Tu célèbres les petites victoires.",
        'Neutre': "Ton ton est calme, objectif et factuel. Tu fournis des analyses claires sans jugement émotionnel.",
        'Stimulant': "Ton ton est énergique et motivant. Tu pousses gentiment l'utilisateur à se dépasser et à sortir de sa zone de confort."
    };
    
    const baseInstruction = personalityMap[settings.coachSettings.personality];
    const toneInstruction = toneMap[settings.coachSettings.tone];

    return `${baseInstruction} ${toneInstruction} Tu réponds toujours en français.`;
};


export const analyzeJournalEntry = async (content: string, foodLogs: FoodLog[] | undefined, userValues: string[], mood: string | undefined, settings: AppSettings, connections?: Connection[]): Promise<JournalCoachAnalysis> => {
    const valuesContext = settings.shareContextWithAI.values && userValues.length > 0
        ? `Prends en compte que les valeurs fondamentales de l'utilisateur sont : ${userValues.join(', ')}.`
        : "";
        
    const moodLabel = moodOptions.find(m => m.emoji === mood)?.label;
    const moodContext = settings.shareContextWithAI.journal && mood && moodLabel
        ? `L'utilisateur a indiqué se sentir "${moodLabel}" (${mood}). Prends cela en compte dans ton analyse.`
        : "";
        
    const foodContext = (settings.shareContextWithAI.journal && foodLogs && foodLogs.length > 0)
        ? `L'utilisateur a également enregistré les repas suivants aujourd'hui : ${foodLogs.map(log => `${log.mealType}: ${log.description} (ressenti: ${log.moodTags.join(', ')})`).join('; ')}. Cherche des liens potentiels entre son alimentation et son état émotionnel ou physique décrit dans le journal.`
        : "";
    
    let connectionsContext = '';
    if (connections && connections.length > 0) {
        const allowedConnections = connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté au module '${conn.moduleId}' : "${conn.entryTitle}"`);
            connectionsContext = `Cette entrée est connectée aux éléments suivants. Utilise ces liens pour trouver des thèmes plus profonds dans ton analyse:\n${connectionSummaries.join('\n')}`;
        }
    }

    const coachInstruction = getCoachSystemInstruction(settings);
    const prompt = `${coachInstruction} Analyse cette entrée de journal.
- Identifie les émotions et thèmes clés.
- Fournis une "emotionalInsight": une observation approfondie (2-3 phrases) sur les schémas émotionnels, les conflits ou les nuances des sentiments exprimés.
- Propose une "suggestedPractice": une pratique de bien-être spécifique et concrète que l'utilisateur peut faire. Donne un nom à la pratique, sa pertinence (rationale), et un emoji (icon).
- Si la pratique suggérée correspond directement à un module de l'application, inclus un "actionModuleId". Les modules actionnables sont : 'calm-space' (pour respiration, méditation), 'gratitude' (pour lister des gratitudes), 'thought-court' (pour défier une pensée), 'unsent-letters' (pour exprimer des émotions envers qqn). Ne l'inclus que si la correspondance est évidente.
${valuesContext} ${moodContext} ${foodContext} ${connectionsContext}
Entrée de journal : "${content}"`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            emotions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste des émotions clés détectées (3-5 mots max)."
            },
            themes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste des thèmes principaux abordés (3-5 mots max)."
            },
            emotionalInsight: {
                type: Type.STRING,
                description: "Une observation approfondie (2-3 phrases) sur les schémas émotionnels, les conflits ou les nuances de sentiments."
            },
            suggestedPractice: {
                type: Type.OBJECT,
                description: "Une pratique de bien-être spécifique et concrète.",
                properties: {
                    name: {
                        type: Type.STRING,
                        description: "Le nom de la pratique suggérée (ex: 'Exercice de respiration carrée', 'Écrire une lettre de gratitude')."
                    },
                    rationale: {
                        type: Type.STRING,
                        description: "Une courte phrase expliquant pourquoi cette pratique est pertinente pour l'entrée."
                    },
                    icon: {
                        type: Type.STRING,
                        description: "Un seul emoji pour représenter la pratique (ex: '🧘', '✍️')."
                    },
                    actionModuleId: {
                        type: Type.STRING,
                        description: "Optionnel. Si la pratique est liée à un module, fournir l'ID du module (ex: 'calm-space', 'gratitude')."
                    }
                },
                required: ["name", "rationale", "icon"]
            }
        },
        required: ["emotions", "themes", "emotionalInsight", "suggestedPractice"]
    };

    return generateJsonFromAi<JournalCoachAnalysis>(prompt, schema);
};


export const analyzeThoughtCase = async (
    negativeThought: string,
    evidenceFor: string,
    evidenceAgainst: string,
    settings: AppSettings,
    connections?: Connection[]
): Promise<NonNullable<ThoughtCase['analysis']>> => {
    let connectionsContext = '';
    if (connections && connections.length > 0) {
        const allowedConnections = connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté au module '${conn.moduleId}' : "${conn.entryTitle}"`);
            connectionsContext = `Cette analyse de pensée est connectée aux éléments suivants. Utilise ce contexte pour trouver des thèmes plus profonds dans ton analyse:\n${connectionSummaries.join('\n')}\n`;
        }
    }

    const prompt = `Analyze this cognitive-behavioral therapy thought record. The user is French. Provide the analysis in French.
        ${connectionsContext}
        - Negative Thought: "${negativeThought}"
        - Evidence For: "${evidenceFor}"
        - Evidence Against: "${evidenceAgainst}"`;
     
     const schema = {
        type: Type.OBJECT,
        properties: {
            distortions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste des distorsions cognitives possibles (ex: 'Généralisation excessive', 'Pensée tout ou rien')."
            },
            alternativePerspectives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 perspectives alternatives pour voir la situation différemment."
            },
            balancedThought: {
                type: Type.STRING,
                description: "Une suggestion de pensée plus équilibrée, réaliste et constructive."
            }
        },
        required: ["distortions", "alternativePerspectives", "balancedThought"]
    };

    return generateJsonFromAi<NonNullable<ThoughtCase['analysis']>>(prompt, schema);
};

export const generateValueReflection = async (value: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: `Generate a single, profound, and open-ended reflection question about the personal value of "${value}". The user is French. The question must be in French. Keep it concise.`
    });
    return response.text.trim().replace(/"/g, ''); // Remove quotes if any
};

export const getOracleInterpretation = async (draw: OracleDraw, pastDraws: OracleDraw[], settings: AppSettings): Promise<string> => {
    let connectionsContext = '';
    if (draw.connections && draw.connections.length > 0) {
        const allowedConnections = draw.connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté à '${conn.entryTitle}' (${conn.moduleId})`).join('\n');
            connectionsContext = `Ce tirage est connecté aux éléments suivants. Prends-les en compte pour une interprétation plus profonde :\n${connectionSummaries}\n`;
        }
    }

    let historyContext = '';
    if (pastDraws.length > 0) {
        const recentDraws = pastDraws.slice(-3);
        historyContext = 'Pour référence, voici les derniers tirages de l\'utilisateur :\n' +
            recentDraws.map(d => `- Tirage '${d.spreadType}' sur la question: "${d.question}"`).join('\n');
    }

    const cardDetails = draw.cards.map(c => 
        `- Position: "${c.position}", Carte: "${c.card.title}", Poème: "\n${c.card.poem.join('\n')}"`
    ).join('\n\n');

    const prompt = `Tu es un oracle sage, bienveillant et poétique. Un utilisateur a posé une question et a effectué un tirage. Ton rôle est de fournir une interprétation vocale inspirante et douce.

- **Type de Tirage :** "${draw.spreadType}"
- **Question de l'utilisateur :** "${draw.question}"
- **Cartes tirées :**
${cardDetails}
- **Contexte (tirages précédents) :** ${historyContext || 'Aucun'}
- **Contexte (connexions) :** ${connectionsContext || 'Aucune'}

Ta réponse doit être formulée comme un message parlé, fluide et naturel à l'oral.
Structure ta réponse ainsi :
1.  **Interprétation de chaque carte :** Analyse chaque carte l'une après l'autre, en l'interprétant spécifiquement DANS LE CONTEXTE de sa position (ex: "Dans la position du Passé, la carte '...' suggère que..."). Sois concis pour chaque carte.
2.  **Synthèse Globale :** Après avoir analysé chaque carte, fournis une synthèse globale en 1 ou 2 paragraphes. Relie les messages des cartes entre elles pour former une histoire cohérente qui répond à la question de l'utilisateur.

Sois encourageant et offre une perspective, pas une prédiction. La réponse doit être en français.`;

    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
    });

    return response.text.trim();
};

export const analyzeDreamEntry = async (content: string, emotions: string[], settings: AppSettings, connections?: Connection[]): Promise<DreamAnalysis> => {
    let connectionsContext = '';
    if (connections && connections.length > 0) {
        const allowedConnections = connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté au module '${conn.moduleId}' : "${conn.entryTitle}"`);
            connectionsContext = `Ce rêve est connecté aux éléments suivants. Utilise ce contexte pour une interprétation plus profonde des symboles:\n${connectionSummaries.join('\n')}\n`;
        }
    }
    
    const prompt = `Agis comme un interprète de rêves bienveillant avec une approche jungienne et archétypale. Analyse le rêve suivant pour un utilisateur français.
    - Émotions ressenties pendant le rêve : ${emotions.join(', ') || 'non spécifiées'}.
    - ${connectionsContext}
    - Contenu du rêve : "${content}"
    
    Fournis une analyse structurée en JSON. Ne sois pas prescriptif ou fataliste. Offre des pistes de réflexion.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            symbols: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        symbol: { type: Type.STRING, description: "Le nom d'un symbole clé identifié (ex: 'Une maison', 'L'eau')." },
                        interpretation: { type: Type.STRING, description: "Une brève interprétation symbolique de ce symbole DANS LE CONTEXTE du rêve." }
                    },
                    required: ["symbol", "interpretation"]
                },
                description: "Liste de 2 à 4 symboles clés du rêve et leur interprétation."
            },
            overallMeaning: {
                type: Type.STRING,
                description: "Un résumé (2-3 phrases) de la signification globale possible du rêve, en reliant les symboles et les émotions."
            },
            reflectionPrompt: {
                type: Type.STRING,
                description: "Une question de réflexion ouverte pour aider l'utilisateur à approfondir sa propre interprétation."
            }
        },
        required: ["symbols", "overallMeaning", "reflectionPrompt"]
    };

    return generateJsonFromAi<DreamAnalysis>(prompt, schema);
};


export const generateWeeklyReview = async (
    journalEntries: JournalEntry[],
    rituals: Ritual[],
    completions: { [date: string]: string[] },
    userValues: string[],
    settings: AppSettings,
) => {
    const journalSummary = settings.shareContextWithAI.journal && journalEntries.length > 0
        ? `Journal entries this week: \n${journalEntries.map(e => `- ${e.title}: ${e.content.substring(0, 100)}...`).join('\n')}`
        : "No journal entries this week or sharing disabled.";

    const ritualSummary = settings.shareContextWithAI.ritual && rituals.length > 0
        ? `Rituals tracked: ${rituals.map(r => r.name).join(', ')}. Completion data is available.`
        : "No rituals defined or sharing disabled.";
        
    const valuesContext = settings.shareContextWithAI.values && userValues.length > 0
        ? `The user's core values are: ${userValues.join(', ')}. Tailor the summary and reflection question to these values.`
        : "";

    const coachInstruction = getCoachSystemInstruction(settings);
    const prompt = `${coachInstruction} Génère un bilan hebdomadaire pour un utilisateur. Sois positif, perspicace et doux.
        Données utilisateur de la semaine:
        ${journalSummary}
        ${ritualSummary}
        ${valuesContext}
        Basé sur cela, fournis un objet JSON avec le bilan.`;
        
    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: {
                type: Type.STRING,
                description: "Un résumé général et bienveillant de la semaine en 2-3 phrases, si possible en lien avec les valeurs de l'utilisateur."
            },
            highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Une liste de 2-3 points forts ou réussites potentiels basés sur les données."
            },
            challenges: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Une liste de 1-2 défis ou points de friction potentiels, formulés de manière constructive."
            },
            ritualConsistency: {
                type: Type.STRING,
                description: "Un bref commentaire sur la régularité des rituels (sans avoir les données exactes, faire une observation générale et encourageante)."
            },
            reflectionQuestion: {
                type: Type.STRING,
                description: "Une question de réflexion pertinente pour la semaine à venir, inspirée par les données et les valeurs de l'utilisateur."
            }
        },
        required: ["summary", "highlights", "challenges", "ritualConsistency", "reflectionQuestion"]
    };
    
    return generateJsonFromAi<any>(prompt, schema);
};


export const generateGuidedJourney = async (topic: string): Promise<GuidedJourney> => {
    const prompt = `Create a simple 5-day guided journey for a user of a wellness app on the topic of "${topic}". The user is French. The journey should be encouraging and practical. Provide the response in JSON format.`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Un titre inspirant pour le parcours." },
            description: { type: Type.STRING, description: "Une courte description du parcours (1-2 phrases)." },
            days: {
                type: Type.ARRAY,
                description: "Une liste de 5 objets, un pour chaque jour du parcours.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "Un titre court pour la tâche du jour (ex: 'Jour 1: Observation')." },
                        task: { type: Type.STRING, description: "Une description claire et concise de la tâche ou de l'exercice pour la journée." }
                    },
                    required: ["title", "task"]
                }
            }
        },
        required: ["title", "description", "days"]
    };

    const result = await generateJsonFromAi<any>(prompt, schema);

    if (!result.days || result.days.length < 5) {
        throw new Error("AI failed to generate a valid journey.");
    }
    return { ...result, days: result.days.slice(0, 5) };
};

export const generatePersonalizedPath = async (userGoal: string, settings: AppSettings): Promise<Omit<PersonalizedPath, 'id' | 'userGoal' | 'steps'> & { steps: Omit<import("../types").PathStep, 'completed'>[] }> => {
    const userContext = generateContextualSummary(settings);
    const coachInstruction = getCoachSystemInstruction(settings);
    
    const prompt = `${coachInstruction} Un utilisateur a l'objectif suivant : "${userGoal}".
    Contexte additionnel de l'utilisateur (à utiliser pour personnaliser subtilement le parcours) : "${userContext}".
    
    Crée un "Parcours Personnalisé" de 5 à 7 jours pour l'aider.
    - Donne un titre inspirant et une courte description au parcours.
    - Pour chaque jour, définis une seule étape concrète, réalisable et pertinente.
    - Chaque étape doit être liée à un module spécifique de l'application. Choisis le module le plus approprié pour la tâche.
    - Formule le titre de l'étape comme une action claire.
    - Formule la tâche (task) comme une instruction bienveillante qui guide l'utilisateur.

    Modules disponibles et leur utilisation :
    - 'journal': Pour l'écriture libre, l'exploration d'émotions.
    - 'thought-court': Pour analyser et restructurer des pensées négatives spécifiques.
    - 'values': Pour se connecter à ce qui est important.
    - 'goals': Pour définir des objectifs concrets.
    - 'calm-space': Pour des exercices de relaxation et d'ancrage rapides.
    - 'assessment': Pour un bilan de bien-être général.
    - 'wounds': Pour l'exploration des blessures émotionnelles.
    - 'gratitude': Pour cultiver la positivité.
    - 'unsent-letters': Pour exprimer des émotions envers quelqu'un ou quelque chose.
    - 'fear-setting': Pour analyser et surmonter des peurs liées à une action.

    Assure-toi que le parcours est logique, progressif et varié. Le format de sortie doit être un JSON.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Un titre inspirant pour le parcours." },
            description: { type: Type.STRING, description: "Une courte description (1-2 phrases) de l'objectif du parcours." },
            steps: {
                type: Type.ARRAY,
                description: "Une liste de 5 à 7 étapes pour le parcours.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.INTEGER, description: "Le numéro du jour (commençant à 1)." },
                        title: { type: Type.STRING, description: "Le titre court et actionnable de l'étape." },
                        task: { type: Type.STRING, description: "L'instruction claire et bienveillante pour l'utilisateur." },
                        moduleId: { type: Type.STRING, description: "L'ID du module de l'application à utiliser (ex: 'journal', 'thought-court')." }
                    },
                    required: ["day", "title", "task", "moduleId"]
                }
            }
        },
        required: ["title", "description", "steps"]
    };

    return generateJsonFromAi<any>(prompt, schema);
};


export const generateAssessmentQuestions = async (): Promise<AssessmentQuestion[]> => {
    const prompt = `Génère un questionnaire de bien-être non clinique de 5 questions pour une application de santé mentale. Les questions doivent être en français et inviter à l'introspection sur des sujets comme le sommeil, l'énergie, les relations, la joie et le stress. Pour chaque question, fournis 5 options de réponse sur une échelle de Likert, du plus négatif au plus positif. Le format de sortie doit être JSON.`;
    
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                questionText: { type: Type.STRING, description: "Le texte de la question posée à l'utilisateur." },
                options: {
                    type: Type.ARRAY,
                    description: "Un tableau de 5 chaînes de caractères représentant les options de réponse.",
                    items: { type: Type.STRING }
                }
            },
            required: ["questionText", "options"]
        }
    };

    const questions = await generateJsonFromAi<AssessmentQuestion[]>(prompt, schema);
    if (!Array.isArray(questions) || questions.length === 0 || questions.some(q => q.options.length !== 5)) {
        throw new Error("AI returned invalid question format.");
    }
    return questions;
};

export const analyzeAssessmentResults = async (questions: AssessmentQuestion[], answers: number[]): Promise<AssessmentResult> => {
    const qaPairs = questions.map((q, i) => `- Question: "${q.questionText}"\n  - Réponse: "${q.options[answers[i]]}" (score ${answers[i] + 1}/5)`).join("\n");

    const prompt = `Analyse les réponses suivantes à un questionnaire de bien-être. L'utilisateur est français. Fournis un résumé bienveillant et encourageant en français, sans poser de diagnostic. Mets en évidence un point fort et suggère une piste de réflexion ou d'amélioration douce. Ne donne pas de score numérique. Les réponses sont sur une échelle de 1 (négatif) à 5 (positif). Voici les questions et les réponses : \n${qaPairs}`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            positiveHighlight: { type: Type.STRING, description: "Une phrase identifiant un point fort ou un aspect positif dans les réponses." },
            gentleSuggestion: { type: Type.STRING, description: "Une phrase proposant une suggestion douce ou une piste de réflexion pour un domaine qui pourrait être amélioré." }
        },
        required: ["positiveHighlight", "gentleSuggestion"]
    };

    return generateJsonFromAi<AssessmentResult>(prompt, schema);
};

export const generateValueMicroActions = async (value: string): Promise<string[]> => {
    const prompt = `Pour la valeur personnelle "${value}", suggère 3 actions concrètes, simples et réalisables en moins de 15 minutes qu'une personne peut faire aujourd'hui pour l'incarner. La réponse doit être en français.`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            actions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["actions"]
    };

    const result = await generateJsonFromAi<{ actions: string[] }>(prompt, schema);
    return result.actions || [];
};

export const generateSuggestionFeed = async (userDataSummary: string, settings: AppSettings): Promise<Suggestion[]> => {
    const coachInstruction = getCoachSystemInstruction(settings);
    const prompt = `${coachInstruction} Analyse le résumé des données utilisateur et génère une liste de 3-4 suggestions d'actions pour sa journée.
        - La première suggestion doit être plus générale, une sorte de "pensée du jour" actionnable (marque-la avec isPrimary: true).
        - Les autres suggestions doivent être des actions concrètes liées aux modules de l'application (journal, ritual, values, goals, thought-court, etc.).
        - Personnalise la "raison" pour chaque suggestion en te basant sur les données.
        - Sois concis.
        - Les moduleId valides sont: 'journal', 'thought-court', 'ritual', 'values', 'goals', 'assessment'.
        
        Données: "${userDataSummary}"`;
        
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Le titre actionnable de la suggestion (ex: 'Réfléchissez à votre journée')." },
                reason: { type: Type.STRING, description: "La raison personnalisée pour laquelle l'utilisateur voit cette suggestion (ex: 'Il semble que vous n'ayez pas encore écrit aujourd'hui.')." },
                ctaText: { type: Type.STRING, description: "Le texte du bouton d'action (ex: 'Ouvrir le journal')." },
                moduleId: { type: Type.STRING, description: "L'ID du module à ouvrir (ex: 'journal')." },
                isPrimary: { type: Type.BOOLEAN, description: "True si c'est la suggestion principale, sinon false." },
            },
            required: ["title", "reason", "ctaText", "moduleId", "isPrimary"]
        }
    };

    const result = await generateJsonFromAi<Suggestion[]>(prompt, schema);
    if (!Array.isArray(result) || result.length === 0) {
        throw new Error("AI failed to generate a valid suggestion feed.");
    }
    if (!result.some(r => r.isPrimary)) {
        result[0].isPrimary = true;
    }
    return result;
};


export const generateRitual = async (goal: string): Promise<{name: string, tasks: string[]}> => {
    const prompt = `Crée un rituel simple (3 à 5 tâches) pour un utilisateur d'application de bien-être qui a pour objectif : "${goal}". La réponse doit être en français. Fournis un nom de rituel et une liste de tâches.`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            name: {
                type: Type.STRING,
                description: "Un nom court et inspirant pour le rituel."
            },
            tasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Une liste de 3 à 5 tâches simples et concrètes pour le rituel."
            }
        },
        required: ["name", "tasks"]
    };

    return generateJsonFromAi<{name: string, tasks: string[]}>(prompt, schema);
};

export const generateCompletionMessage = async (ritualNames: string[]): Promise<string> => {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: `Un utilisateur vient de terminer tous ses rituels quotidiens. Les rituels sont : "${ritualNames.join(', ')}". Génère un message de félicitations court (1 phrase), positif et encourageant en français. Sois chaleureux et, si possible, fais un clin d'œil à l'un des thèmes des rituels.`
    });
    return response.text.trim().replace(/"/g, '');
};

export const generateGoalSteps = async (goalTitle: string, userRituals: Ritual[]): Promise<{title: string; linkedModule: GoalLinkedModule | null; suggestedRitualName: string | null}[]> => {
    const ritualContext = userRituals.length > 0
        ? `L'utilisateur a déjà les rituels suivants : ${userRituals.map(r => `"${r.name}"`).join(', ')}. Si une étape correspond à l'un de ces rituels, suggère de le lier.`
        : "L'utilisateur n'a pas encore de rituels.";

    const prompt = `Un utilisateur français veut atteindre l'objectif suivant : "${goalTitle}". Décompose cet objectif en 3 à 5 étapes concrètes et réalisables. Pour chaque étape, identifie si elle peut être liée à un module de l'application ('ritual', 'journal', 'assessment'). ${ritualContext}`;
    
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                title: {
                    type: Type.STRING,
                    description: "Le titre court et clair de l'étape."
                },
                linkedModule: {
                    type: Type.STRING,
                    description: "Le type de module à lier ('ritual', 'journal', 'assessment') ou null si aucun lien direct."
                },
                suggestedRitualName: {
                    type: Type.STRING,
                    description: "Si linkedModule est 'ritual', le nom exact d'un rituel existant à suggérer. Sinon, null."
                }
            },
            required: ["title", "linkedModule"]
        }
    };
    return generateJsonFromAi<any[]>(prompt, schema);
};

export const generateQuickReframe = async (distressingThought: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: `Agis comme un thérapeute bienveillant et calme. Un utilisateur se sent dépassé et a partagé cette pensée angoissante : "${distressingThought}". Fournis UNE seule perspective alternative, douce et recadrée pour l'aider à apaiser cette pensée. Sois concis (2-3 phrases maximum) et réconfortant. Réponds en français. Ne commence pas par "Voici une perspective alternative".`,
    });
    return response.text.trim().replace(/"/g, '');
};

export const findSilverLining = async (toughDayDescription: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: `Agis comme un coach bienveillant. Un utilisateur a du mal à trouver de la gratitude aujourd'hui. Voici sa description : "${toughDayDescription}". Aide-le à trouver une "lueur d'espoir" (silver lining) - une chose, même petite, pour laquelle il pourrait être reconnaissant. Sois doux, empathique et propose une perspective constructive. Réponds avec une seule phrase de gratitude suggérée que l'utilisateur pourra noter. Ne l'entoure pas de guillemets.`,
    });
    return response.text.trim();
};

export const getDailyAffirmation = async (): Promise<string> => {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: `Génère une affirmation positive courte, puissante et encourageante en français. Elle doit être à la première personne (Je...) et inspirante pour une personne utilisant une application de bien-être. Ne l'entoure pas de guillemets.`,
    });
    return response.text.trim();
};

export const generateJournalPrompt = async (): Promise<string> => {
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: `Génère une seule question de journal introspective et ouverte en français. La question doit être bienveillante et encourager une réflexion profonde sur les émotions, les expériences ou la croissance personnelle. Sois concis. Ne l'entoure pas de guillemets.`,
    });
    return response.text.trim();
};

export const getConversationFeedback = async (chatHistory: { role: 'user' | 'model'; text: string }[]): Promise<ConversationFeedback> => {
    const conversationTranscript = chatHistory.map(m => `${m.role === 'user' ? 'Utilisateur' : 'Personnage'}: ${m.text}`).join('\n');

    const prompt = `En tant que coach en communication, analyse la transcription de conversation suivante. L'objectif de l'utilisateur était de s'entraîner pour une conversation difficile.
        Concentre-toi UNIQUEMENT sur les répliques de "l'Utilisateur". Fournis des commentaires constructifs et bienveillants en français.

        Transcription:
        ${conversationTranscript}
        `;
        
    const schema = {
        type: Type.OBJECT,
        properties: {
            strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 points forts dans la communication de l'utilisateur (ex: 'Bonne utilisation de phrases en 'Je'', 'Clarté de l'objectif')."
            },
            improvements: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 points d'amélioration constructifs (ex: 'Pourrait être plus direct', 'Attention au ton accusateur')."
            },
            suggestions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        original: { type: Type.STRING, description: "Une phrase exacte dite par l'utilisateur qui pourrait être améliorée." },
                        suggested: { type: Type.STRING, description: "Une reformulation suggérée pour cette phrase." }
                    },
                        required: ["original", "suggested"]
                },
                description: "Fournis 1 ou 2 exemples concrets de reformulation de phrases dites par l'utilisateur."
            }
        },
        required: ["strengths", "improvements", "suggestions"]
    };

    return generateJsonFromAi<ConversationFeedback>(prompt, schema);
};

export const generateProactiveMessage = async (userDataSummary: string, settings: AppSettings): Promise<ProactiveSuggestion | null> => {
    if (userDataSummary.includes("L'utilisateur est nouveau") || userDataSummary.includes("Le partage de contexte est désactivé")) {
        return null;
    }

    const coachInstruction = getCoachSystemInstruction(settings);
    const prompt = `${coachInstruction} Analyse ce résumé des données utilisateur et génère UN SEUL message proactif et personnalisé. Le but est de faire un check-in pertinent, pas une suggestion générique.
        - Trouve un point saillant (ex: humeur basse, rituel manqué, valeur non explorée).
        - Formule un message court et empathique à ce sujet.
        - Propose une action simple via un module de l'app.
        - Sois très concis.
        - Si aucun point saillant ne se dégage, réponds avec un JSON contenant des chaînes vides.
        - Les moduleId valides sont: 'journal', 'thought-court', 'ritual', 'values', 'goals', 'calm-space'.

        Données: "${userDataSummary}"`;
        
    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Un titre court et engageant (ex: 'Petite vérification')." },
            message: { type: Type.STRING, description: "Le message empathique et personnalisé (1-2 phrases)." },
            ctaText: { type: Type.STRING, description: "Le texte du bouton d'action (ex: 'Explorer mes pensées')." },
            moduleId: { type: Type.STRING, description: "L'ID du module à ouvrir (ex: 'journal')." },
        },
        required: ["title", "message", "ctaText", "moduleId"]
    };

    const result = await generateJsonFromAi<ProactiveSuggestion>(prompt, schema);
    if (!result.title || !result.message) {
        return null;
    }
    return result;
};

export const analyzeUnsentLetter = async (recipient: string, content: string, settings: AppSettings, connections?: Connection[]): Promise<UnsentLetterAnalysis> => {
    let connectionsContext = '';
    if (connections && connections.length > 0) {
        const allowedConnections = connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté au module '${conn.moduleId}' : "${conn.entryTitle}"`);
            connectionsContext = `Cette lettre est connectée aux éléments suivants. Utilise ce contexte pour enrichir ton analyse, notamment sur les besoins non satisfaits:\n${connectionSummaries.join('\n')}\n`;
        }
    }
    
    const prompt = `Analyse cette "lettre non envoyée" d'un utilisateur. Le destinataire est "${recipient}". Le but est de fournir à l'utilisateur une perspective claire et bienveillante sur ses propres émotions. Réponds en français.
        ${connectionsContext}
        Contenu de la lettre:
        "${content}"`;
        
    const schema = {
        type: Type.OBJECT,
        properties: {
            keyEmotions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-4 émotions fondamentales exprimées dans la lettre (ex: 'Colère', 'Tristesse', 'Besoin de reconnaissance')."
            },
            unmetNeeds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 1-3 besoins non satisfaits que la lettre semble révéler (ex: 'Besoin de sécurité', 'Besoin d'être entendu')."
            },
            reflectionPrompt: {
                type: Type.STRING,
                description: "Une question de réflexion douce et ouverte pour aider l'utilisateur à traiter le contenu de la lettre et à trouver une forme de clôture."
            }
        },
        required: ["keyEmotions", "unmetNeeds", "reflectionPrompt"]
    };
    return generateJsonFromAi<UnsentLetterAnalysis>(prompt, schema);
};

export const generateFearSettingSuggestions = async (action: string, fear: string): Promise<{ prevention: string[]; repair: string[] }> => {
    const prompt = `Un utilisateur envisage l'action suivante : "${action}".
        Pour cette action, il a identifié une peur spécifique : "${fear}".
        Génère des suggestions concrètes pour un exercice de "fear setting" en français.
        Fournis des idées pour :
        1. Prévenir cette situation (prévention).
        2. Réparer les dégâts si elle se produisait quand même (réparation).
        Sois concis, pragmatique et encourageant.`;
        
    const schema = {
        type: Type.OBJECT,
        properties: {
            prevention: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Une liste de 2-3 actions concrètes pour empêcher la peur de se réaliser."
            },
            repair: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Une liste de 2-3 actions concrètes pour réparer la situation si la peur se réalisait."
            }
        },
        required: ["prevention", "repair"]
    };
    return generateJsonFromAi<{ prevention: string[]; repair: string[] }>(prompt, schema);
};

export const analyzeProgress = async (summary: string): Promise<ProgressAnalysis> => {
    const prompt = `Analyze this user's progress summary from a wellness app. The user is French. Provide a positive observation, an area for attention, and an actionable suggestion. Keep it concise and encouraging. The user data is: ${summary}`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            positiveObservation: {
                type: Type.STRING,
                description: "Une observation positive et encourageante sur les progrès de l'utilisateur."
            },
            areaForAttention: {
                type: Type.STRING,
                description: "Un domaine qui pourrait bénéficier d'un peu plus d'attention, formulé de manière douce."
            },
            actionableSuggestion: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "Une suggestion d'action concrète." },
                    moduleId: { type: Type.STRING, description: "L'ID du module de l'application pertinent pour l'action." },
                    ctaText: { type: Type.STRING, description: "Le texte du bouton d'appel à l'action." }
                },
                required: ["text", "moduleId", "ctaText"]
            }
        },
        required: ["positiveObservation", "areaForAttention", "actionableSuggestion"]
    };

    return generateJsonFromAi<ProgressAnalysis>(prompt, schema);
};

export const generateWoundExercise = async (wound: CoreWound): Promise<{ title: string; prompt: string }> => {
    const prompt = `Génère un court exercice d'écriture introspectif (un titre et une seule question/prompt) pour une personne travaillant sur sa blessure émotionnelle de "${wound}". L'exercice doit être bienveillant, constructif et viser la transmutation de la blessure en force. Réponds en français.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Un titre court et inspirant pour l'exercice." },
            prompt: { type: Type.STRING, description: "La question ou le prompt de réflexion pour l'utilisateur." }
        },
        required: ["title", "prompt"]
    };
    return generateJsonFromAi<{ title: string; prompt: string }>(prompt, schema);
};

export const analyzeRelationalEcosystem = async (contacts: RelationalContact[], settings: AppSettings): Promise<RelationalEcosystemAnalysis> => {
    const coachInstruction = getCoachSystemInstruction(settings);
    const contactsSummary = contacts.map(c => `- ${c.name} (Influence: ${c.influence}, Archétype: ${c.archetype})`).join('\n');
    const prompt = `${coachInstruction} Analyse cet écosystème relationnel. Identifie les forces, les déséquilibres potentiels, et propose une suggestion constructive pour l'améliorer. Sois concis et perspicace. Voici les contacts:\n${contactsSummary}`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            strengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 1-2 points forts évidents dans cet écosystème."
            },
            imbalances: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 1-2 déséquilibres ou points de vigilance potentiels."
            },
            suggestion: {
                type: Type.STRING,
                description: "Une suggestion constructive pour cultiver un écosystème plus sain."
            }
        },
        required: ["strengths", "imbalances", "suggestion"]
    };
    return generateJsonFromAi<RelationalEcosystemAnalysis>(prompt, schema);
};

export const getHerbariumInfo = async (itemName: string): Promise<HerbariumInfo> => {
    const prompt = `Fournis des informations sur "${itemName}" pour une application de bien-être. L'utilisateur est français. Sois concis et pratique.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: "Une courte description poétique ou symbolique." },
            mainBenefits: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 bienfaits principaux (non médicaux)."
            },
            simpleUses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 utilisations simples et pratiques (ex: 'En infusion avant de dormir')."
            },
            precautions: { type: Type.STRING, description: "Une brève mise en garde ou précaution d'usage générale." }
        },
        required: ["description", "mainBenefits", "simpleUses", "precautions"]
    };
    return generateJsonFromAi<HerbariumInfo>(prompt, schema);
};

export const getCrystalInfo = async (crystalName: string): Promise<CrystalInfo> => {
    const prompt = `Crée un contenu court pour une méditation guidée sur le cristal "${crystalName}" pour une application de bien-être. L'utilisateur est français.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            intention: { type: Type.STRING, description: "L'intention principale associée à ce cristal (ex: 'Amour de soi')." },
            affirmation: { type: Type.STRING, description: "Une affirmation positive courte à la première personne (Je...)." },
            meditationPrompt: { type: Type.STRING, description: "Une phrase simple pour guider le début d'une méditation." }
        },
        required: ["intention", "affirmation", "meditationPrompt"]
    };
    return generateJsonFromAi<CrystalInfo>(prompt, schema);
};

export const analyzeArtTherapyDrawing = async (base64Image: string): Promise<ArtTherapyAnalysis> => {
    const prompt = "Analyse ce dessin d'art-thérapie. L'utilisateur est français. Fournis une interprétation symbolique et bienveillante, ainsi qu'une question de réflexion. Ne fais pas de diagnostic. Sois encourageant.";
    const imagePart = {
        inlineData: {
            mimeType: 'image/png',
            data: base64Image,
        },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    interpretation: { type: Type.STRING, description: "Une interprétation symbolique et douce du dessin (2-3 phrases)." },
                    reflectionPrompt: { type: Type.STRING, description: "Une question ouverte pour aider l'utilisateur à explorer son œuvre." }
                },
                required: ["interpretation", "reflectionPrompt"]
            }
        },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as ArtTherapyAnalysis;
};

export const generateMonthlySynthesis = async (dataSummary: string, settings: AppSettings): Promise<Omit<SynthesisReport, 'monthId'>> => {
    const coachInstruction = getCoachSystemInstruction(settings);
    const prompt = `${coachInstruction} Analyse ce résumé de données mensuelles d'un utilisateur et génère une synthèse. Sois perspicace et bienveillant. Résumé des données:\n${dataSummary}`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            emergingThemes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 thèmes principaux qui émergent des données du mois."
            },
            progressSummary: { type: Type.STRING, description: "Un résumé des progrès et habitudes observés (rituels, objectifs)." },
            wisdomFromWritings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Extrait 1 ou 2 citations courtes et marquantes des entrées de journal de l'utilisateur."
            },
            suggestionsForNextMonth: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 suggestions concrètes pour le mois à venir."
            }
        },
        required: ["emergingThemes", "progressSummary", "wisdomFromWritings", "suggestionsForNextMonth"]
    };
    return generateJsonFromAi<Omit<SynthesisReport, 'monthId'>>(prompt, schema);
};

export const generateThematicSynthesis = async (theme: string, settings: AppSettings): Promise<Omit<ThematicSynthesis, 'theme'>> => {
    const coachInstruction = getCoachSystemInstruction(settings);
    
    let contextItems: ConnectableItem[] = [];
    const lowerCaseTheme = theme.toLowerCase();

    if (settings.shareContextWithAI.journal) {
        const journalEntries = storage.get<JournalEntry[]>(JOURNAL_STORAGE_KEY, []);
        contextItems = contextItems.concat(journalEntries.map(e => ({ 
            id: e.id, title: e.title, moduleId: 'journal', date: e.date, snippet: e.content 
        })));
    }
    if (settings.shareContextWithAI['thought-court']) {
        const thoughtCases = storage.get<ThoughtCase[]>(THOUGHT_COURT_STORAGE_KEY, []);
        contextItems = contextItems.concat(thoughtCases.map(c => ({ 
            id: c.id, title: c.negativeThought, moduleId: 'thought-court', date: c.date, snippet: `Preuves contre: ${c.evidenceAgainst}\nPensée équilibrée: ${c.balancedThought}` 
        })));
    }
    if (settings.shareContextWithAI['unsent-letters']) {
        const letters = storage.get<UnsentLetter[]>(UNSENT_LETTER_STORAGE_KEY, []);
        contextItems = contextItems.concat(letters.map(l => ({ 
            id: l.id, title: l.subject, moduleId: 'unsent-letters', date: l.date, snippet: `À: ${l.recipient}. Contenu: ${l.content}` 
        })));
    }
    if (settings.shareContextWithAI['dream-journal']) {
        const dreams = storage.get<DreamEntry[]>(DREAM_JOURNAL_STORAGE_KEY, []);
        contextItems = contextItems.concat(dreams.map(d => ({
            id: d.id, title: d.title, moduleId: 'dream-journal', date: d.date, snippet: d.content
        })));
    }

    const relevantItems = contextItems
        .filter(item => 
            item.title.toLowerCase().includes(lowerCaseTheme) || 
            item.snippet.toLowerCase().includes(lowerCaseTheme)
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);

    if (relevantItems.length === 0) {
        throw new Error("Aucune entrée pertinente trouvée pour ce thème. Essayez un autre mot-clé ou écrivez davantage dans vos journaux.");
    }
    
    const contextString = relevantItems.map(item => 
        `---
        Module: ${item.moduleId}
        ID: ${item.id}
        Titre: "${item.title}"
        Contenu: "${item.snippet.substring(0, 300)}..."
        ---`
    ).join('\n');

    const prompt = `${coachInstruction} Un utilisateur souhaite explorer le thème "${theme}" à travers ses données. Analyse les extraits suivants pour générer une synthèse thématique profonde.

    **Instructions:**
    1.  Lis tous les extraits fournis.
    2.  Écris un résumé ('summary') qui explique comment le thème "${theme}" se manifeste dans la vie de l'utilisateur.
    3.  Identifie 2-3 prises de conscience ('keyInsights') clés. Pour chaque insight, tu DOIS citer les entrées qui le soutiennent en utilisant leur 'Module', 'ID' et 'Titre' dans le tableau 'supportingEntries'. Sois précis.
    4.  Décris un schéma de pensée ou de comportement récurrent ('emergingPattern') lié au thème.
    5.  Pose une question de réflexion ('reflectionPrompt') puissante pour aider l'utilisateur à approfondir.
    
    **Extraits des données de l'utilisateur:**
    ${contextString}`;
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: "Un résumé de la manière dont le thème apparaît dans les données de l'utilisateur." },
            keyInsights: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        insight: { type: Type.STRING, description: "Une observation clé ou une prise de conscience." },
                        supportingEntries: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    moduleId: { type: Type.STRING },
                                    entryId: { type: Type.STRING },
                                    title: { type: Type.STRING }
                                },
                                required: ["moduleId", "entryId", "title"]
                            }
                        }
                    },
                    required: ["insight", "supportingEntries"]
                }
            },
            emergingPattern: { type: Type.STRING, description: "Un schéma de pensée ou de comportement récurrent lié au thème." },
            reflectionPrompt: { type: Type.STRING, description: "Une question puissante pour aider l'utilisateur à approfondir sa réflexion." }
        },
        required: ["summary", "keyInsights", "emergingPattern", "reflectionPrompt"]
    };
    return generateJsonFromAi<Omit<ThematicSynthesis, 'theme'>>(prompt, schema);
};

export const getTreeInfo = async (treeName: string): Promise<TreeInfo> => {
    const prompt = `Fournis des informations symboliques sur l'arbre "${treeName}" pour une application de bien-être. L'utilisateur est français. Sois concis et inspirant.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: "Une courte description poétique ou symbolique de l'arbre." },
            symbolism: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 symboles clés associés à cet arbre."
            },
            reflectionPrompt: { type: Type.STRING, description: "Une question de réflexion inspirée par les qualités de l'arbre." }
        },
        required: ["description", "symbolism", "reflectionPrompt"]
    };
    return generateJsonFromAi<TreeInfo>(prompt, schema);
};

export const getAnimalInfo = async (animalName: string): Promise<AnimalInfo> => {
    const prompt = `Fournis des informations symboliques sur l'animal "${animalName}" pour une application de bien-être. L'utilisateur est français. Sois concis et inspirant.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: "Une courte description poétique ou symbolique de l'animal." },
            symbolism: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Liste de 2-3 symboles clés associés à cet animal."
            },
            lifeLesson: { type: Type.STRING, description: "Une leçon de vie que l'on peut apprendre de cet animal." }
        },
        required: ["description", "symbolism", "lifeLesson"]
    };
    return generateJsonFromAi<AnimalInfo>(prompt, schema);
};

export const generateRhythmAdvice = async (chronotype: Chronotype, season: InnerSeason): Promise<{ title: string; advice: string; icon: string }> => {
    const prompt = `Génère un conseil du jour court et actionnable pour une personne avec un chronotype "${chronotype}" et qui se sent dans sa saison intérieure "${season}". Le conseil doit être en français, bienveillant et pratique. Fournis un titre, le conseil, et un emoji pertinent.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Un titre court et accrocheur." },
            advice: { type: Type.STRING, description: "Le conseil du jour (1-2 phrases)." },
            icon: { type: Type.STRING, description: "Un seul emoji pertinent." }
        },
        required: ["title", "advice", "icon"]
    };
    return generateJsonFromAi<{ title: string; advice: string; icon: string }>(prompt, schema);
};

export const generateGratitudeReflection = async (items: string[]): Promise<string> => {
    const prompt = `Based on these points of gratitude: "${items.join(', ')}", generate a short, insightful reflection question to deepen the user's practice. The user is French. The question must be in French.`;
    const response = await ai.models.generateContent({
        model: GEMINI_FLASH_MODEL,
        contents: prompt,
    });
    return response.text.trim().replace(/"/g, '');
};

export const generateWordTreeWords = async (rootWord: string): Promise<string[]> => {
    const prompt = `Pour le mot racine "${rootWord}", génère une liste de 6 à 10 mots ou courtes expressions associés, évoquant des concepts liés, des synonymes poétiques ou des idées qui en découlent. La réponse doit être en français.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            words: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
        required: ["words"]
    };
    const result = await generateJsonFromAi<{ words: string[] }>(prompt, schema);
    return result.words || [];
};

export const analyzeBodyMap = async (emotion: string, sensations: string[], base64Image: string, settings: AppSettings, connections?: Connection[]): Promise<BodyMapAnalysis> => {
    let connectionsContext = '';
    if (connections && connections.length > 0) {
        const allowedConnections = connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté à '${conn.entryTitle}' (${conn.moduleId})`).join('\n');
            connectionsContext = `Cette carte est connectée aux éléments suivants. Utilise ce contexte pour une interprétation plus profonde :\n${connectionSummaries}\n`;
        }
    }
    const prompt = `Analyse cette cartographie corporelle pour l'émotion "${emotion}". L'image montre où les sensations sont ressenties. Fournis une interprétation somatique, une suggestion corporelle douce et une question de réflexion. Sois bienveillant et non clinique. ${connectionsContext}`;
    
    const imagePart = {
        inlineData: {
            mimeType: 'image/png',
            data: base64Image,
        },
    };
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    interpretation: { type: Type.STRING, description: "Interprétation somatique de la localisation des sensations (ex: 'La tension dans les épaules suggère un fardeau...')." },
                    suggestion: { type: Type.STRING, description: "Une suggestion corporelle simple (ex: 'Essayez d'étirer doucement votre cou...')." },
                    reflectionPrompt: { type: Type.STRING, description: "Une question pour approfondir la réflexion (ex: 'Qu'est-ce que vos épaules essaient de vous dire ?')." }
                },
                required: ["interpretation", "suggestion", "reflectionPrompt"]
            }
        },
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as BodyMapAnalysis;
};

export const analyzeFearSettingExercise = async (exercise: FearSettingExercise, settings: AppSettings): Promise<FearSettingAnalysis> => {
    let connectionsContext = '';
    if (exercise.connections && exercise.connections.length > 0) {
        const allowedConnections = exercise.connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté à '${conn.entryTitle}' (${conn.moduleId})`).join('\n');
            connectionsContext = `Cet exercice est connecté aux éléments suivants. Utilise ce contexte pour une analyse plus profonde:\n${connectionSummaries}\n`;
        }
    }

    const exerciseSummary = `
    Action: ${exercise.action}
    Pires scénarios: ${exercise.scenarios.map(s => s.fear).join(', ')}
    Bénéfices: ${exercise.benefits}
    Coût de l'inaction: 6 mois: ${exercise.costOfInaction.sixMonths}, 1 an: ${exercise.costOfInaction.oneYear}, 3 ans: ${exercise.costOfInaction.threeYears}
    `;

    const coachInstruction = getCoachSystemInstruction(settings);
    const prompt = `${coachInstruction} Analyse cet exercice de "fear setting". Fournis un résumé, identifie la peur fondamentale sous-jacente, et propose une perspective encourageante pour aider l'utilisateur à avancer.
    ${connectionsContext}
    Données de l'exercice:
    ${exerciseSummary}
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING, description: "Un résumé de l'exercice, mettant en évidence le conflit principal entre la peur et les bénéfices." },
            coreFear: { type: Type.STRING, description: "La peur fondamentale qui semble être à la racine (ex: 'Peur de l'échec', 'Peur du jugement')." },
            empoweringInsight: { type: Type.STRING, description: "Une perspective ou une question encourageante qui recadre la situation." }
        },
        required: ["summary", "coreFear", "empoweringInsight"]
    };
    return generateJsonFromAi<FearSettingAnalysis>(prompt, schema);
};

export const weaveNarrativeArcStory = async (entry: NarrativeArcEntry, settings: AppSettings): Promise<NarrativeArcAnalysis> => {
    let connectionsContext = '';
    if (entry.connections && entry.connections.length > 0) {
        const allowedConnections = entry.connections.filter(c => settings.shareContextWithAI[c.moduleId]);
        if (allowedConnections.length > 0) {
            const connectionSummaries = allowedConnections.map(conn => `- Connecté à '${conn.entryTitle}' (${conn.moduleId})`).join('\n');
            connectionsContext = `Ce récit est connecté aux éléments suivants. Utilise ce contexte pour enrichir l'histoire:\n${connectionSummaries}\n`;
        }
    }

    const entrySummary = `
    - Situation: ${entry.situation}
    - Défi: ${entry.challenge}
    - Tournant: ${entry.turningPoint}
    - Résolution & Leçon: ${entry.resolution}
    `;

    const coachInstruction = getCoachSystemInstruction(settings);
    const prompt = `${coachInstruction} Tu es un conteur sage qui aide les gens à trouver du sens dans leurs expériences.
    L'utilisateur a fourni les éléments d'une expérience difficile. Ton rôle est de les tisser en un récit de croissance puissant et inspirant, à la troisième personne (en parlant de "l'utilisateur" ou "la personne").
    - Donne un titre évocateur à l'histoire.
    - Écris l'histoire de manière fluide, en reliant les quatre parties fournies. L'histoire doit être d'environ 3-4 paragraphes.
    - Extrais la leçon de croissance la plus importante de cette expérience.
    ${connectionsContext}
    Données de l'utilisateur:
    ${entrySummary}
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "Un titre poétique et évocateur pour l'histoire." },
            story: { type: Type.STRING, description: "Le récit complet et inspirant de l'expérience, tissé à partir des éléments fournis par l'utilisateur." },
            keyLesson: { type: Type.STRING, description: "La leçon de croissance fondamentale que l'on peut tirer de cette histoire." }
        },
        required: ["title", "story", "keyLesson"]
    };
    return generateJsonFromAi<NarrativeArcAnalysis>(prompt, schema);
};