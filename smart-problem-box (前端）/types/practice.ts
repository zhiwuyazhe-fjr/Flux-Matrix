export interface PracticeStandardSolutionStep {
  seq: number;
  content: string;
}

export interface PracticeStandardSolution {
  steps: PracticeStandardSolutionStep[];
  final_answer_latex: string;
}

export interface PracticeGradeResult {
  internal_calculation_check: string;
  is_correct: boolean;
  feedback: string;
  standard_solution: PracticeStandardSolution;
}
