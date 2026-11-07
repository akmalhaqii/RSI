<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TrainingResource;
use App\Models\Training;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TrainingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['active', 'available', 'completed', 'all'])],
            'q' => ['sometimes', 'string', 'max:120'],
        ]);

        $status = $filters['status'] ?? 'active';

        $trainings = Training::query()
            ->when($status !== 'all', fn ($query) => $query->where('status', $status))
            ->when($filters['q'] ?? null, function ($query, string $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%")
                        ->orWhere('instructor', 'like', "%{$search}%");
                });
            })
            ->orderBy('title')
            ->get();

        return TrainingResource::collection($trainings)
            ->additional(['meta' => ['status' => $status, 'count' => $trainings->count()]]);
    }
}
