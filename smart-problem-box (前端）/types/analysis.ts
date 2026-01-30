export interface AnalysisResult {
  title_essence: string;
  tags: {
    subject: string;
    category: string;
    concept: string;
  };
  analysis: {
    concept_explanation: string;
    logic_strategy: string;
    full_solution: string;
  };
}
