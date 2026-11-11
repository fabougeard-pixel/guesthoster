<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Property;
use App\Models\User;

class PropertyPolicy
{
    /**
     * Listed (published, host not suspended) listings are public ; others are visible to their host and to admins.
     */
    public function view(?User $user, Property $property): bool
    {
        if ($property->isListed()) {
            return true;
        }

        return $user !== null && $this->update($user, $property);
    }

    public function create(User $user): bool
    {
        return $user->hasRole(UserRole::Host, UserRole::Admin);
    }

    public function update(User $user, Property $property): bool
    {
        return $user->isAdmin() || $property->isOwnedBy($user);
    }

    /**
     * A listing that has ever been booked is archived instead, to keep the booking history.
     */
    public function delete(User $user, Property $property): bool
    {
        return $this->update($user, $property) && ! $property->bookings()->exists();
    }
}
