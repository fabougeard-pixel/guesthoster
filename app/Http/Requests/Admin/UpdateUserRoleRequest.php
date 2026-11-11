<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRoleRequest extends FormRequest
{
    /**
     * Access is restricted by the `role:admin` route middleware.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'role' => [
                'required',
                Rule::enum(UserRole::class),
                function (string $attribute, mixed $value, Closure $fail): void {
                    $user = $this->target();

                    if ($user->is($this->user())) {
                        $fail('Vous ne pouvez pas modifier votre propre rôle.');
                    } elseif ($value === UserRole::Client->value && $user->properties()->exists()) {
                        $fail('Ce compte possède des logements : il doit rester hôte ou administrateur.');
                    }
                },
            ],
        ];
    }

    public function role(): UserRole
    {
        return UserRole::from($this->string('role')->toString());
    }

    private function target(): User
    {
        /** @var User */
        return $this->route('user');
    }
}
