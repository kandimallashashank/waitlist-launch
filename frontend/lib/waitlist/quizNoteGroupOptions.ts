/**
 * Canonical quiz note slugs + pyramid layer (shared by ForYouWizard, anchor derivation, gift API).
 */

export type QuizNoteCategory = "top" | "middle" | "base";

export interface QuizNoteGroupOption {
  value: string;
  label: string;
  noteCategory: QuizNoteCategory;
}

/** Values align with backend ``QuizAnswers`` / note pyramid fields. */
export const QUIZ_NOTE_GROUP_OPTIONS: readonly QuizNoteGroupOption[] = [
  { value: "bergamot", label: "Bergamot", noteCategory: "top" },
  { value: "lemon", label: "Lemon", noteCategory: "top" },
  { value: "grapefruit", label: "Grapefruit", noteCategory: "top" },
  { value: "orange", label: "Orange", noteCategory: "top" },
  { value: "neroli", label: "Neroli", noteCategory: "top" },
  { value: "mint", label: "Mint", noteCategory: "top" },
  { value: "lavender", label: "Lavender", noteCategory: "top" },
  { value: "cardamom", label: "Cardamom", noteCategory: "top" },
  { value: "pink_pepper", label: "Pink Pepper", noteCategory: "top" },
  { value: "ginger", label: "Ginger", noteCategory: "top" },
  { value: "apple", label: "Apple", noteCategory: "top" },
  { value: "pear", label: "Pear", noteCategory: "top" },
  { value: "blackcurrant", label: "Blackcurrant", noteCategory: "top" },
  { value: "marine", label: "Marine / Aquatic", noteCategory: "top" },
  { value: "aldehydes", label: "Aldehydes", noteCategory: "top" },
  { value: "rose", label: "Rose", noteCategory: "middle" },
  { value: "jasmine", label: "Jasmine", noteCategory: "middle" },
  { value: "iris", label: "Iris / Orris", noteCategory: "middle" },
  { value: "lily", label: "Lily of the Valley", noteCategory: "middle" },
  { value: "tuberose", label: "Tuberose", noteCategory: "middle" },
  { value: "ylang_ylang", label: "Ylang Ylang", noteCategory: "middle" },
  { value: "geranium", label: "Geranium", noteCategory: "middle" },
  { value: "cinnamon", label: "Cinnamon", noteCategory: "middle" },
  { value: "nutmeg", label: "Nutmeg", noteCategory: "middle" },
  { value: "clove", label: "Clove", noteCategory: "middle" },
  { value: "peach", label: "Peach", noteCategory: "middle" },
  { value: "raspberry", label: "Raspberry", noteCategory: "middle" },
  { value: "violet", label: "Violet", noteCategory: "middle" },
  { value: "saffron", label: "Saffron", noteCategory: "middle" },
  { value: "oud", label: "Oud", noteCategory: "middle" },
  { value: "sandalwood", label: "Sandalwood", noteCategory: "base" },
  { value: "cedar", label: "Cedar", noteCategory: "base" },
  { value: "vetiver", label: "Vetiver", noteCategory: "base" },
  { value: "patchouli", label: "Patchouli", noteCategory: "base" },
  { value: "vanilla", label: "Vanilla", noteCategory: "base" },
  { value: "amber", label: "Amber", noteCategory: "base" },
  { value: "musk", label: "Musk", noteCategory: "base" },
  { value: "tonka", label: "Tonka Bean", noteCategory: "base" },
  { value: "leather", label: "Leather", noteCategory: "base" },
  { value: "tobacco", label: "Tobacco", noteCategory: "base" },
  { value: "benzoin", label: "Benzoin", noteCategory: "base" },
  { value: "incense", label: "Incense", noteCategory: "base" },
  { value: "oakmoss", label: "Oakmoss", noteCategory: "base" },
  { value: "labdanum", label: "Labdanum", noteCategory: "base" },
  { value: "cashmeran", label: "Cashmeran", noteCategory: "base" },
] as const;
