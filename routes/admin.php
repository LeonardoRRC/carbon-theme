<?php

use Illuminate\Support\Facades\Route;
use UK\TheQuantum\CarbonTheme\Http\Controllers\ThemeController;

// /api/admin/extensions/carbon-theme/...
Route::get('/config', [ThemeController::class, 'show']);
Route::put('/config', [ThemeController::class, 'update']);
Route::get('/icons', [ThemeController::class, 'icons']);
Route::post('/branding/{kind}', [ThemeController::class, 'uploadBrand'])->where('kind', 'logo|favicon');
Route::delete('/branding/{kind}', [ThemeController::class, 'deleteBrand'])->where('kind', 'logo|favicon');
Route::post('/fonts', [ThemeController::class, 'uploadFont']);
Route::delete('/fonts/{id}', [ThemeController::class, 'deleteFont'])->where('id', '[a-f0-9]{8}');
