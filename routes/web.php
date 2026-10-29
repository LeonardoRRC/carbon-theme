<?php

use Illuminate\Support\Facades\Route;
use UK\TheQuantum\CarbonTheme\Http\Controllers\AssetController;

// /extensions/carbon-theme/... (public, for the login page too)
Route::get('/theme.css', [AssetController::class, 'stylesheet'])->name('stylesheet');
Route::get('/files/{folder}/{file}', [AssetController::class, 'file'])
    ->where(['folder' => 'brand|fonts', 'file' => '[a-z0-9.-]+'])
    ->name('file');
