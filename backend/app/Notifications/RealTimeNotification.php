<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RealTimeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $data;

    /**
     * Create a new notification instance.
     */
    public function __construct($data)
    {
        $this->data = $data;
        \Log::info('RealTimeNotification initialized with data:', $data);
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'broadcast'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->line($this->data['message'])
            ->action('View Details', url($this->data['url']))
            ->line('Thank you for using our application!');
    }

    /**
     * Specify the broadcast channel.
     */
    public function broadcastOn(): array
    {
        if (!isset($this->data['custom_id'])) {
            \Log::error('Missing custom_id in notification data', $this->data);
            return [];
        }

        \Log::info('Broadcasting on public channel:', ['channel' => 'notifications.' . $this->data['custom_id']]);

        return [
            new Channel('notifications.' . $this->data['custom_id']),
        ];
    }

    /**
     * Get the broadcast representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'title' => $this->data['title'],
            'message' => $this->data['message'],
            'url' => $this->data['url'],
        ]);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'title' => $this->data['title'],
            'message' => $this->data['message'],
            'url' => $this->data['url'],
        ];
    }
}