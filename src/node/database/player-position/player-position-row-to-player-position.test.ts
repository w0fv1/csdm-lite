import { describe, expect, it } from 'vite-plus/test';
import { TeamNumber, WeaponName } from 'csdm/common/types/counter-strike';
import { playerPositionRowToPlayerPosition } from './player-position-row-to-player-position';
import type { PlayerPositionRow } from './player-position-table';

describe('playerPositionRowToPlayerPosition', () => {
  it('should map isDucking from the is_ducking column', () => {
    const row = {
      id: 1,
      match_checksum: 'checksum',
      round_number: 12,
      tick: 1234,
      frame: 5678,
      player_steam_id: 'steam-id',
      player_name: 'Player',
      is_alive: true,
      x: 1,
      y: 2,
      z: 3,
      yaw: 90,
      flash_duration_remaining: 0,
      side: TeamNumber.CT,
      health: 100,
      money: 800,
      armor: 100,
      has_helmet: true,
      has_bomb: false,
      has_defuse_kit: true,
      is_ducking: false,
      is_airborne: true,
      is_scoping: false,
      is_defusing: false,
      is_planting: false,
      is_grabbing_hostage: false,
      active_weapon_name: WeaponName.AK47,
      equipments: null,
      grenades: null,
      pistols: null,
      smgs: null,
      rifles: null,
      heavy: null,
    } as PlayerPositionRow;

    const position = playerPositionRowToPlayerPosition(row);

    expect(position.isAlive).toBe(true);
    expect(position.isDucking).toBe(false);
  });

  it('should sort weapon lists consistently', () => {
    const row = {
      id: 1,
      match_checksum: 'checksum',
      round_number: 12,
      tick: 1234,
      frame: 5678,
      player_steam_id: 'steam-id',
      player_name: 'Player',
      is_alive: true,
      x: 1,
      y: 2,
      z: 3,
      yaw: 90,
      flash_duration_remaining: 0,
      side: TeamNumber.T,
      health: 100,
      money: 800,
      armor: 100,
      has_helmet: true,
      has_bomb: false,
      has_defuse_kit: false,
      is_ducking: true,
      is_airborne: false,
      is_scoping: false,
      is_defusing: false,
      is_planting: false,
      is_grabbing_hostage: false,
      active_weapon_name: WeaponName.Glock,
      equipments: 'Zeus,Bomb,Knife',
      grenades: 'Smoke,Flashbang',
      pistols: 'P250,Glock',
      smgs: 'P90,MP9',
      rifles: 'M4A4,AK-47',
      heavy: 'Nova,Mag-7',
    } as PlayerPositionRow;

    const position = playerPositionRowToPlayerPosition(row);

    expect(position.equipments).toBe('Bomb,Knife,Zeus');
    expect(position.grenades).toBe('Flashbang,Smoke');
    expect(position.pistols).toBe('Glock,P250');
    expect(position.smgs).toBe('MP9,P90');
    expect(position.rifles).toBe('AK-47,M4A4');
    expect(position.heavy).toBe('Mag-7,Nova');
  });
});
