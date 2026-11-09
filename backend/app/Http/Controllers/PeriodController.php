<?php

namespace App\Http\Controllers;

use App\Models\Period;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PeriodController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = Period::query();
        if ($r->filled('status')) $q->where('status', $r->string('status'));
        if ($r->boolean('current')) $q->where('isCurrent', true);
        return response()->json($q->orderBy('sortOrder')->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(Period::findOrFail($id));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'name' => 'required|string',
            'periodCode' => 'required|string|unique:periods,periodCode',
            'startDate' => 'required|date',
            'endDate' => 'required|date|after_or_equal:startDate',
            'submissionDeadline' => 'required|date',
            'status' => 'nullable|in:OPEN,REVIEWING,FINAL_APPROVAL,LOCKED,ARCHIVED',
            'isCurrent' => 'nullable|boolean',
            'sortOrder' => 'nullable|integer',
        ]);
        $data['id'] = (string) Str::uuid();
        $data += ['status' => 'OPEN', 'isCurrent' => false, 'sortOrder' => 0];

        return DB::transaction(function () use ($data) {
            if ($data['isCurrent']) Period::query()->update(['isCurrent' => false]);
            return response()->json(Period::create($data), 201);
        });
    }

    public function update(Request $r, string $id): JsonResponse
    {
        $p = Period::findOrFail($id);
        $data = $r->validate([
            'name' => 'sometimes|string',
            'periodCode' => 'sometimes|string|unique:periods,periodCode,' . $id . ',id',
            'startDate' => 'sometimes|date',
            'endDate' => 'sometimes|date',
            'submissionDeadline' => 'sometimes|date',
            'status' => 'sometimes|in:OPEN,REVIEWING,FINAL_APPROVAL,LOCKED,ARCHIVED',
            'isCurrent' => 'sometimes|boolean',
            'sortOrder' => 'sometimes|integer',
        ]);

        return DB::transaction(function () use ($p, $data) {
            if (!empty($data['isCurrent'])) {
                Period::where('id', '!=', $p->id)->update(['isCurrent' => false]);
            }
            $p->update($data);
            return response()->json($p->refresh());
        });
    }

    public function setCurrent(string $id): JsonResponse
    {
        return DB::transaction(function () use ($id) {
            $p = Period::findOrFail($id);
            Period::query()->update(['isCurrent' => false]);
            $p->isCurrent = true;
            $p->save();
            return response()->json($p);
        });
    }

    public function destroy(string $id): JsonResponse
    {
        Period::findOrFail($id)->delete();
        return response()->json(null, 204);
    }
}
