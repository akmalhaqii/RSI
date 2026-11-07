<?php

namespace Database\Factories;

use App\Models\Training;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Training>
 */
class TrainingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->unique()->sentence(3),
            'category' => fake()->randomElement(['Desain', 'Pemrograman', 'Data']),
            'description' => fake()->paragraph(),
            'instructor' => fake()->name(),
            'duration_hours' => fake()->numberBetween(2, 16),
            'status' => 'available',
        ];
    }
}
