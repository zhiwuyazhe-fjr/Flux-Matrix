export interface AnalysisResult {
  title: string;
  input_check: {
    is_complete: boolean;
    issue_description: string | null;
  };
  essence_one_sentence: string;
  tags: {
    big: string;
    mid: string;
    small: string;
  };
  learning_mode: {
    assumed_level: "zero";
    key_concepts: Array<{
      name: string;
      plain_explain: string;
      why_it_matters: string;
    }>;
    logic_strategy: string;
    solution_steps: Array<{
      step_seq: number;
      goal: string;
      details: string;
      check_point: string;
    }>;
    final_answer: string;
    common_mistakes: string[];
    self_check: string[];
  };
}
