import { AssessmentCalculationEngine } from "@shared/hyperformula-engine";
import type { AssessmentQuestion, AssessmentAnswer, CompositeAssessmentScore, CategoryScore, SubCategoryScore, UseCaseAssessmentScore, AssessmentGap } from "@shared/types";
import { determineAssessmentStatus, getAssessmentStatusDescription, calculateAssessmentCategoryScore, identifyAssessmentGaps } from "@shared/formulas";
import { ASSESSMENT_QUESTIONS, CATEGORY_METADATA } from "@shared/assessment-questions";

const CATEGORY_ORDER: Array<"skills" | "data" | "infrastructure" | "governance"> = ["skills", "data", "infrastructure", "governance"];

export function calculateAssessmentScores(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswer[],
  useCaseNameMap?: Map<string, string>,
): CompositeAssessmentScore {
  const answerMap = new Map(answers.map(a => [a.questionId, a]));

  // Build HyperFormula input
  const hfQuestions = questions.map(q => {
    const answer = answerMap.get(q.id);
    return {
      weight: q.weight,
      score: answer?.score || 0,
      categoryIndex: CATEGORY_ORDER.indexOf(q.category),
    };
  });

  // Build use case mappings
  const useCaseIds = new Set<string>();
  for (const q of questions) {
    for (const ucId of q.useCasesImpacted) {
      useCaseIds.add(ucId);
    }
  }
  const useCaseList = Array.from(useCaseIds);
  const useCaseMappings = useCaseList.map(ucId => ({
    questionIndices: questions
      .map((q, i) => q.useCasesImpacted.includes(ucId) ? i : -1)
      .filter(i => i >= 0),
  }));

  // Run HyperFormula
  const engine = new AssessmentCalculationEngine();
  const results = engine.loadAndCalculate(hfQuestions, useCaseMappings);
  engine.destroy();

  // Build category scores
  const categories: CategoryScore[] = CATEGORY_ORDER.map((cat, i) => {
    const catQuestions = questions.filter(q => q.category === cat);
    const catAnswers = catQuestions.map(q => {
      const a = answerMap.get(q.id);
      return { score: a?.score || 0, weight: q.weight };
    });

    const hfResult = results.categoryScores[i];
    const status = determineAssessmentStatus(hfResult.percentage);

    // Build sub-category scores
    const subCats = new Map<string, { questions: typeof catQuestions; answers: typeof catAnswers }>();
    catQuestions.forEach((q, j) => {
      const existing = subCats.get(q.subCategory) || { questions: [], answers: [] };
      existing.questions.push(q);
      existing.answers.push(catAnswers[j]);
      subCats.set(q.subCategory, existing);
    });

    const subCategories: SubCategoryScore[] = Array.from(subCats.entries()).map(([subCat, data]) => {
      const subResult = calculateAssessmentCategoryScore(data.answers);
      return {
        subCategory: subCat,
        category: cat,
        rawScore: subResult.rawScore,
        maxPossibleScore: subResult.maxScore,
        percentage: subResult.percentage,
        status: subResult.status,
        questionCount: data.questions.length,
        answeredCount: data.answers.filter(a => a.score > 0).length,
      };
    });

    return {
      category: cat,
      rawScore: hfResult.rawScore,
      maxPossibleScore: hfResult.maxScore,
      percentage: hfResult.percentage,
      status,
      statusDescription: getAssessmentStatusDescription(status),
      subCategories,
      questionCount: catQuestions.length,
      answeredCount: hfResult.answeredCount,
    };
  });

  // Build use case scores
  const useCaseScores: UseCaseAssessmentScore[] = useCaseList.map((ucId, i) => {
    const hfResult = results.useCaseScores[i];
    const status = determineAssessmentStatus(hfResult.percentage);
    const mappedQIds = questions.filter(q => q.useCasesImpacted.includes(ucId)).map(q => q.id);

    const gapInputQuestions = questions.filter(q => q.useCasesImpacted.includes(ucId));
    const gapInputAnswers = gapInputQuestions.map(q => ({
      questionId: q.id,
      score: answerMap.get(q.id)?.score || null,
    }));
    const rawGaps = identifyAssessmentGaps(gapInputQuestions, gapInputAnswers);
    const gaps: AssessmentGap[] = rawGaps.map(g => ({
      ...g,
      currentScore: g.currentScore as any,
      targetScore: 4 as const,
      tip: "",
    }));

    return {
      useCaseId: ucId,
      useCaseName: useCaseNameMap?.get(ucId) || ucId,
      rawScore: hfResult.rawScore,
      maxPossibleScore: hfResult.maxScore,
      percentage: hfResult.percentage,
      status,
      statusDescription: getAssessmentStatusDescription(status),
      mappedQuestionIds: mappedQIds,
      gaps,
    };
  });

  const answeredCount = answers.filter(a => a.score != null).length;
  const overallStatus = determineAssessmentStatus(results.overallPercentage);

  return {
    overallPercentage: results.overallPercentage,
    overallStatus,
    overallStatusDescription: getAssessmentStatusDescription(overallStatus),
    categories,
    useCaseScores,
    completionPercentage: questions.length > 0 ? answeredCount / questions.length : 0,
    totalQuestions: questions.length,
    answeredQuestions: answeredCount,
  };
}
