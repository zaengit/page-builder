<?php

namespace App\Policies;

use App\Models\Page;
use App\Models\User;

final class PagePolicy
{
    public function view(User $user, Page $page): bool
    {
        return $page->user_id !== null && $page->user_id === $user->id;
    }

    public function update(User $user, Page $page): bool
    {
        return $this->view($user, $page);
    }

    public function publish(User $user, Page $page): bool
    {
        return $this->update($user, $page);
    }

    public function preview(User $user, Page $page): bool
    {
        return $this->view($user, $page);
    }
}
