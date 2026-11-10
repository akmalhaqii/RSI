<?php

namespace Tests\Feature;

use App\Support\EvaluationQuestions;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class EvaluationQuestionsTest extends TestCase
{
    public function test_module_banks_include_all_questions_without_disclosing_answers(): void
    {
        $banks = EvaluationQuestions::publicBanks();

        $this->assertSame(['assessment' => 12, 'inventory' => 8, 'communication' => 8, 'powerbi' => 8], array_map('count', $banks));
        foreach ($banks as $questions) {
            foreach ($questions as $question) {
                $this->assertSame(['prompt', 'options'], array_keys($question));
            }
        }
    }

    public function test_assessment_distinguishes_wrong_and_blank_answers(): void
    {
        $answers = [0, 1, 2, 0, 3, 1, 4, 2, 3, 0, 0, null];

        $this->assertSame(['score' => 83, 'correct' => 10, 'wrong' => 1, 'empty' => 1], EvaluationQuestions::grade('assessment', $answers));
    }

    public function test_training_tests_reject_answers_outside_the_question_options(): void
    {
        try {
            EvaluationQuestions::grade('powerbi', [0, 1, 2, 3, 4, 0, 1, 99]);
            $this->fail('An out-of-range option was accepted.');
        } catch (ValidationException $exception) {
            $this->assertSame(['answers' => ['Pilihan jawaban tidak valid.']], $exception->errors());
        }
    }
}
