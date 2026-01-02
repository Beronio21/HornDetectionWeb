<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Violation;
use App\Notifications\RealTimeNotification;
use Illuminate\Support\Facades\Notification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use App\Events\ViolationCreated;

class ViolationController extends Controller
{
    public function index()
    {
        return response()->json(Violation::all());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'plate_number' => 'required|string',
            'detected_at' => 'required|date',
            'speed' => 'nullable|numeric',
            'decibel_level' => 'nullable|numeric',
            'status' => 'nullable|string|in:flagged,reviewed,cleared',
            'letter' => 'nullable|file|mimes:pdf|max:2048',
        ]);

        $user = User::where('plate_number', $validated['plate_number'])->first();

        // Allow creating violations for unknown plates (e.g., horn/noise events)
        if (!$user) {
            $customUserId = 0; // guest / unknown
            $userName = 'Unknown';
        } else {
            $customUserId = $user->custom_id;
            $userName = $user->name ?? 'Unknown';
        }

        $letterPath = null;
        if ($request->hasFile('letter')) {
            $letterPath = $request->file('letter')->store('letters');
        }

        $violation = Violation::create([
            'custom_user_id' => $customUserId,
            'plate_number' => $validated['plate_number'],
            'detected_at' => $validated['detected_at'],
            'speed' => $validated['speed'],
            'decibel_level' => $validated['decibel_level'],
            'letter_path' => $letterPath,
            'status' => $validated['status'] ?? 'flagged',
        ]);

        // Count the user's offenses (for the event)
        $offenseCount = Violation::where('custom_user_id', $user->custom_id)->count();
        event(new ViolationCreated($violation, $offenseCount));

        // Notify user if known
        if ($user) {
            $user->notify(new RealTimeNotification([
                'title' => 'Violation Notice',
                'message' => "You have been flagged for a violation: " . ($validated['speed'] ? "Speeding" : "Noise"),
                'url' => "/violations/{$violation->id}",
                'custom_id' => $user->custom_id,
            ]));
        }

        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new RealTimeNotification([
                'title' => 'New Violation Reported',
                'message' => "A new violation has been reported" . ($user ? " by user: {$userName}" : " (unknown user)"),
                'url' => "/admin/violations/{$violation->id}",
                'custom_id' => $admin->custom_id,
            ]));
        }

        return response()->json(['message' => 'Violation created and notifications sent.', 'violation' => $violation], 201);
    }

    public function show($customUserId)
    {
        $violations = Violation::where('custom_user_id', $customUserId)->get();

        if ($violations->isEmpty()) {
            return response()->json([
                'violations' => [],
                'todays_violations_count' => 0,
                'total_violations_count' => 0,
            ], 200);
        }

        $startOfToday = Carbon::now()->startOfDay()->toIso8601String();
        $endOfToday = Carbon::now()->endOfDay()->toIso8601String();

        $todaysViolationsCount = Violation::where('custom_user_id', $customUserId)
            ->where('detected_at', '>=', $startOfToday)
            ->where('detected_at', '<=', $endOfToday)
            ->count();

        $totalViolationsCount = Violation::where('custom_user_id', $customUserId)->count();

        return response()->json([
            'violations' => $violations,
            'todays_violations_count' => $todaysViolationsCount,
            'total_violations_count' => $totalViolationsCount,
        ]);
    }

    public function update(Request $request, $id)
    {
        $violation = Violation::find($id);

        if (!$violation) {
            return response()->json(['message' => 'Violation not found'], 404);
        }

        $validated = $request->validate([
            'plate_number' => 'sometimes|string',
            'detected_at' => 'sometimes|date',
            'speed' => 'sometimes|numeric',
            'decibel_level' => 'sometimes|numeric',
            'status' => 'required|string|in:flagged,under review,cleared,rejected',
            'letter' => 'nullable|file|mimes:pdf,doc,docx|max:2048',
        ]);

        if ($violation->status === 'under review' && !in_array($validated['status'], ['cleared', 'rejected'])) {
            Log::info('Invalid status transition', ['current_status' => $violation->status, 'new_status' => $validated['status']]);
            return response()->json(['message' => 'Invalid status transition'], 403);
        }

        if ($request->hasFile('letter')) {
            $path = $request->file('letter')->store('letters', 'public');
            $violation->letter_path = $path;
            $violation->status = 'under review';
        } else {
            $violation->status = $validated['status'];
        }

        $violation->save();

        $user = User::where('custom_id', $violation->custom_user_id)->first();

        if (!$user) {
            Log::info('User not found for violation', ['custom_user_id' => $violation->custom_user_id]);
            return response()->json(['message' => 'User not found']);
        }

        // Send SMS if violation is cleared
        if ($violation->status === 'cleared') {
            $message = "Your violation (ID: {$violation->id}) has been cleared. Thank you for your cooperation.";
            try {
                if ($user->phone_number) {
                    $smsController = new \App\Http\Controllers\SMSController();
                    $smsRequest = new \Illuminate\Http\Request([
                        'to' => $user->phone_number,
                        'message' => $message,
                    ]);
                    $smsController->sendSMS($smsRequest);
                }
            } catch (\Exception $e) {
                \Log::error('Failed to send cleared violation SMS', [
                    'user_id' => $user->id ?? null,
                    'violation_id' => $violation->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        Log::info('About to notify user on update', ['user_id' => $user->id, 'custom_id' => $user->custom_id, 'violation_id' => $violation->id]);
        $user->notify(new RealTimeNotification([
            'title' => 'Violation Update',
            'message' => "Your violation is now " . $validated['status'],
            'url' => "/violations/{$violation->id}",
            'custom_id' => $user->custom_id,
        ]));

        $admins = User::where('role', 'admin')->get();
        foreach ($admins as $admin) {
            Log::info('Notifying admin', ['admin_id' => $admin->id, 'custom_id' => $admin->custom_id]);
            $admin->notify(new RealTimeNotification([
                'title' => 'Violation Updated',
                'message' => "A violation for user: {$user->name} has been updated.",
                'url' => "/admin/violations/{$violation->id}",
                'custom_id' => $admin->custom_id,
            ]));
        }

        return response()->json(['message' => 'Violation updated successfully', 'violation' => $violation]);
    }
}