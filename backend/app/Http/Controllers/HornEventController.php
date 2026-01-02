<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class HornEventController extends Controller
{
    /**
     * List detector-generated JSON events from storage/app/public/violation_images
     */
    public function index(Request $request)
    {
        $dir = storage_path('app/public/violation_images');
        if (!is_dir($dir)) {
            return response()->json([], 200);
        }

        $files = array_values(array_filter(scandir($dir), function ($f) use ($dir) {
            return is_file($dir . DIRECTORY_SEPARATOR . $f) && preg_match('/\.json$/i', $f);
        }));

        $events = [];
        foreach ($files as $f) {
            $path = $dir . DIRECTORY_SEPARATOR . $f;
            try {
                $content = file_get_contents($path);
                $data = json_decode($content, true);
                if (is_array($data)) {
                    // attach filename for reference
                    $data['_source_file'] = $f;
                    $events[] = $data;
                }
            } catch (\Exception $e) {
                // ignore malformed files
            }
        }

        // sort by detected_at if available, newest first
        usort($events, function ($a, $b) {
            $ta = isset($a['detected_at']) ? strtotime($a['detected_at']) : 0;
            $tb = isset($b['detected_at']) ? strtotime($b['detected_at']) : 0;
            return $tb <=> $ta;
        });

        return response()->json($events);
    }
}
