import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  DemoSource,
  DemoType,
  EconomyType,
  Game,
  GameMode,
  GameType,
  RoundEndReason,
  TeamNumber,
  WeaponName,
  WeaponType,
} from 'csdm/common/types/counter-strike';
import { SearchEvent } from 'csdm/common/types/search/search-event';
import { TriStateFilter } from 'csdm/common/types/tri-state-filter';
import { createDatabaseConnection, db, getSqliteDatabase } from '../database';
import { searchClutches } from './search-clutches';
import { searchKills } from './search-kills';
import { searchPlayers } from './search-players';
import { searchMapNames } from './search-map-names';
import { searchMultiKills } from './search-multi-kills';
import { searchRounds } from './search-rounds';

describe('search database queries', () => {
  let tempFolderPath = '';
  let databaseFilePath = '';

  beforeEach(async () => {
    tempFolderPath = await fs.mkdtemp(path.join(os.tmpdir(), 'csdm-search-test-'));
    databaseFilePath = path.join(tempFolderPath, 'search.sqlite');

    createDatabaseConnection({
      filePath: databaseFilePath,
    });

    const sqliteDatabase = getSqliteDatabase();
    sqliteDatabase.exec(`
      CREATE TABLE players (
        steam_id TEXT NOT NULL,
        name TEXT NOT NULL,
        match_checksum TEXT NOT NULL,
        team_name TEXT
      );

      CREATE TABLE demos (
        checksum TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game TEXT NOT NULL,
        source TEXT NOT NULL,
        type TEXT NOT NULL,
        date timestamptz NOT NULL,
        network_protocol INTEGER NOT NULL,
        build_number INTEGER NOT NULL,
        server_name TEXT NOT NULL,
        client_name TEXT NOT NULL,
        tick_count INTEGER NOT NULL,
        tickrate REAL NOT NULL,
        framerate REAL NOT NULL,
        duration REAL NOT NULL,
        map_name TEXT NOT NULL,
        share_code TEXT
      );

      CREATE TABLE matches (
        checksum TEXT PRIMARY KEY,
        demo_path TEXT NOT NULL,
        game_type INTEGER NOT NULL,
        game_mode INTEGER NOT NULL,
        game_mode_str TEXT NOT NULL,
        is_ranked BOOLEAN NOT NULL,
        kill_count INTEGER NOT NULL,
        death_count INTEGER NOT NULL,
        assist_count INTEGER NOT NULL,
        shot_count INTEGER NOT NULL,
        winner_name TEXT NOT NULL,
        winner_side INTEGER NOT NULL,
        analyze_date timestamptz NOT NULL,
        overtime_count INTEGER NOT NULL,
        max_rounds INTEGER NOT NULL,
        has_vac_live_ban BOOLEAN NOT NULL
      );

      CREATE TABLE rounds (
        id INTEGER PRIMARY KEY,
        match_checksum TEXT NOT NULL,
        number INTEGER NOT NULL,
        start_tick INTEGER NOT NULL,
        start_frame INTEGER NOT NULL,
        freeze_time_end_tick INTEGER NOT NULL,
        freeze_time_end_frame INTEGER NOT NULL,
        end_tick INTEGER NOT NULL,
        end_frame INTEGER NOT NULL,
        end_officially_tick INTEGER NOT NULL,
        end_officially_frame INTEGER NOT NULL,
        team_a_name TEXT NOT NULL,
        team_b_name TEXT NOT NULL,
        team_a_score INTEGER NOT NULL,
        team_b_score INTEGER NOT NULL,
        team_b_side INTEGER NOT NULL,
        team_a_side INTEGER NOT NULL,
        team_a_start_money INTEGER NOT NULL,
        team_b_start_money INTEGER NOT NULL,
        team_a_equipment_value INTEGER NOT NULL,
        team_b_equipment_value INTEGER NOT NULL,
        team_a_money_spent INTEGER NOT NULL,
        team_b_money_spent INTEGER NOT NULL,
        team_a_economy_type TEXT NOT NULL,
        team_b_economy_type TEXT NOT NULL,
        duration INTEGER NOT NULL,
        end_reason TEXT NOT NULL,
        winner_name TEXT NOT NULL,
        winner_side INTEGER NOT NULL,
        overtime_number INTEGER NOT NULL
      );

      CREATE TABLE round_comments (
        match_checksum TEXT NOT NULL,
        number INTEGER NOT NULL,
        comment TEXT NOT NULL
      );

      CREATE TABLE round_tags (
        checksum TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        tag_id TEXT NOT NULL
      );

      CREATE TABLE checksum_tags (
        checksum TEXT NOT NULL,
        tag_id TEXT NOT NULL
      );

      CREATE TABLE kills (
        id INTEGER PRIMARY KEY,
        match_checksum TEXT NOT NULL,
        tick INTEGER NOT NULL,
        frame INTEGER NOT NULL,
        round_number INTEGER NOT NULL,
        killer_steam_id TEXT NOT NULL,
        killer_name TEXT NOT NULL,
        killer_side INTEGER NOT NULL,
        killer_team_name TEXT,
        is_killer_controlling_bot BOOLEAN NOT NULL,
        is_victim_controlling_bot BOOLEAN NOT NULL,
        is_assister_controlling_bot BOOLEAN NOT NULL,
        penetrated_objects INTEGER NOT NULL,
        victim_steam_id TEXT NOT NULL,
        victim_name TEXT NOT NULL,
        victim_side INTEGER NOT NULL,
        victim_team_name TEXT,
        assister_steam_id TEXT NOT NULL,
        assister_name TEXT,
        assister_side INTEGER NOT NULL,
        assister_team_name TEXT,
        is_headshot BOOLEAN NOT NULL,
        is_assisted_flash BOOLEAN NOT NULL,
        killer_x REAL NOT NULL,
        killer_y REAL NOT NULL,
        killer_z REAL NOT NULL,
        is_killer_airborne BOOLEAN NOT NULL,
        is_killer_blinded BOOLEAN NOT NULL,
        victim_x REAL NOT NULL,
        victim_y REAL NOT NULL,
        victim_z REAL NOT NULL,
        is_victim_airborne BOOLEAN NOT NULL,
        is_victim_blinded BOOLEAN NOT NULL,
        is_victim_inspecting_weapon BOOLEAN NOT NULL,
        assister_x REAL NOT NULL,
        assister_y REAL NOT NULL,
        assister_z REAL NOT NULL,
        weapon_name TEXT NOT NULL,
        weapon_type TEXT NOT NULL,
        is_trade_kill BOOLEAN NOT NULL,
        is_trade_death BOOLEAN NOT NULL,
        is_through_smoke BOOLEAN NOT NULL,
        is_no_scope BOOLEAN NOT NULL,
        distance REAL NOT NULL
      );

      CREATE TABLE clutches (
        id INTEGER PRIMARY KEY,
        match_checksum TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        tick INTEGER NOT NULL,
        frame INTEGER NOT NULL,
        opponent_count INTEGER NOT NULL,
        side INTEGER NOT NULL,
        won BOOLEAN NOT NULL,
        clutcher_steam_id TEXT NOT NULL,
        clutcher_name TEXT NOT NULL,
        has_clutcher_survived BOOLEAN NOT NULL,
        clutcher_kill_count INTEGER NOT NULL
      );
    `);
  });

  afterEach(async () => {
    await db.destroy();
    try {
      getSqliteDatabase().close();
    } catch {
      // The SQLite connection may already have been closed by Kysely.
    }
    await fs.rm(tempFolderPath, { recursive: true, force: true });
  });

  it('should search players case-insensitively, deduplicate steam IDs and ignore excluded players', async () => {
    const sqliteDatabase = getSqliteDatabase();
    sqliteDatabase.prepare(`
      INSERT INTO players (
        steam_id,
        name,
        match_checksum,
        team_name
      ) VALUES (?, ?, ?, ?)
    `).run('steam-1', 'Alpha', 'match-1', 'Team A');
    sqliteDatabase.prepare(`
      INSERT INTO players (
        steam_id,
        name,
        match_checksum,
        team_name
      ) VALUES (?, ?, ?, ?)
    `).run('steam-1', 'alpha newer', 'match-2', 'Team A');
    sqliteDatabase.prepare(`
      INSERT INTO players (
        steam_id,
        name,
        match_checksum,
        team_name
      ) VALUES (?, ?, ?, ?)
    `).run('steam-2', 'Bravo', 'match-1', 'Team B');

    const players = await searchPlayers({
      steamIdOrName: 'ALPHA',
      ignoredSteamIds: ['steam-2'],
    });

    expect(players).toEqual([
      {
        steamId: 'steam-1',
        name: 'Alpha',
      },
    ]);
  });

  it('should search map names case-insensitively and return unique results', async () => {
    const sqliteDatabase = getSqliteDatabase();
    const insertDemo = sqliteDatabase.prepare(`
      INSERT INTO demos (
        checksum,
        name,
        game,
        source,
        type,
        date,
        network_protocol,
        build_number,
        server_name,
        client_name,
        tick_count,
        tickrate,
        framerate,
        duration,
        map_name,
        share_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMatch = sqliteDatabase.prepare(`
      INSERT INTO matches (
        checksum,
        demo_path,
        game_type,
        game_mode,
        game_mode_str,
        is_ranked,
        kill_count,
        death_count,
        assist_count,
        shot_count,
        winner_name,
        winner_side,
        analyze_date,
        overtime_count,
        max_rounds,
        has_vac_live_ban
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertDemo.run(
      'demo-1',
      'demo-1.dem',
      Game.CS2,
      DemoSource.Valve,
      DemoType.GOTV,
      '2026-04-04T15:39:56.000Z',
      1,
      1,
      'server',
      'client',
      100,
      64,
      64,
      10,
      'de_dust2',
      null,
    );
    insertDemo.run(
      'demo-2',
      'demo-2.dem',
      Game.CS2,
      DemoSource.Valve,
      DemoType.GOTV,
      '2026-04-05T15:39:56.000Z',
      1,
      1,
      'server',
      'client',
      100,
      64,
      64,
      10,
      'de_dust2',
      null,
    );
    insertDemo.run(
      'demo-3',
      'demo-3.dem',
      Game.CS2,
      DemoSource.Valve,
      DemoType.GOTV,
      '2026-04-06T15:39:56.000Z',
      1,
      1,
      'server',
      'client',
      100,
      64,
      64,
      10,
      'de_mirage',
      null,
    );

    insertMatch.run('demo-1', 'demo-1.dem', GameType.Classic, 0, GameMode.Competitive, 1, 1, 1, 1, 1, 'A', TeamNumber.CT, '2026-04-04T15:39:56.000Z', 0, 24, 0);
    insertMatch.run('demo-2', 'demo-2.dem', GameType.Classic, 0, GameMode.Competitive, 1, 1, 1, 1, 1, 'A', TeamNumber.CT, '2026-04-05T15:39:56.000Z', 0, 24, 0);
    insertMatch.run('demo-3', 'demo-3.dem', GameType.Classic, 0, GameMode.Competitive, 1, 1, 1, 1, 1, 'A', TeamNumber.CT, '2026-04-06T15:39:56.000Z', 0, 24, 0);

    const maps = await searchMapNames({
      name: 'DUST',
      ignoredNames: [],
    });

    expect(maps).toEqual(['de_dust2']);
  });

  it('should aggregate round tags into a single round result and keep ISO dates', async () => {
    const sqliteDatabase = getSqliteDatabase();
    sqliteDatabase.prepare(`
      INSERT INTO demos (
        checksum,
        name,
        game,
        source,
        type,
        date,
        network_protocol,
        build_number,
        server_name,
        client_name,
        tick_count,
        tickrate,
        framerate,
        duration,
        map_name,
        share_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-1',
      'demo.dem',
      Game.CS2,
      DemoSource.Valve,
      DemoType.GOTV,
      '2026-04-04T15:39:56.000Z',
      1,
      1,
      'server',
      'client',
      1000,
      64,
      64,
      120,
      'de_dust2',
      null,
    );

    sqliteDatabase.prepare(`
      INSERT INTO matches (
        checksum,
        demo_path,
        game_type,
        game_mode,
        game_mode_str,
        is_ranked,
        kill_count,
        death_count,
        assist_count,
        shot_count,
        winner_name,
        winner_side,
        analyze_date,
        overtime_count,
        max_rounds,
        has_vac_live_ban
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-1',
      'C:\\demo.dem',
      GameType.Classic,
      0,
      GameMode.Competitive,
      1,
      10,
      10,
      10,
      10,
      'Team A',
      TeamNumber.CT,
      '2026-04-04T15:39:56.000Z',
      0,
      24,
      0,
    );

    sqliteDatabase.prepare(`
      INSERT INTO rounds (
        id,
        match_checksum,
        number,
        start_tick,
        start_frame,
        freeze_time_end_tick,
        freeze_time_end_frame,
        end_tick,
        end_frame,
        end_officially_tick,
        end_officially_frame,
        team_a_name,
        team_b_name,
        team_a_score,
        team_b_score,
        team_b_side,
        team_a_side,
        team_a_start_money,
        team_b_start_money,
        team_a_equipment_value,
        team_b_equipment_value,
        team_a_money_spent,
        team_b_money_spent,
        team_a_economy_type,
        team_b_economy_type,
        duration,
        end_reason,
        winner_name,
        winner_side,
        overtime_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'match-1',
      1,
      10,
      10,
      20,
      20,
      100,
      100,
      110,
      110,
      'Team A',
      'Team B',
      1,
      0,
      TeamNumber.T,
      TeamNumber.CT,
      800,
      800,
      1000,
      1000,
      500,
      500,
      EconomyType.Full,
      EconomyType.Full,
      90,
      RoundEndReason.TargetBombed,
      'Team A',
      TeamNumber.CT,
      0,
    );

    sqliteDatabase.prepare(`INSERT INTO round_comments (match_checksum, number, comment) VALUES (?, ?, ?)`).run(
      'match-1',
      1,
      'important round',
    );
    sqliteDatabase.prepare(`INSERT INTO round_tags (checksum, round_number, tag_id) VALUES (?, ?, ?)`).run(
      'match-1',
      1,
      'tag-1',
    );
    sqliteDatabase.prepare(`INSERT INTO round_tags (checksum, round_number, tag_id) VALUES (?, ?, ?)`).run(
      'match-1',
      1,
      'tag-2',
    );
    sqliteDatabase.prepare(`INSERT INTO checksum_tags (checksum, tag_id) VALUES (?, ?)`).run('match-1', 'match-tag-1');
    sqliteDatabase.prepare(`INSERT INTO players (steam_id, name, match_checksum, team_name) VALUES (?, ?, ?, ?)`).run(
      'steam-1',
      'Alpha',
      'match-1',
      'Team A',
    );

    const rounds = await searchRounds({
      steamIds: ['steam-1'],
      victimSteamIds: [],
      mapNames: ['de_dust2'],
      startDate: undefined,
      endDate: undefined,
      demoSources: [DemoSource.Valve],
      weaponNames: [],
      roundTagIds: [],
      matchTagIds: ['match-tag-1'],
    });

    expect(rounds).toHaveLength(1);
    expect(rounds[0]).toMatchObject({
      id: 1,
      matchChecksum: 'match-1',
      mapName: 'de_dust2',
      demoPath: 'C:\\demo.dem',
      game: Game.CS2,
      comment: 'important round',
      date: '2026-04-04T15:39:56.000Z',
    });
    expect(rounds[0].tagIds.sort()).toEqual(['tag-1', 'tag-2']);
  });

  it('should group collateral kills by tick and keep SQLite boolean filters working', async () => {
    const sqliteDatabase = getSqliteDatabase();

    sqliteDatabase.prepare(`
      INSERT INTO demos (
        checksum,
        name,
        game,
        source,
        type,
        date,
        network_protocol,
        build_number,
        server_name,
        client_name,
        tick_count,
        tickrate,
        framerate,
        duration,
        map_name,
        share_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-kills',
      'kills.dem',
      Game.CS2,
      DemoSource.Valve,
      DemoType.GOTV,
      '2026-04-04T15:39:56.000Z',
      1,
      1,
      'server',
      'client',
      1000,
      64,
      64,
      120,
      'de_dust2',
      null,
    );

    sqliteDatabase.prepare(`
      INSERT INTO matches (
        checksum,
        demo_path,
        game_type,
        game_mode,
        game_mode_str,
        is_ranked,
        kill_count,
        death_count,
        assist_count,
        shot_count,
        winner_name,
        winner_side,
        analyze_date,
        overtime_count,
        max_rounds,
        has_vac_live_ban
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-kills',
      'C:\\kills.dem',
      GameType.Classic,
      0,
      GameMode.Competitive,
      1,
      3,
      3,
      0,
      10,
      'Team A',
      TeamNumber.CT,
      '2026-04-04T15:39:56.000Z',
      0,
      24,
      0,
    );

    sqliteDatabase.prepare(`INSERT INTO round_comments (match_checksum, number, comment) VALUES (?, ?, ?)`).run(
      'match-kills',
      1,
      'collateral round',
    );

    const insertKill = sqliteDatabase.prepare(`
      INSERT INTO kills (
        id,
        match_checksum,
        tick,
        frame,
        round_number,
        killer_steam_id,
        killer_name,
        killer_side,
        killer_team_name,
        is_killer_controlling_bot,
        is_victim_controlling_bot,
        is_assister_controlling_bot,
        penetrated_objects,
        victim_steam_id,
        victim_name,
        victim_side,
        victim_team_name,
        assister_steam_id,
        assister_name,
        assister_side,
        assister_team_name,
        is_headshot,
        is_assisted_flash,
        killer_x,
        killer_y,
        killer_z,
        is_killer_airborne,
        is_killer_blinded,
        victim_x,
        victim_y,
        victim_z,
        is_victim_airborne,
        is_victim_blinded,
        is_victim_inspecting_weapon,
        assister_x,
        assister_y,
        assister_z,
        weapon_name,
        weapon_type,
        is_trade_kill,
        is_trade_death,
        is_through_smoke,
        is_no_scope,
        distance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertKill.run(
      1,
      'match-kills',
      128,
      128,
      1,
      'killer-1',
      'Alpha',
      TeamNumber.CT,
      'Team A',
      0,
      0,
      0,
      1,
      'victim-1',
      'Bravo',
      TeamNumber.T,
      'Team B',
      '',
      null,
      TeamNumber.CT,
      null,
      1,
      0,
      10,
      20,
      30,
      0,
      0,
      40,
      50,
      60,
      0,
      0,
      0,
      0,
      0,
      0,
      WeaponName.AK47,
      WeaponType.Rifle,
      0,
      0,
      0,
      0,
      400,
    );
    insertKill.run(
      2,
      'match-kills',
      128,
      128,
      1,
      'killer-1',
      'Alpha',
      TeamNumber.CT,
      'Team A',
      0,
      0,
      0,
      1,
      'victim-2',
      'Charlie',
      TeamNumber.T,
      'Team B',
      '',
      null,
      TeamNumber.CT,
      null,
      1,
      0,
      11,
      21,
      31,
      0,
      0,
      41,
      51,
      61,
      0,
      0,
      0,
      0,
      0,
      0,
      WeaponName.AK47,
      WeaponType.Rifle,
      0,
      0,
      0,
      0,
      410,
    );
    insertKill.run(
      3,
      'match-kills',
      200,
      200,
      1,
      'killer-1',
      'Alpha',
      TeamNumber.CT,
      'Team A',
      0,
      0,
      0,
      0,
      'victim-3',
      'Delta',
      TeamNumber.T,
      'Team B',
      '',
      null,
      TeamNumber.CT,
      null,
      0,
      0,
      12,
      22,
      32,
      0,
      0,
      42,
      52,
      62,
      0,
      0,
      0,
      0,
      0,
      0,
      WeaponName.AK47,
      WeaponType.Rifle,
      0,
      0,
      0,
      0,
      420,
    );

    const kills = await searchKills({
      event: SearchEvent.Kills,
      steamIds: ['killer-1'],
      victimSteamIds: [],
      mapNames: ['de_dust2'],
      startDate: undefined,
      endDate: undefined,
      demoSources: [DemoSource.Valve],
      roundTagIds: [],
      matchTagIds: [],
      weaponNames: [WeaponName.AK47],
      headshot: TriStateFilter.Yes,
      noScope: TriStateFilter.No,
      wallbang: TriStateFilter.Yes,
      jump: TriStateFilter.No,
      throughSmoke: TriStateFilter.No,
      teamKill: TriStateFilter.No,
      collateralKill: TriStateFilter.Yes,
    });

    expect(kills).toHaveLength(1);
    expect(kills[0]).toMatchObject({
      matchChecksum: 'match-kills',
      demoPath: 'C:\\kills.dem',
      roundNumber: 1,
      tick: 128,
      killerSteamId: 'killer-1',
      killerName: 'Alpha',
      mapName: 'de_dust2',
      date: '2026-04-04T15:39:56.000Z',
      roundComment: 'collateral round',
    });
    expect(kills[0].kills).toHaveLength(2);
    expect(kills[0].kills.map((kill) => kill.victimSteamId).sort()).toEqual(['victim-1', 'victim-2']);
  });

  it('should only return won clutches for the requested opponent count', async () => {
    const sqliteDatabase = getSqliteDatabase();

    sqliteDatabase.prepare(`
      INSERT INTO demos (
        checksum,
        name,
        game,
        source,
        type,
        date,
        network_protocol,
        build_number,
        server_name,
        client_name,
        tick_count,
        tickrate,
        framerate,
        duration,
        map_name,
        share_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-clutches',
      'clutches.dem',
      Game.CS2,
      DemoSource.Valve,
      DemoType.GOTV,
      '2026-04-05T15:39:56.000Z',
      1,
      1,
      'server',
      'client',
      1000,
      64,
      64,
      120,
      'de_inferno',
      null,
    );

    sqliteDatabase.prepare(`
      INSERT INTO matches (
        checksum,
        demo_path,
        game_type,
        game_mode,
        game_mode_str,
        is_ranked,
        kill_count,
        death_count,
        assist_count,
        shot_count,
        winner_name,
        winner_side,
        analyze_date,
        overtime_count,
        max_rounds,
        has_vac_live_ban
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-clutches',
      'C:\\clutches.dem',
      GameType.Classic,
      0,
      GameMode.Competitive,
      1,
      10,
      10,
      2,
      20,
      'Team A',
      TeamNumber.CT,
      '2026-04-05T15:39:56.000Z',
      0,
      24,
      0,
    );

    sqliteDatabase.prepare(`INSERT INTO round_comments (match_checksum, number, comment) VALUES (?, ?, ?)`).run(
      'match-clutches',
      8,
      'won clutch',
    );

    const insertClutch = sqliteDatabase.prepare(`
      INSERT INTO clutches (
        id,
        match_checksum,
        round_number,
        tick,
        frame,
        opponent_count,
        side,
        won,
        clutcher_steam_id,
        clutcher_name,
        has_clutcher_survived,
        clutcher_kill_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertClutch.run(1, 'match-clutches', 8, 800, 800, 2, TeamNumber.CT, 1, 'clutcher-1', 'Anchor', 1, 2);
    insertClutch.run(2, 'match-clutches', 9, 900, 900, 2, TeamNumber.CT, 0, 'clutcher-1', 'Anchor', 0, 1);
    insertClutch.run(3, 'match-clutches', 10, 1000, 1000, 3, TeamNumber.CT, 1, 'clutcher-1', 'Anchor', 1, 3);

    const clutches = await searchClutches({
      opponentCount: 2,
      steamIds: ['clutcher-1'],
      victimSteamIds: [],
      mapNames: ['de_inferno'],
      startDate: undefined,
      endDate: undefined,
      demoSources: [DemoSource.Valve],
      weaponNames: [],
      roundTagIds: [],
      matchTagIds: [],
    });

    expect(clutches).toEqual([
      expect.objectContaining({
        id: 1,
        matchChecksum: 'match-clutches',
        roundNumber: 8,
        tick: 800,
        clutcherSteamId: 'clutcher-1',
        clutcherName: 'Anchor',
        won: true,
        opponentCount: 2,
        mapName: 'de_inferno',
        date: '2026-04-05T15:39:56.000Z',
        demoPath: 'C:\\clutches.dem',
        roundComment: 'won clutch',
      }),
    ]);
  });

  it('should aggregate multi-kills by round and preserve all kills in the result', async () => {
    const sqliteDatabase = getSqliteDatabase();

    sqliteDatabase.prepare(`
      INSERT INTO demos (
        checksum,
        name,
        game,
        source,
        type,
        date,
        network_protocol,
        build_number,
        server_name,
        client_name,
        tick_count,
        tickrate,
        framerate,
        duration,
        map_name,
        share_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-multi',
      'multi.dem',
      Game.CS2,
      DemoSource.Valve,
      DemoType.GOTV,
      '2026-04-06T15:39:56.000Z',
      1,
      1,
      'server',
      'client',
      1000,
      64,
      64,
      120,
      'de_nuke',
      null,
    );

    sqliteDatabase.prepare(`
      INSERT INTO matches (
        checksum,
        demo_path,
        game_type,
        game_mode,
        game_mode_str,
        is_ranked,
        kill_count,
        death_count,
        assist_count,
        shot_count,
        winner_name,
        winner_side,
        analyze_date,
        overtime_count,
        max_rounds,
        has_vac_live_ban
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'match-multi',
      'C:\\multi.dem',
      GameType.Classic,
      0,
      GameMode.Competitive,
      1,
      5,
      5,
      1,
      20,
      'Team A',
      TeamNumber.CT,
      '2026-04-06T15:39:56.000Z',
      0,
      24,
      0,
    );

    sqliteDatabase.prepare(`INSERT INTO round_comments (match_checksum, number, comment) VALUES (?, ?, ?)`).run(
      'match-multi',
      3,
      'double kill round',
    );

    const insertKill = sqliteDatabase.prepare(`
      INSERT INTO kills (
        id,
        match_checksum,
        tick,
        frame,
        round_number,
        killer_steam_id,
        killer_name,
        killer_side,
        killer_team_name,
        is_killer_controlling_bot,
        is_victim_controlling_bot,
        is_assister_controlling_bot,
        penetrated_objects,
        victim_steam_id,
        victim_name,
        victim_side,
        victim_team_name,
        assister_steam_id,
        assister_name,
        assister_side,
        assister_team_name,
        is_headshot,
        is_assisted_flash,
        killer_x,
        killer_y,
        killer_z,
        is_killer_airborne,
        is_killer_blinded,
        victim_x,
        victim_y,
        victim_z,
        is_victim_airborne,
        is_victim_blinded,
        is_victim_inspecting_weapon,
        assister_x,
        assister_y,
        assister_z,
        weapon_name,
        weapon_type,
        is_trade_kill,
        is_trade_death,
        is_through_smoke,
        is_no_scope,
        distance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertKill.run(
      10,
      'match-multi',
      300,
      300,
      3,
      'killer-2',
      'Duo',
      TeamNumber.T,
      'Team T',
      0,
      0,
      0,
      0,
      'victim-10',
      'Echo',
      TeamNumber.CT,
      'Team CT',
      '',
      null,
      TeamNumber.T,
      null,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      WeaponName.AWP,
      WeaponType.Sniper,
      0,
      0,
      0,
      0,
      1000,
    );
    insertKill.run(
      11,
      'match-multi',
      320,
      320,
      3,
      'killer-2',
      'Duo',
      TeamNumber.T,
      'Team T',
      0,
      0,
      0,
      0,
      'victim-11',
      'Foxtrot',
      TeamNumber.CT,
      'Team CT',
      '',
      null,
      TeamNumber.T,
      null,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      WeaponName.AWP,
      WeaponType.Sniper,
      0,
      0,
      0,
      0,
      1100,
    );
    insertKill.run(
      12,
      'match-multi',
      500,
      500,
      4,
      'killer-2',
      'Duo',
      TeamNumber.T,
      'Team T',
      0,
      0,
      0,
      0,
      'victim-12',
      'Golf',
      TeamNumber.CT,
      'Team CT',
      '',
      null,
      TeamNumber.T,
      null,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      WeaponName.AWP,
      WeaponType.Sniper,
      0,
      0,
      0,
      0,
      1200,
    );

    const multiKills = await searchMultiKills({
      killCount: 2,
      steamIds: ['killer-2'],
      victimSteamIds: ['victim-10'],
      weaponNames: [WeaponName.AWP],
      mapNames: ['de_nuke'],
      startDate: undefined,
      endDate: undefined,
      demoSources: [DemoSource.Valve],
      roundTagIds: [],
      matchTagIds: [],
    });

    expect(multiKills).toHaveLength(1);
    expect(multiKills[0]).toMatchObject({
      matchChecksum: 'match-multi',
      matchTickrate: 64,
      demoPath: 'C:\\multi.dem',
      killerSteamId: 'killer-2',
      killerName: 'Duo',
      roundNumber: 3,
      mapName: 'de_nuke',
      date: '2026-04-06T15:39:56.000Z',
      roundComment: 'double kill round',
    });
    expect(multiKills[0].kills).toHaveLength(2);
    expect(multiKills[0].kills.map((kill) => kill.victimSteamId).sort()).toEqual(['victim-10', 'victim-11']);
  });
});
