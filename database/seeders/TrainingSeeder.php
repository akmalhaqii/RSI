<?php

namespace Database\Seeders;

use App\Models\Training;
use Illuminate\Database\Seeder;

class TrainingSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            [
                'title' => 'Fundamental UI/UX Design',
                'category' => 'Desain',
                'description' => 'Pelajari dasar riset pengguna, wireframe, dan prototipe untuk membangun pengalaman digital yang jelas.',
                'instructor' => 'Nadia Putri',
                'duration_hours' => 8,
                'status' => 'available',
            ],
            [
                'title' => 'Fullstack Web dengan Laravel',
                'category' => 'Pemrograman',
                'description' => 'Bangun aplikasi web modern dengan Laravel, database relasional, dan praktik API yang rapi.',
                'instructor' => 'Rizky Pratama',
                'duration_hours' => 12,
                'status' => 'available',
            ],
            [
                'title' => 'Data Analytics dengan SQL',
                'category' => 'Data',
                'description' => 'Gunakan SQL untuk mengolah data, menemukan pola, dan menyampaikan insight yang bisa ditindaklanjuti.',
                'instructor' => 'Dimas Santoso',
                'duration_hours' => 6,
                'status' => 'available',
            ],
        ] as $training) {
            Training::updateOrCreate(['title' => $training['title']], $training);
        }
    }
}
