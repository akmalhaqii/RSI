<?php

namespace Tests\Feature;

use App\Models\User;
use PHPUnit\Framework\Attributes\TestWith;
use Tests\TestCase;

class WorkspaceAuthorizationTest extends TestCase
{
    #[TestWith(['manager', 'create_plan', 'Aksi ini hanya tersedia untuk HR/PSDM.'])]
    #[TestWith(['employee', 'assign', 'Aksi ini hanya tersedia untuk HR/PSDM.'])]
    #[TestWith(['hr', 'kpi_save', 'Aksi ini hanya tersedia untuk manajer.'])]
    #[TestWith(['manager', 'attendance', 'Aksi ini hanya tersedia untuk karyawan.'])]
    public function test_actions_return_403_for_roles_without_permission(string $role, string $action, string $message): void
    {
        $account = User::factory()->make();
        $account->forceFill(['id' => 1, 'role' => $role, 'active' => true]);

        $this->actingAs($account)
            ->postJson(route('v1.actions'), ['action' => $action])
            ->assertForbidden()
            ->assertJsonPath('message', $message);
    }

    public function test_deactivated_accounts_return_403_even_with_an_existing_session(): void
    {
        $account = User::factory()->make();
        $account->forceFill(['id' => 1, 'role' => 'employee', 'active' => false]);

        $this->actingAs($account)
            ->getJson(route('v1.me'))
            ->assertForbidden()
            ->assertJsonPath('message', 'Akun dinonaktifkan.');
    }
}
