import { Module, Archetype, GuidedJourney, TransmutationExercise, GuidedMeal } from './types';
import {
    JournalIcon,
    ThoughtCourtIcon,
    RitualIcon,
    ValuesIcon,
    WeeklyReviewViewIcon,
    SynthesisIcon,
    AssessmentIcon,
    GuidedJourneyIcon,
    CoachAIIcon,
    SettingsIcon,
    GoalsIcon,
    CalmSpaceIcon,
    CommunicationArenaViewIcon,
    UnsentLettersIcon,
    FearSettingIcon,
    ProgressIcon,
    RhythmIcon,
    WoundsIcon,
    RelationalEcosystemIcon,
    SanctuaryIcon,
    ArtTherapyIcon,
    BodyMapIcon,
    PathIcon,
    GratitudeIcon,
    OracleIcon,
    DreamJournalIcon,
    NarrativeArcIcon,
    ArchetypesIcon,
    SacredNutritionIcon,
    ShieldIcon,
} from './icons';

export const modules: Module[] = [
    {
        id: 'journal',
        name: 'Journal',
        description: 'Écrivez librement pour explorer vos pensées et vos émotions.',
        icon: JournalIcon,
    },
    {
        id: 'dream-journal',
        name: 'Journal des Rêves',
        description: 'Notez et analysez vos rêves pour découvrir les messages de votre subconscient.',
        icon: DreamJournalIcon,
    },
    {
        id: 'gratitude',
        name: 'Gratitude',
        // FIX: Added missing description and icon properties to the 'gratitude' module.
        description: "Cultivez un état d'esprit positif en notant les choses pour lesquelles vous êtes reconnaissant.",
        icon: GratitudeIcon,
    },
    {
        id: 'thought-court',
        name: 'Tribunal des Pensées',
        description: 'Analysez et restructurez vos pensées négatives de manière objective.',
        icon: ThoughtCourtIcon,
    },
    {
        id: 'ritual',
        name: 'Rituels',
        description: 'Créez et suivez des habitudes quotidiennes pour soutenir vos objectifs.',
        icon: RitualIcon,
    },
    {
        id: 'values',
        name: 'Valeurs',
        description: 'Identifiez et alignez-vous avec ce qui compte le plus pour vous.',
        icon: ValuesIcon,
    },
    {
        id: 'weekly-review',
        name: 'Bilan Hebdomadaire',
        description: 'Faites le point sur votre semaine pour célébrer vos progrès.',
        icon: WeeklyReviewViewIcon,
    },
    {
        id: 'synthesis',
        name: 'Synthèse',
        description: 'Obtenez une vue d\'ensemble de vos progrès et de vos thèmes récurrents.',
        icon: SynthesisIcon,
    },
    {
        id: 'assessment',
        name: 'Évaluation',
        description: 'Faites un bilan rapide de votre bien-être général.',
        icon: AssessmentIcon,
    },
    {
        id: 'guided-journey',
        name: 'Parcours Guidé',
        description: 'Suivez un parcours thématique de 5 jours pour progresser sur un sujet.',
        icon: GuidedJourneyIcon,
    },
    {
        id: 'coach-ai',
        name: 'Coach Hal',
        description: 'Discutez avec votre coach IA pour obtenir du soutien et des conseils.',
        icon: CoachAIIcon,
    },
    {
        id: 'settings',
        name: 'Paramètres',
        description: 'Personnalisez votre expérience et gérez vos données.',
        icon: SettingsIcon,
    },
    {
        id: 'goals',
        name: 'Objectifs',
        description: 'Définissez et suivez vos objectifs personnels et professionnels.',
        icon: GoalsIcon,
    },
    {
        id: 'calm-space',
        name: 'Espace Calme',
        description: 'Accédez à des outils de relaxation rapide pour apaiser votre esprit.',
        icon: CalmSpaceIcon,
    },
    {
        id: 'communication-arena',
        name: 'Arène de Communication',
        description: 'Entraînez-vous pour des conversations difficiles avec une IA.',
        icon: CommunicationArenaViewIcon,
    },
    {
        id: 'unsent-letters',
        name: 'Lettres non envoyées',
        description: 'Exprimez vos émotions sans filtre dans des lettres privées.',
        icon: UnsentLettersIcon,
    },
    {
        id: 'fear-setting',
        name: 'Analyse des Peurs',
        description: 'Décomposez vos peurs pour prendre des décisions plus audacieuses.',
        icon: ShieldIcon,
    },
    {
        id: 'progress',
        name: 'Progrès',
        description: 'Visualisez vos accomplissements, séries et statistiques.',
        icon: ProgressIcon,
    },
    {
        id: 'rhythm',
        name: 'Votre Rythme',
        description: 'Découvrez votre chronotype et alignez-vous sur votre énergie naturelle.',
        icon: RhythmIcon,
    },
    {
        id: 'wounds',
        name: 'Alchimie Intérieure',
        description: 'Identifiez et transmutez vos blessures émotionnelles fondamentales.',
        icon: WoundsIcon,
    },
    {
        id: 'relational-ecosystem',
        name: 'Écosystème Relationnel',
        description: 'Cartographiez votre entourage pour cultiver des relations saines.',
        icon: RelationalEcosystemIcon,
    },
    {
        id: 'sanctuary',
        name: 'Sanctuaire',
        description: 'Explorez des outils symboliques pour la créativité et la réflexion.',
        icon: SanctuaryIcon,
    },
    {
        id: 'art-therapy',
        name: 'Atelier Créatif',
        description: 'Exprimez-vous librement par le dessin et obtenez des interprétations.',
        icon: ArtTherapyIcon,
    },
    {
        id: 'body-map',
        name: 'Cartographie Corporelle',
        description: 'Visualisez où vos émotions se manifestent dans votre corps.',
        icon: BodyMapIcon,
    },
    {
        id: 'personalized-path',
        name: 'Parcours Personnalisé',
        description: 'Laissez l\'IA créer une feuille de route sur mesure pour vos objectifs.',
        icon: PathIcon,
    },
    {
        id: 'oracle',
        name: 'Oracle de Soi',
        description: 'Tirez des cartes pour une guidance introspective et symbolique.',
        icon: OracleIcon,
    },
    {
        id: 'narrative-arc',
        name: 'Arc Narratif',
        description: 'Transformez vos expériences difficiles en récits de croissance.',
        icon: NarrativeArcIcon,
    },
    {
        id: 'archetypes',
        name: 'Archétypes Sacrés',
        description: 'Activez des énergies archétypales pour vous guider.',
        icon: ArchetypesIcon,
    },
    {
        id: 'sacred-nutrition',
        name: 'Nutrition Sacrée',
        description: 'Explorez le lien entre alimentation, émotions et énergie.',
        icon: SacredNutritionIcon,
    },
    {
        id: 'admin',
        name: 'Administration',
        description: 'Gérez les paramètres avancés de l\'application.',
        icon: SettingsIcon, // Using settings icon as a placeholder
    },
];

// FIX: Added and exported multiple missing data constants.
export const moodOptions: { emoji: string, label: string }[] = [
    { emoji: '😊', label: 'Heureux' },
    { emoji: '😌', label: 'Serein' },
    { emoji: '😄', label: 'Joyeux' },
    { emoji: '🤩', label: 'Excité' },
    { emoji: '😢', label: 'Triste' },
    { emoji: '😠', label: 'En colère' },
    { emoji: '😟', label: 'Anxieux' },
    { emoji: '😴', label: 'Fatigué' },
];

export const foodMoodTags: string[] = ['Énergisé', 'Lourd', 'Conforté', 'Ballonné', 'Coupable', 'Satisfait', 'Léger'];

export const SACRED_WEEKEND_JOURNEY: GuidedJourney = {
    id: 'sacred-weekend',
    title: "Week-end Sacré",
    description: "Un parcours de 3 jours pour se reconnecter à soi du vendredi au dimanche.",
    days: [
        { title: "Vendredi: Déconnexion", task: "Écrivez une lettre non envoyée à votre 'moi' de la semaine pour déposer le fardeau du travail.", moduleId: 'unsent-letters' },
        { title: "Samedi: Reconnexion", task: "Faites une cartographie corporelle de la joie ou de la paix. Où ressentez-vous ces émotions ?", moduleId: 'body-map' },
        { title: "Dimanche: Intention", task: "Définissez une intention claire pour la semaine à venir et notez-la dans votre journal.", moduleId: 'journal' }
    ]
};

export const SHADOW_TRANSMUTATIONS: { id: string; shadow: string; light: string; affirmation: string }[] = [
    { id: 'fear', shadow: 'Peur', light: 'Confiance', affirmation: 'Je choisis la confiance plutôt que la peur.' },
    { id: 'anger', shadow: 'Colère', light: 'Passion', affirmation: 'Je transforme ma colère en énergie créatrice.' },
    { id: 'sadness', shadow: 'Tristesse', light: 'Empathie', affirmation: 'Ma tristesse me connecte à la profondeur de la vie.' },
    { id: 'shame', shadow: 'Honte', light: 'Authenticité', affirmation: 'J\'accepte toutes les parties de moi.' },
    { id: 'jealousy', shadow: 'Jalousie', light: 'Inspiration', affirmation: 'Je célèbre le succès des autres comme une inspiration.' },
    { id: 'guilt', shadow: 'Culpabilité', light: 'Apprentissage', affirmation: 'Je tire des leçons de mes erreurs et j\'avance.' },
];

export const herbariumItems = [
    { name: 'Lavande', type: 'plant' },
    { name: 'Camomille', type: 'plant' },
    { name: 'Menthe Poivrée', type: 'plant' },
    { name: 'Tea Tree', type: 'oil' },
    { name: 'Eucalyptus', type: 'oil' },
    { name: 'Rose', type: 'plant' },
    { name: 'Gingembre', type: 'plant' },
];

export const crystalItems = [
    { name: 'Quartz Rose' },
    { name: 'Améthyste' },
    { name: 'Citrine' },
    { name: 'Labradorite' },
    { name: 'Obsidienne Noire' },
    { name: 'Sélénite' },
];

export const arboretumItems = [
    { name: 'Chêne' },
    { name: 'Saule' },
    { name: 'Séquoia' },
    { name: 'Bouleau' },
    { name: 'Pin' },
    { name: 'Olivier' },
];

export const bestiaryItems = [
    { name: 'Loup' },
    { name: 'Aigle' },
    { name: 'Serpent' },
    { name: 'Papillon' },
    { name: 'Hibou' },
    { name: 'Cerf' },
];

export const SACRED_ARCHETYPES: Archetype[] = [
    {
        id: 'gardien',
        name: 'Le Gardien',
        energy: "L'énergie de l'ancrage, de la protection et de la sagesse tranquille.",
        element: 'Terre',
        animal: 'Ours',
        symbols: 'Montagne, Forêt, Bouclier',
        invocation: [ "J'invoque la force tranquille du Gardien.", "Que mes racines plongent profondément dans la terre.", "Je suis un refuge pour moi-même et pour les autres." ],
        poem: [ "Là où le sol est ferme,", "où l'arbre ancien ne ploie pas,", "je me tiens.", "Mon silence est une forteresse,", "mon souffle, le vent dans les feuilles." ],
        mantras: { flash: 'Je suis stable.', long: 'Je suis un pilier de force et de stabilité.', meditative: 'Ancré et Serein', anchoring: 'Ici et maintenant, je suis en sécurité.' }
    },
    {
        id: 'alchimiste',
        name: "L'Alchimiste",
        energy: "L'énergie de la transformation, de la créativité et de la transmutation du plomb en or.",
        element: 'Feu',
        animal: 'Serpent',
        symbols: 'Creuset, Flamme, Spirale',
        invocation: [ "J'invoque le feu créateur de l'Alchimiste.", "Que mes blessures deviennent des portails de lumière.", "Je transforme chaque épreuve en sagesse." ],
        poem: [ "Dans le creuset de mon cœur,", "la douleur fond, le doute s'évapore.", "Ce qui était lourd devient léger.", "Ce qui était sombre devient or.", "Le feu ne détruit pas, il révèle." ],
        mantras: { flash: 'Je transforme.', long: 'Je suis le créateur alchimique de ma réalité.', meditative: 'Transmutation et Création', anchoring: 'Cette émotion est une énergie en mouvement.' }
    },
    {
        id: 'phenix',
        name: 'Le Phénix',
        energy: "L'énergie de la renaissance, de la résilience et de la capacité à renaître de ses cendres.",
        element: 'Air',
        animal: 'Phénix',
        symbols: 'Cendres, Soleil levant, Œuf cosmique',
        invocation: [ "J'invoque la puissance de renaissance du Phénix.", "De chaque fin, je fais un nouveau départ.", "Je m'élève, plus fort et plus sage." ],
        poem: [ "Le feu a tout pris, mais il n'a pas pris mon essence.", "Des cendres de mon passé, je tisse mes ailes.", "Mon chant est une promesse d'aube.", "Je ne meurs pas, je deviens." ],
        mantras: { flash: 'Je renais.', long: 'Je m\'élève au-dessus des épreuves, renouvelé et libre.', meditative: 'Résilience et Liberté', anchoring: 'Ceci aussi passera.' }
    }
];

export const GUIDED_MEALS: GuidedMeal[] = [
    {
        id: 'gm1',
        name: 'Éveil Solaire',
        day: 'Vendredi',
        period: 'Matin',
        ingredients: 'Eau chaude avec citron, flocons d\'avoine, baies, graines de chia.',
        preparation: 'Commencez par l\'eau citronnée. Préparez le porridge en conscience, en pensant à l\'énergie que vous insufflez.',
        energy: 'Énergisant & Purifiant',
        ritual: 'Avant de manger, remerciez les éléments qui ont contribué à ce repas.'
    },
    {
        id: 'gm2',
        name: 'Ancrage Terrestre',
        day: 'Samedi',
        period: 'Midi',
        ingredients: 'Légumes racines rôtis (carottes, panais), quinoa, lentilles, herbes fraîches.',
        preparation: 'Mangez lentement, en ressentant la texture et le goût de chaque aliment. Sentez la connexion à la terre.',
        energy: 'Stabilisant & Nourrissant',
        ritual: 'Posez vos mains sur votre ventre après le repas et ressentez la nourriture vous nourrir.'
    },
    {
        id: 'gm3',
        name: 'Souper Lunaire',
        day: 'Dimanche',
        period: 'Soir',
        ingredients: 'Soupe légère de légumes verts, infusion de camomille, un carré de chocolat noir.',
        preparation: 'Dînez dans le calme, loin des écrans. Savourez chaque cuillère de soupe comme un baume.',
        energy: 'Apaisant & Réparateur',
        ritual: 'En buvant votre infusion, notez trois choses douces de votre week-end.'
    },
];
