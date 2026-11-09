<?php

namespace App\Http\Controllers;

use App\Models\KpiDefinition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KpiDefinitionController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = KpiDefinition::query();
        if ($r->filled('category')) $q->where('category', $r->string('category'));
        if ($r->filled('type')) $q->where('type', $r->string('type'));
        return response()->json($q->orderBy('sortOrder')->get());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json(KpiDefinition::findOrFail($id));
    }

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate([
            'key' => 'required|string|unique:kpi_definitions,key',
            'name' => 'required|string',
            'category' => 'required|string',
            'weight' => 'required|numeric|min:0',
            'target' => 'required|numeric',
            'type' => 'required|in:ratio,count,binary',
            'unit' => 'required|string',
            'description' => 'required|string',
            'numeratorLabel' => 'nullable|string',
            'denominatorLabel' => 'nullable|string',
            'countLabel' => 'nullable|string',
            'isSystem' => 'nullable|boolean',
            'sortOrder' => 'nullable|integer',
        ]);
        $data['id'] = (string) Str::uuid();
        $data += ['isSystem' => false, 'sortOrder' => 0];
        return response()->json(KpiDefinition::create($data), 201);
    }

    public function update(Request $r, string $id): JsonResponse
    {
        $k = KpiDefinition::findOrFail($id);
        if ($k->isSystem) {
            return response()->json(['message' => 'System KPIs cannot be modified'], 403);
        }
        $data = $r->validate([
            'key' => 'sometimes|string|unique:kpi_definitions,key,' . $id . ',id',
            'name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'weight' => 'sometimes|numeric|min:0',
            'target' => 'sometimes|numeric',
            'type' => 'sometimes|in:ratio,count,binary',
            'unit' => 'sometimes|string',
            'description' => 'sometimes|string',
            'numeratorLabel' => 'nullable|string',
            'denominatorLabel' => 'nullable|string',
            'countLabel' => 'nullable|string',
            'sortOrder' => 'sometimes|integer',
        ]);
        $k->update($data);
        return response()->json($k->refresh());
    }

    public function destroy(string $id): JsonResponse
    {
        $k = KpiDefinition::findOrFail($id);
        if ($k->isSystem) {
            return response()->json(['message' => 'System KPIs cannot be deleted'], 403);
        }
        $k->delete();
        return response()->json(null, 204);
    }
}
