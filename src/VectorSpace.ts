/**
 * Type valide à donner au moteur en tant qu'entrée
 */
export type VectorInput = (object | string)[];

/**
 * Objet de concordance, c'est-à-dire un objet qui associe les mots d'un texte à leur nombre d'occurences
 */
export type Concordance = {
    [key: string]: number;
} & Object;

/**
 * Type d'objet d'index possible
 */
export type VectorIndex = SimpleIndex | ComplexIndex;

/**
 * Index simple, lié à une chaîne de caractères (à opposition au complexe, lié à un objet)
 */
export type SimpleIndex = {
    concordance: Concordance;
    magnitude: number;
} & Object;
/**
 * Index complexe, lié à un objet (à opposition au simple, lié à une chaîone de carcatères)
 */
export type ComplexIndex = {
    [key: string]: SimpleIndex;
} & Object;

/**
 * Résultat de recherche
 */
export type SearchResult = {
    score: number;
    index: number;
    /** Optionel. Dans le cas d'un résultat trouvé dans un objet */
    key?: string;
} & Object;

export class VectorEngine {
    /**
     * Documents donnés en source du moteur
     * @type {VectorInput}
     * @private
     */
    private sourceDocuments: VectorInput;
    /**
     * Documents indexés
     * @type {VectorIndex[]}
     * @private
     */
    private sourceIndexes: VectorIndex[];
    /**
     * "Stop Words" à utiliser, c'est-à-dire les mots à ignorer par le moteur
     * @type {string[]}
     * @default [""]
     * @static
     */
    static stopWords: string[] = [""];

    /**
     * @param {VectorInput} sourceDocuments - Documents sources du moteur
     */
    constructor(sourceDocuments: VectorInput) {
        // On enregistre l'input brut
        this.sourceDocuments = sourceDocuments;
        // On index chaque item source
        this.sourceIndexes = this.sourceDocuments.map((item) => this.indexItem(item));
    }
    /**
     * Convertit un string ou objet en {@link VectorIndex} en calculant sa concordance et sa magnitude
     * @param {string | object} input
     * @returns {VectorIndex}
     * @private
     */
    private indexItem(input: string | object): VectorIndex {
        // Si item est un string
        if (typeof input === "string") {
            // On récupère les paires mots/nombre
            const conc = this.concordance(input);
            // On retourne un SimpleIndex
            return {
                concordance: conc,
                magnitude: this.magnitude(conc),
            };
        } else {
            // On instancie un objet vide
            const itemIndex: ComplexIndex = {};
            // Pour chaque paire clé/valeur
            for (const [key, value] of Object.entries(input)) {
                // On crée un string vide
                let toParse = "";

                // Si la valeur est un tableau
                if (Array.isArray(value)) {
                    // On convertit chaque item en string (si pas possible, string nul)
                    // On concatène chaque item avec des \n
                    toParse = value.map((i) => i?.toString() || "").join("\n");
                } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
                    // On convertit en string si il s'agit d'un string, d'un nombre, d'un boolean
                    toParse = value.toString();
                }

                // On récupère les paires mots/nombre de la valeur convertie
                const conc = this.concordance(toParse);
                // On retourne un SimpleIndex
                itemIndex[key] = {
                    concordance: conc,
                    magnitude: this.magnitude(conc),
                };
            }
            // On retourne un ComplexIndex
            return itemIndex;
        }
    }
    /**
     * Calcul la concordance du string donné
     * @param {string} input
     * @returns {Concordance}
     * @private
     */
    private concordance(input: string): Concordance {
        const conc: Concordance = {};

        // On convertit la chaine en minuscule et on récupère chaque mot individuel
        for (const word of input.toLowerCase().split(/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/)) {
            // Si le mot est dans la liste des mots "interdits" on l'ignore
            if (VectorEngine.stopWords.includes(word)) {
                continue;
            }

            // Si le mot n'a pas encore été rencontré, on définit sa valeur à 1 dans l'objet de concordance
            if (!conc.hasOwnProperty(word)) {
                conc[word] = 1;
            } else {
                // Sinon on l'incrémente
                conc[word]++;
            }
        }

        // On retourne l'objet de concordance
        return conc;
    }
    /**
     * Calcul la magnitude de la concordance donné
     * @param {Concordance} input
     * @returns {number}
     * @private
     */
    private magnitude(input: Concordance): number {
        let total = 0;
        // Pour chaque nombre de mots trouvé
        for (const count of Object.values(input)) {
            // On ajoute au total le carré de chaque nombre
            total += count ** 2;
        }
        // On retourne la racine du total
        return Math.sqrt(total);
    }
    /**
     * Calcul la relation entre deux {@link SimpleIndex}
     * @param {SimpleIndex} indexedItem
     * @param {SimpleIndex} searchedItem
     * @returns {number}
     * @private
     */
    private relation(indexedItem: SimpleIndex, searchedItem: SimpleIndex): number {
        let topValue = 0;
        // On calcul le produit des deux magnitudes
        const magnitude = indexedItem.magnitude * searchedItem.magnitude;
        // Si le produit est inférieur ou égal à 0, on retourne 0
        if (magnitude <= 0) {
            return topValue;
        }

        // Calcul la puissance de relation entre les index
        for (const [indexedWord, indexedCount] of Object.entries(indexedItem.concordance)) {
            for (const [searchedWord, searchedCount] of Object.entries(searchedItem.concordance)) {
                if (indexedWord.includes(searchedWord)) {
                    topValue += indexedCount * searchedCount;
                }
            }
        }
        // Retourne le ratio puissance/magnitude
        return topValue / magnitude;
    }

    /**
     * Retourne si le paramètre donné est un {@link ComplexIndex}
     * @param {VectorIndex} obj
     * @returns {ComplexIndex}
     * @private
     */
    private isComplexIndex(obj: VectorIndex): obj is ComplexIndex {
        // Retourne si le VectorIndex donné est un ComplexIndex ou non
        return !obj.hasOwnProperty("concordance") && !obj.hasOwnProperty("magnitude");
    }

    /**
     * Cherche dans les documents indexés le terme cherché
     * @param {string} searchTerm - Terme à chercher
     * @param {string[]} searchIn - Tableau de clés où chercher le terme dans le cas d'une source complexe
     * @returns {SearchResult[]}
     * @public
     */
    searchSync(searchTerm: string, searchIn: string[] = []): SearchResult[] {
        // Index le string cherché
        const searchConc = this.concordance(searchTerm);
        const searchIndex: VectorIndex = {
            concordance: searchConc,
            magnitude: this.magnitude(searchConc),
        };

        // Instancie un tableau vide
        const results: SearchResult[] = [];
        // Pour chaque VectorIndex et son index
        this.sourceIndexes.forEach((indexedItem, itemIndex) => {
            // Si l'item n'est pas complex (= pas de recherche par clé)
            if (!this.isComplexIndex(indexedItem)) {
                // On calcul sa relation avec le terme recherché
                let relScore = this.relation(indexedItem, searchIndex);
                // Si la puissance de relation est supérieure à 0
                if (relScore > 0) {
                    // On retourne son score et son index
                    results.push({
                        index: itemIndex,
                        score: relScore,
                    });
                }
            } else {
                // Pour chaque ComplexIndex et sa clé
                for (const [key, simpleIndex] of Object.entries(indexedItem)) {
                    console.log(key, simpleIndex, searchIn);
                    // Si sa clé est présente dans le tableau de clé donné ou que le tableau est vide
                    if (searchIn.includes(key) || searchIn.length == 0) {
                        // On calcul sa relation avec le terme recherché
                        let relScore = this.relation(simpleIndex, searchIndex);
                        // Si la puissance de relation est supérieure à 0
                        if (relScore > 0) {
                            // On retourne son score et son index
                            results.push({
                                index: itemIndex,
                                score: relScore,
                                key: key,
                            });
                        }
                    }
                }
            }
        });

        // On tri par ordre décroissant
        results.sort((a, b) => {
            if (a.score < b.score) return 1;
            if (a.score > b.score) return -1;
            return 0;
        });

        // On retourne le score
        return results;
    }

    /**
     * Cherche dans les documents indexés le terme cherché
     * @param {string} searchTerm - Terme à chercher
     * @param {string[]} searchIn - Tableau de clés où chercher le terme dans le cas d'une source complexe
     * @returns {Promise<SearchResult[]>}
     * @public
     * @async
     */
    async searchAsync(searchTerm: string, searchIn: string[] = []): Promise<SearchResult[]> {
        // Index le string cherché
        const searchConc = this.concordance(searchTerm);
        const searchIndex: VectorIndex = {
            concordance: searchConc,
            magnitude: this.magnitude(searchConc),
        };

        // Instancie un tableau vide
        const results: SearchResult[] = [];
        // Pour chaque VectorIndex et son index
        this.sourceIndexes.forEach((indexedItem, itemIndex) => {
            // Si l'item n'est pas complex (= pas de recherche par clé)
            if (!this.isComplexIndex(indexedItem)) {
                // On calcul sa relation avec le terme recherché
                let relScore = this.relation(indexedItem, searchIndex);
                // Si la puissance de relation est supérieure à 0
                if (relScore > 0) {
                    // On retourne son score et son index
                    results.push({
                        index: itemIndex,
                        score: relScore,
                    });
                }
            } else {
                // Pour chaque ComplexIndex et sa clé
                for (const [key, simpleIndex] of Object.entries(indexedItem)) {
                    // Si sa clé est présente dans le tableau de clé donné ou que le tableau est vide
                    if (searchIn.includes(key) || searchIn.length == 0) {
                        // On calcul sa relation avec le terme recherché
                        let relScore = this.relation(simpleIndex, searchIndex);
                        // Si la puissance de relation est supérieure à 0
                        if (relScore > 0) {
                            // On retourne son score et son index
                            results.push({
                                index: itemIndex,
                                score: relScore,
                                key: key,
                            });
                        }
                    }
                }
            }
        });

        // On tri par ordre décroissant
        results.sort((a, b) => {
            if (a.score < b.score) return 1;
            if (a.score > b.score) return -1;
            return 0;
        });

        // On retourne le score
        return results;
    }

    /**
     * Retourne les documents utilisés dans la recherche
     * @returns {VectorInput}
     */
    getInputSource(): VectorInput {
        return this.sourceDocuments;
    }
    /**
     * Ajoute un document dans la liste de recherche
     * @param {object | string} input
     */
    addDocument(input: object | string) {
        this.sourceDocuments.push(input);
        this.sourceIndexes.push(this.indexItem(input));
    }
}
