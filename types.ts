import React from 'react';

// --- MODULES ---

export type ModuleId = 'journal' | 'gratitude' | 'thought-court' | 'ritual' | 'values' | 'goals' | 'weekly-review' | 'synthesis' | 'assessment' | 'progress' | 'rhythm' | 'wounds' | 'relational-ecosystem' | 'body-map' | 'guided-journey' | 'personalized-path' | 'communication-arena' | 'unsent-letters' | 'fear-setting' | 'sanctuary' | 'art-therapy' | 'coach-ai' | 'calm-space' | 'settings' | 'oracle' | 'dream-journal' | 'narrative-arc' | 'admin' | 'archetypes' | 'sacred-nutrition';

export interface Module {
    id: ModuleId;
    name: string;
    description: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

// --- SHARED & COMMON ---

export interface Connection {
    moduleId: ModuleId;
    entryId: string;
    entryTitle: string;
}

export interface ConnectableItem {
    id: string;
    title: string;
    moduleId: ModuleId;
    date: string; // ISO string
    snippet: string;
}

export interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'destructive' | 'info';
}

export interface NavigationPayload {
  title?: string;
  content?: string;
}

// --- AI & COACH ---

export type CoachPersonality = 'Bienveillant' | 'Direct' | 'Philosophe';
export type CoachTone = 'Encourageant' | 'Neutre' | 'Stimulant';

export interface ToolCall {
    name: string;
    arguments: {
        moduleId: ModuleId;
        reason: string;
        cta: string;
    };
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    toolCall?: ToolCall;
}

export interface ConversationFeedback {
    strengths: string[];
    improvements: string[];
    suggestions: { original: string; suggested: string }[];
}

// --- DATA STRUCTURES (per module) ---

export interface FoodLog {
    id: string;
    mealType: 'Petit-déjeuner' | 'Déjeuner' | 'Dîner' | 'En-cas';
    description: string;
    moodTags: string[];
}

export interface JournalCoachAnalysis {
    emotions: string[];
    themes: string[];
    emotionalInsight: string;
    suggestedPractice: {
        name: string;
        rationale: string;
        icon: string; // emoji
        actionModuleId?: ModuleId;
    };
}

export interface JournalEntry {
    id: string;
    date: string; // ISO string
    title: string;
    content: string;
    mood?: string; // emoji
    foodLogs?: FoodLog[];
    analysis?: JournalCoachAnalysis;
    isAnalyzing?: boolean;
    analysisError?: boolean;
    connections?: Connection[];
}

export interface GratitudeItem {
    id: string;
    text: string;
}
export interface GratitudeEntry {
    date: string; // YYYY-MM-DD
    items: GratitudeItem[];
    reflection?: string;
    isGeneratingReflection?: boolean;
}
export type GratitudeStorage = GratitudeEntry[];

export interface ThoughtCase {
    id: string;
    date: string; // ISO string
    negativeThought: string;
    evidenceFor: string;
    evidenceAgainst: string;
    balancedThought: string;
    analysis?: {
        distortions: string[];
        alternativePerspectives: string[];
        balancedThought: string;
    };
    isAnalyzing?: boolean;
    analysisError?: boolean;
    connections?: Connection[];
}

export interface RitualTask {
    id: string;
    text: string;
}

export interface Ritual {
    id: string;
    name: string;
    tasks: RitualTask[];
}

export interface RitualsStorage {
    rituals: Ritual[];
    completions: { [date: string]: string[] }; // date string 'YYYY-MM-DD' -> array of task ids
}

export interface UserValues {
    prioritizedValues: string[];
    reflectionQuestions: { [value: string]: string };
}

export type GoalLinkedModule = 'ritual' | 'journal' | 'assessment';

export interface GoalStep {
    id: string;
    title: string;
    completed: boolean;
    linkedModule: GoalLinkedModule | null;
    linkedRitualId?: string | null;
}

export interface Goal {
    id: string;
    title: string;
    steps: GoalStep[];
    connections?: Connection[];
}

export type GoalsStorage = Goal[];

export interface WeeklyReview {
    summary: string;
    highlights: string[];
    challenges: string[];
    ritualConsistency: string;
    reflectionQuestion: string;
}

export type WeeklyReviewStorage = {
    [weekId: string]: WeeklyReview; // weekId 'YYYY-WXX'
};

export interface SynthesisReport {
    monthId: string; // YYYY-MM
    emergingThemes: string[];
    progressSummary: string;
    wisdomFromWritings: string[];
    suggestionsForNextMonth: string[];
}

export type SynthesisStorage = {
    [monthId: string]: SynthesisReport;
};

export interface ThematicSynthesis {
    theme: string;
    summary: string;
    keyInsights: {
        insight: string;
        supportingEntries: {
            moduleId: ModuleId;
            entryId: string;
            title: string;
        }[];
    }[];
    emergingPattern: string;
    reflectionPrompt: string;
}

export interface AssessmentQuestion {
    questionText: string;
    options: string[];
}

export interface AssessmentResult {
    positiveHighlight: string;
    gentleSuggestion: string;
}

export interface Assessment {
    id: string;
    date: string; // ISO string
    questions: AssessmentQuestion[];
    answers: number[];
    result: AssessmentResult;
}
export type AssessmentStorage = Assessment[];

export interface RecentStep extends GoalStep {
    goalTitle: string;
}

export interface ProgressAnalysis {
    positiveObservation: string;
    areaForAttention: string;
    actionableSuggestion: {
        text: string;
        moduleId: ModuleId;
        ctaText: string;
    };
}

export interface ProgressAnalysisCache {
    date: string; // YYYY-MM-DD
    analysis: ProgressAnalysis;
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    unlockedAt?: string; // ISO string
}

export type Chronotype = 'Alouette' | 'Bimodal' | 'Hibou' | 'Indéterminé';
export type InnerSeason = 'Printemps' | 'Été' | 'Automne' | 'Hiver';

export interface RhythmData {
    chronotype: Chronotype;
    season: InnerSeason | null;
}

export interface DailyRhythmAdvice {
    date: string; // YYYY-MM-DD
    title: string;
    advice: string;
    icon: string; // emoji
}

export type CoreWound = 'Rejet' | 'Abandon' | 'Humiliation' | 'Trahison' | 'Injustice' | 'Indéterminée';

export interface WoundExercise {
    id: string;
    date: string; // ISO string
    promptTitle: string;
    prompt: string;
    response: string;
}

export interface TransmutationExercise {
    id: string;
    shadow: string;
    light: string;
    affirmation: string;
}

export interface WoundsData {
    primaryWound: CoreWound;
    exercises: WoundExercise[];
}

export type InfluenceType = 'ascendante' | 'neutre' | 'descendante';
export type ArchetypeType = 'Architecte' | 'Gardien' | 'Éclaireur' | 'Compagnon' | 'Indéfini';

export interface RelationalContact {
    id: string;
    name: string;
    influence: InfluenceType;
    archetype: ArchetypeType;
}

export type RelationalEcosystemStorage = RelationalContact[];
export interface RelationalEcosystemAnalysis {
    strengths: string[];
    imbalances: string[];
    suggestion: string;
}

export interface BodyMapAnalysis {
    interpretation: string;
    suggestion: string;
    reflectionPrompt: string;
}

export interface BodyMapEntry {
    id: string;
    date: string; // ISO string
    emotion: string;
    sensations: string[];
    imageDataUrl: string; // base64 encoded png
    analysis?: BodyMapAnalysis;
    isAnalyzing?: boolean;
    analysisError?: boolean;
    connections?: Connection[];
}

export type BodyMapStorage = BodyMapEntry[];

export interface GuidedJourneyDayState {
    completed: boolean;
    response: string;
}

export interface GuidedJourney {
    id: string;
    title: string;
    description: string;
    days: {
        title: string;
        task: string;
        moduleId?: ModuleId;
    }[];
}

export interface GuidedJourneyStorage {
    journeyId: string;
    startDate: string; // ISO string
    dayStates: GuidedJourneyDayState[];
}

export interface PathStep {
    day: number;
    title: string;
    task: string;
    moduleId: ModuleId;
    completed: boolean;
}

export interface PersonalizedPath {
    id: string;
    userGoal: string;
    title: string;
    description: string;
    steps: PathStep[];
}

export interface UnsentLetterAnalysis {
    keyEmotions: string[];
    unmetNeeds: string[];
    reflectionPrompt: string;
}

export interface UnsentLetter {
    id: string;
    date: string; // ISO string
    recipient: string;
    subject: string;
    content: string;
    analysis?: UnsentLetterAnalysis;
    isAnalyzing?: boolean;
    analysisError?: boolean;
    connections?: Connection[];
}

export interface FearSettingScenario {
    id: string;
    fear: string;
    prevention: string;
    repair: string;
}

export interface FearSettingAnalysis {
    summary: string;
    coreFear: string;
    empoweringInsight: string;
}

export interface FearSettingExercise {
    id: string;
    date: string; // ISO string
    action: string;
    scenarios: FearSettingScenario[];
    benefits: string;
    costOfInaction: {
        sixMonths: string;
        oneYear: string;
        threeYears: string;
    };
    analysis?: FearSettingAnalysis;
    isAnalyzing?: boolean;
    analysisError?: boolean;
    connections?: Connection[];
}

export interface HerbariumInfo {
    description: string;
    mainBenefits: string[];
    simpleUses: string[];
    precautions: string;
}

export interface CrystalInfo {
    intention: string;
    affirmation: string;
    meditationPrompt: string;
}

export interface ArtTherapyAnalysis {
    interpretation: string;
    reflectionPrompt: string;
}

export interface TreeInfo {
    description: string;
    symbolism: string[];
    reflectionPrompt: string;
}

export interface AnimalInfo {
    description: string;
    symbolism: string[];
    lifeLesson: string;
}

export interface OracleCard {
  id: number;
  title: string;
  image: string;
  description: string;
  poem: string[]; // array of strings for paragraphs
}

export interface OracleDraw {
  id: string;
  date: string; // ISO
  question: string;
  spreadType: string; // e.g., 'Guidance du Jour', 'Passé-Présent-Futur'
  cards: {
      card: OracleCard;
      position: string; // e.g., 'Le Présent', 'Le Défi'
  }[];
  interpretation?: string;
  connections?: Connection[];
}

export interface DreamAnalysis {
    symbols: {
        symbol: string;
        interpretation: string;
    }[];
    overallMeaning: string;
    reflectionPrompt: string;
}

export interface DreamEntry {
    id: string;
    date: string; // ISO string
    title: string;
    content: string;
    clarity: 'low' | 'medium' | 'high';
    emotions: string[];
    analysis?: DreamAnalysis;
    isAnalyzing?: boolean;
    analysisError?: boolean;
    connections?: Connection[];
}

export type DreamJournalStorage = DreamEntry[];

export interface NarrativeArcAnalysis {
    title: string;
    story: string;
    keyLesson: string;
}

export interface NarrativeArcEntry {
    id: string;
    date: string; // ISO string
    situation: string;
    challenge: string;
    turningPoint: string;
    resolution: string;
    analysis?: NarrativeArcAnalysis;
    isAnalyzing?: boolean;
    analysisError?: boolean;
    connections?: Connection[];
}
export type NarrativeArcStorage = NarrativeArcEntry[];

export type ArchetypeId = 'gardien' | 'alchimiste' | 'phenix';

export interface ArchetypeActivation {
    date: string; // YYYY-MM-DD
    archetypeId: ArchetypeId;
}

export interface Archetype {
    id: ArchetypeId;
    name: string;
    energy: string;
    element: string;
    animal: string;
    symbols: string;
    invocation: string[];
    poem: string[];
    mantras: {
        flash: string;
        long: string;
        meditative: string;
        anchoring: string;
    };
}

export interface GuidedMeal {
    id: string;
    name: string;
    day: 'Vendredi' | 'Samedi' | 'Dimanche' | 'Encas';
    period: 'Matin' | 'Midi' | 'Soir' | 'À volonté';
    ingredients: string;
    preparation: string;
    energy: string;
    ritual: string;
}

export interface MealState {
    energy: number; // 0-10
    emotion: string;
    clarity: number; // 0-10
}

export interface SacredMealLog {
    id: string;
    date: string; // ISO string
    mealName: string;
    notes: string;
    beforeState: MealState;
    afterState: MealState;
    guidedMealId?: string;
}

export type SacredNutritionStorage = SacredMealLog[];

// --- DASHBOARD & SUGGESTIONS ---

export type DashboardWidgetId = 'summary' | 'coach' | 'suggestions' | 'quick-actions' | 'moodTracker' | 'rhythm' | 'flashback' | 'emotionCloud' | 'quickGratitude' | 'dailyPrompt';

export interface Suggestion {
    title: string;
    reason: string;
    ctaText: string;
    moduleId: ModuleId;
    isPrimary: boolean;
}

export interface CompanionStorage {
    lastGenerated: string; // YYYY-MM-DD
    suggestion: Suggestion[];
}

export interface ProactiveSuggestion {
    title: string;
    message: string;
    ctaText: string;
    moduleId: ModuleId;
}

export interface ProactiveCoachStorage {
    lastGenerated: string; // ISO string
    suggestion: ProactiveSuggestion | null;
}

export interface DailyAffirmation {
    date: string; // YYYY-MM-DD
    affirmation: string;
}

export interface DailyPromptCache {
    date: string; // YYYY-MM-DD
    prompt: string;
}


// --- SETTINGS ---

export interface AppSettings {
    theme: 'light' | 'dark';
    userName: string;
    shareContextWithAI: { [key in ModuleId]?: boolean };
    dashboardWidgets: {
        flashback: boolean;
        rhythm: boolean;
        moodTracker: boolean;
        emotionCloud: boolean;
        quickGratitude: boolean;
        dailyPrompt: boolean;
    };
    dashboardMainOrder: DashboardWidgetId[];
    dashboardSideOrder: DashboardWidgetId[];
    coachSettings: {
        personality: CoachPersonality;
        tone: CoachTone;
        voiceURI: string | null;
        voicePitch: number;
        voiceRate: number;
    };
    celebrateRitualCompletion: boolean;
    customCoachPrompts: string[];
    favoriteModules: ModuleId[];
    moduleSettings: {
        [key: string]: any; // Allows for future module-specific settings
    };
}

// --- CALM SPACE ---
export interface CustomSound {
    id: string;
    name: string;
    url: string;
    icon: string;
}

export interface SoundMix {
    id: string;
    name: string;
    sounds: { soundSrc: string; volume: number }[];
}

// --- STORAGE KEYS ---
export const JOURNAL_STORAGE_KEY = 'journalEntries';
export const THOUGHT_COURT_STORAGE_KEY = 'thoughtCourtCases';
export const RITUALS_STORAGE_KEY = 'rituals';
export const VALUES_STORAGE_KEY = 'userValues';
export const WEEKLY_REVIEW_STORAGE_KEY = 'weeklyReviews';
export const GUIDED_JOURNEY_STORAGE_KEY = 'guidedJourney';
export const SETTINGS_STORAGE_KEY = 'appSettings';
export const CHAT_STORAGE_KEY = 'chatHistory';
export const ASSESSMENT_STORAGE_KEY = 'assessments';
export const COMPANION_STORAGE_KEY = 'companion';
export const GOALS_STORAGE_KEY = 'goals';
export const AFFIRMATION_STORAGE_KEY = 'dailyAffirmation';
export const PROACTIVE_COACH_STORAGE_KEY = 'proactiveCoach';
export const UNSENT_LETTER_STORAGE_KEY = 'unsentLetters';
export const FEAR_SETTING_STORAGE_KEY = 'fearSetting';
export const LAST_CHECKIN_DATE_KEY = 'lastCheckinDate';
export const BADGE_STORAGE_KEY = 'badges';
export const RHYTHM_STORAGE_KEY = 'rhythm';
export const WOUNDS_STORAGE_KEY = 'wounds';
export const RELATIONAL_ECOSYSTEM_STORAGE_KEY = 'relationalEcosystem';
export const SYNTHESIS_STORAGE_KEY = 'syntheses';
export const HERBARIUM_CACHE_KEY = 'herbariumCache';
export const CRYSTALS_CACHE_KEY = 'crystalsCache';
export const ARBORETUM_CACHE_KEY = 'arboretumCache';
export const BESTIARY_CACHE_KEY = 'bestiaryCache';
export const PROGRESS_ANALYSIS_CACHE_KEY = 'progressAnalysisCache';
export const GRATITUDE_STORAGE_KEY = 'gratitude';
export const CUSTOM_SOUNDS_STORAGE_KEY = 'customSounds';
export const BODY_MAP_STORAGE_KEY = 'bodyMap';
export const CUSTOM_SOUND_MIXES_STORAGE_KEY = 'customSoundMixes';
export const PERSONALIZED_PATH_STORAGE_KEY = 'personalizedPath';
export const RHYTHM_ADVICE_CACHE_KEY = 'rhythmAdviceCache';
export const ORACLE_STORAGE_KEY = 'oracleDraws';
export const DREAM_JOURNAL_STORAGE_KEY = 'dreamJournalEntries';
export const NARRATIVE_ARC_STORAGE_KEY = 'narrativeArcEntries';
export const ARCHETYPES_STORAGE_KEY = 'archetypesActivation';
export const TRANSMUTATION_STORAGE_KEY = 'transmutationReflections';
export const SACRED_NUTRITION_STORAGE_KEY = 'sacredNutritionLogs';
export const DAILY_PROMPT_STORAGE_KEY = 'dailyPrompt';


// --- WEB SPEECH API TYPES ---

export interface SpeechRecognitionResult {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

export interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

export interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    grammars: any; // SpeechGrammarList
    interimResults: boolean;
    lang: string;
    
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;

    start(): void;
    stop(): void;
}

export interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionStatic;
    webkitSpeechRecognition?: SpeechRecognitionStatic;
  }
}