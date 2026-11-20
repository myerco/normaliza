import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './db.js';

const CAMPAIGN_ID = 'jornada-do-conhecimento';
const SEED_FILE = path.resolve(process.cwd(), 'data/content.seed.json');

export async function seedContent() {
  const { rows } = await pool.query('select count(*)::int as count from public.knowledge_territories');

  if (rows[0]?.count > 0) {
    return { seeded: false, reason: 'already-seeded' };
  }

  const seed = JSON.parse(await fs.readFile(SEED_FILE, 'utf8'));
  const client = await pool.connect();

  try {
    await client.query('begin');
    await insertWorld(client, seed.world);
    await insertQuests(client, seed.questCatalog, seed.world, false);
    await client.query('commit');
    return { seeded: true };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function readContent() {
  const [
    territories,
    tracks,
    skills,
    professions,
    trackTerritories,
    trackSkills,
    trackPrerequisites,
    quests,
    questTracks,
    questSkills,
    questPrerequisites,
    professionSkills
  ] = await Promise.all([
    pool.query('select * from public.knowledge_territories order by order_index, name'),
    pool.query('select * from public.knowledge_tracks order by order_index, name'),
    pool.query('select * from public.knowledge_skills order by order_index, name'),
    pool.query('select * from public.knowledge_professions order by name'),
    pool.query('select * from public.knowledge_track_territories order by territory_id, order_index'),
    pool.query('select * from public.knowledge_track_skills order by track_id, skill_id'),
    pool.query('select * from public.knowledge_track_prerequisites order by track_id, prerequisite_track_id'),
    pool.query('select * from public.quests order by order_index, name'),
    pool.query('select * from public.quest_tracks order by track_id, order_index'),
    pool.query('select * from public.quest_skills order by quest_id, skill_id'),
    pool.query('select * from public.quest_prerequisites order by quest_id, prerequisite_quest_id'),
    pool.query('select * from public.knowledge_profession_skills order by profession_id, skill_id')
  ]);

  const now = new Date().toISOString();
  const world = {
    version: 1,
    territories: territories.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      shortName: row.short_name,
      description: row.description,
      color: row.color,
      icon: row.icon,
      mapX: row.map_x,
      mapY: row.map_y,
      order: row.order_index,
      status: row.status,
      publishedAt: row.published_at,
      frontier: row.is_frontier
    })),
    tracks: tracks.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      objective: row.objective,
      order: row.order_index,
      status: row.status,
      publishedAt: row.published_at
    })),
    skills: skills.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      icon: row.icon,
      maxLevel: row.max_level,
      order: row.order_index,
      status: row.status
    })),
    professions: professions.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      suggestionThreshold: row.suggestion_threshold,
      minimumSkills: row.minimum_skills,
      status: row.status
    })),
    trackTerritories: trackTerritories.rows.map((row) => ({
      territoryId: row.territory_id,
      trackId: row.track_id,
      order: row.order_index,
      mapX: row.map_x,
      mapY: row.map_y
    })),
    trackQuests: questTracks.rows.map((row) => ({
      trackId: row.track_id,
      questId: row.quest_id,
      order: row.order_index,
      required: row.is_required
    })),
    trackSkills: trackSkills.rows.map((row) => ({
      trackId: row.track_id,
      skillId: row.skill_id,
      targetLevel: row.target_level,
      weight: Number(row.weight)
    })),
    questSkills: questSkills.rows.map((row) => ({
      questId: row.quest_id,
      skillId: row.skill_id,
      levelDelta: row.level_delta
    })),
    professionSkills: professionSkills.rows.map((row) => ({
      professionId: row.profession_id,
      skillId: row.skill_id,
      weight: Number(row.weight),
      targetLevel: row.target_level
    })),
    trackPrerequisites: trackPrerequisites.rows.map((row) => ({
      trackId: row.track_id,
      prerequisiteTrackId: row.prerequisite_track_id
    }))
  };
  const questCatalog = {
    version: 2,
    campaigns: [
      {
        id: CAMPAIGN_ID,
        slug: CAMPAIGN_ID,
        name: 'Jornada do Conhecimento',
        description: 'Uma trilha de desafios para evoluir em dados e tecnologia.',
        imageId: null,
        order: 1,
        active: true,
        createdAt: now,
        updatedAt: now
      }
    ],
    quests: quests.rows.map((row) => ({
      id: row.id,
      campaignId: CAMPAIGN_ID,
      slug: row.slug,
      name: row.name,
      description: row.description,
      objective: row.objective,
      category: row.category,
      difficulty: row.difficulty,
      order: row.order_index,
      xpReward: row.xp_reward,
      maxScore: row.max_score,
      moduleKey: row.module_key,
      entryPath: row.entry_path,
      imageId: null,
      attributeRewards: row.attribute_rewards ?? {},
      isOptional: Boolean(row.is_optional),
      status: row.status,
      active: row.status === 'published',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    dependencies: questPrerequisites.rows.map((row) => ({
      questId: row.quest_id,
      prerequisiteId: row.prerequisite_quest_id
    }))
  };

  return { world, questCatalog };
}

export async function saveContent({ world, questCatalog }) {
  if (!world || !questCatalog) {
    throw new Error('invalid-content');
  }

  const client = await pool.connect();

  try {
    await client.query('begin');
    await insertWorld(client, world, true);
    await insertQuests(client, questCatalog, world, true);
    await client.query('commit');
    return readContent();
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

async function insertWorld(client, world, upsert = false) {
  const territoryConflict = upsert
    ? `do update set slug = excluded.slug, name = excluded.name,
        short_name = excluded.short_name, description = excluded.description,
        color = excluded.color, icon = excluded.icon, map_x = excluded.map_x,
        map_y = excluded.map_y, order_index = excluded.order_index,
        status = excluded.status, is_frontier = excluded.is_frontier,
        published_at = excluded.published_at`
    : 'do nothing';
  const trackConflict = upsert
    ? `do update set slug = excluded.slug, name = excluded.name,
        description = excluded.description, objective = excluded.objective,
        order_index = excluded.order_index, status = excluded.status,
        published_at = excluded.published_at`
    : 'do nothing';
  const skillConflict = upsert
    ? `do update set slug = excluded.slug, name = excluded.name,
        description = excluded.description, category_id = excluded.category_id,
        icon = excluded.icon, max_level = excluded.max_level,
        order_index = excluded.order_index, status = excluded.status`
    : 'do nothing';
  const professionConflict = upsert
    ? `do update set slug = excluded.slug, name = excluded.name,
        description = excluded.description,
        suggestion_threshold = excluded.suggestion_threshold,
        minimum_skills = excluded.minimum_skills, status = excluded.status`
    : 'do nothing';

  for (const territory of world.territories ?? []) {
    await client.query(
      `insert into public.knowledge_territories
        (id, slug, name, short_name, description, color, icon, map_x, map_y, order_index, status, is_frontier, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (id) ${territoryConflict}`,
      [
        territory.id, territory.slug ?? territory.id, territory.name, territory.shortName ?? '',
        territory.description ?? '', territory.color ?? '#9acb45', territory.icon ?? '',
        territory.mapX ?? 50, territory.mapY ?? 50, territory.order ?? 1,
        territory.status ?? 'published', Boolean(territory.frontier),
        territory.status === 'draft' ? null : new Date()
      ]
    );
  }

  for (const track of world.tracks ?? []) {
    await client.query(
      `insert into public.knowledge_tracks
        (id, slug, name, description, objective, order_index, status, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (id) ${trackConflict}`,
      [
        track.id, track.slug ?? track.id, track.name, track.description ?? '',
        track.objective ?? '', track.order ?? 1, track.status ?? 'published',
        track.status === 'draft' ? null : new Date()
      ]
    );
  }

  for (const skill of world.skills ?? []) {
    await client.query(
      `insert into public.knowledge_skills
        (id, slug, name, description, category_id, icon, max_level, order_index, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (id) ${skillConflict}`,
      [
        skill.id, skill.slug ?? skill.id, skill.name, skill.description ?? '',
        skill.categoryId ?? 'geral', skill.icon ?? '', skill.maxLevel ?? 10,
        skill.order ?? 1, skill.status ?? 'published'
      ]
    );
  }

  for (const profession of world.professions ?? []) {
    await client.query(
      `insert into public.knowledge_professions
        (id, slug, name, description, suggestion_threshold, minimum_skills, status)
       values ($1,$2,$3,$4,$5,$6,$7)
       on conflict (id) ${professionConflict}`,
      [
        profession.id, profession.slug ?? profession.id, profession.name,
        profession.description ?? '', profession.suggestionThreshold ?? 60,
        profession.minimumSkills ?? 2, profession.status ?? 'published'
      ]
    );
  }

  await client.query('delete from public.knowledge_track_territories');
  for (const link of world.trackTerritories ?? []) {
    await client.query(
      `insert into public.knowledge_track_territories
        (territory_id, track_id, order_index, map_x, map_y)
       values ($1,$2,$3,$4,$5) on conflict do nothing`,
      [link.territoryId, link.trackId, link.order ?? 1, link.mapX ?? 50, link.mapY ?? 50]
    );
  }

  await client.query('delete from public.knowledge_track_skills');
  for (const link of world.trackSkills ?? []) {
    await client.query(
      `insert into public.knowledge_track_skills
        (track_id, skill_id, target_level, weight)
       values ($1,$2,$3,$4) on conflict do nothing`,
      [link.trackId, link.skillId, link.targetLevel ?? 1, link.weight ?? 1]
    );
  }

  await client.query('delete from public.knowledge_track_prerequisites');
  for (const link of world.trackPrerequisites ?? []) {
    await client.query(
      `insert into public.knowledge_track_prerequisites
        (track_id, prerequisite_track_id)
       values ($1,$2) on conflict do nothing`,
      [link.trackId, link.prerequisiteTrackId]
    );
  }

  await client.query('delete from public.knowledge_profession_skills');
  for (const link of world.professionSkills ?? []) {
    await client.query(
      `insert into public.knowledge_profession_skills
        (profession_id, skill_id, weight, target_level)
       values ($1,$2,$3,$4) on conflict do nothing`,
      [link.professionId, link.skillId, link.weight ?? 1, link.targetLevel ?? 1]
    );
  }
}

async function insertQuests(client, questCatalog, world, upsert = false) {
  const questConflict = upsert
    ? `do update set slug = excluded.slug, name = excluded.name,
        description = excluded.description, objective = excluded.objective,
        category = excluded.category, module_key = excluded.module_key,
        entry_path = excluded.entry_path, difficulty = excluded.difficulty,
        order_index = excluded.order_index, xp_reward = excluded.xp_reward,
        max_score = excluded.max_score, attribute_rewards = excluded.attribute_rewards,
        is_optional = excluded.is_optional, status = excluded.status,
        published_at = excluded.published_at`
    : 'do nothing';

  for (const quest of questCatalog.quests ?? []) {
    const status = quest.status ?? (quest.active === false ? 'archived' : 'published');
    await client.query(
      `insert into public.quests
        (id, slug, name, description, objective, category, module_key, entry_path,
         difficulty, order_index, xp_reward, max_score, attribute_rewards, is_optional,
         status, published_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       on conflict (id) ${questConflict}`,
      [
        quest.id, quest.slug ?? quest.id, quest.name, quest.description ?? '',
        quest.objective ?? '', quest.category ?? 'Geral', quest.moduleKey ?? null,
        quest.entryPath ?? null, quest.difficulty ?? 1, quest.order ?? 1,
        quest.xpReward ?? 0, quest.maxScore ?? 100,
        JSON.stringify(quest.attributeRewards ?? {}), Boolean(quest.isOptional),
        status, status === 'draft' ? null : new Date()
      ]
    );
  }

  await client.query('delete from public.quest_tracks');
  await client.query('delete from public.quest_skills');
  await client.query('delete from public.quest_prerequisites');

  for (const link of world.trackQuests ?? []) {
    await client.query(
      `insert into public.quest_tracks (quest_id, track_id, order_index, is_required)
       values ($1,$2,$3,$4) on conflict do nothing`,
      [link.questId, link.trackId, link.order ?? 1, link.required !== false]
    );
  }

  for (const link of world.questSkills ?? []) {
    await client.query(
      `insert into public.quest_skills (quest_id, skill_id, level_delta)
       values ($1,$2,$3) on conflict do nothing`,
      [link.questId, link.skillId, link.levelDelta ?? 1]
    );
  }

  for (const link of questCatalog.dependencies ?? []) {
    await client.query(
      `insert into public.quest_prerequisites (quest_id, prerequisite_quest_id)
       values ($1,$2) on conflict do nothing`,
      [link.questId, link.prerequisiteId]
    );
  }
}
