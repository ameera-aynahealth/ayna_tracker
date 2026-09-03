-- Keep Best Version Updates focused on beta site/app work.
-- Generated tasks that belong to partnerships, meetings, marketing, Substack,
-- or tracker-internal development stay in the tracker but are detached from
-- the Best Version Updates project.

UPDATE tasks
SET
  project_id = NULL,
  updated_at = NOW()
WHERE project_id = 's44jFHXzCxjRbF0E7vxbo'
  AND id IN (
    'bvu-20260902-001',
    'bvu-20260902-002',
    'bvu-20260902-053',
    'bvu-20260902-054',
    'bvu-20260902-055',
    'bvu-20260902-059',
    'bvu-20260902-065',
    'bvu-20260902-066',
    'bvu-20260902-067',
    'bvu-20260902-068',
    'bvu-20260902-069',
    'bvu-20260902-070',
    'bvu-20260902-071',
    'bvu-20260902-072',
    'bvu-20260902-073',
    'bvu-20260902-074',
    'bvu-20260902-075',
    'bvu-20260902-076',
    'bvu-20260902-077',
    'bvu-20260902-078',
    'bvu-20260902-079',
    'bvu-20260902-080',
    'bvu-20260902-081',
    'bvu-20260902-082',
    'bvu-20260902-083',
    'bvu-20260902-084',
    'bvu-20260902-085',
    'bvu-20260902-086',
    'bvu-20260902-087',
    'bvu-20260902-088',
    'bvu-20260902-089',
    'bvu-20260902-091',
    'bvu-20260902-092',
    'bvu-20260902-094',
    'bvu-20260902-095',
    'bvu-20260902-096',
    'bvu-20260902-097',
    'bvu-20260902-098',
    'bvu-20260902-100'
  );

-- Current active beta work belongs to Ameera by default.
WITH owner_context AS (
  SELECT u.id AS ameera_id
  FROM users u
  JOIN projects p ON p.workspace_id = u.workspace_id
  WHERE p.id = 's44jFHXzCxjRbF0E7vxbo'
    AND LOWER(u.email) = 'ameera@aynahealth.co'
  LIMIT 1
)
UPDATE tasks t
SET
  owner_id = COALESCE(owner_context.ameera_id, t.owner_id),
  updated_at = NOW()
FROM owner_context
WHERE t.project_id = 's44jFHXzCxjRbF0E7vxbo'
  AND t.id LIKE 'bvu-20260902-%'
  AND t.status <> 'completed';

-- App/product implementation work belongs to Eliz. QA, research, content,
-- analytics validation, and beta-program management remain with Ameera.
WITH owner_context AS (
  SELECT u.id AS eliz_id
  FROM users u
  JOIN projects p ON p.workspace_id = u.workspace_id
  WHERE p.id = 's44jFHXzCxjRbF0E7vxbo'
    AND LOWER(u.email) = 'eliz@aynahealth.co'
  LIMIT 1
)
UPDATE tasks t
SET
  owner_id = COALESCE(owner_context.eliz_id, t.owner_id),
  updated_at = NOW()
FROM owner_context
WHERE t.project_id = 's44jFHXzCxjRbF0E7vxbo'
  AND t.status <> 'completed'
  AND t.id IN (
    'bvu-20260902-003',
    'bvu-20260902-004',
    'bvu-20260902-005',
    'bvu-20260902-006',
    'bvu-20260902-007',
    'bvu-20260902-008',
    'bvu-20260902-009',
    'bvu-20260902-010',
    'bvu-20260902-011',
    'bvu-20260902-012',
    'bvu-20260902-013',
    'bvu-20260902-014',
    'bvu-20260902-015',
    'bvu-20260902-016',
    'bvu-20260902-017',
    'bvu-20260902-023',
    'bvu-20260902-025',
    'bvu-20260902-029',
    'bvu-20260902-030',
    'bvu-20260902-031',
    'bvu-20260902-032',
    'bvu-20260902-034',
    'bvu-20260902-035',
    'bvu-20260902-036',
    'bvu-20260902-037',
    'bvu-20260902-038',
    'bvu-20260902-039',
    'bvu-20260902-045',
    'bvu-20260902-047',
    'bvu-20260902-049',
    'bvu-20260902-050',
    'bvu-20260902-057',
    'bvu-20260902-064'
  );

-- Conference work is not a beta-site milestone.
DELETE FROM milestones
WHERE id = 'bvu-ms-20260911'
  AND project_id = 's44jFHXzCxjRbF0E7vxbo';

UPDATE milestones
SET
  title = 'Beta polish backlog complete',
  description = 'Finish remaining accessibility, metadata, product experience, and lower-priority beta polish work.'
WHERE id = 'bvu-ms-20260930'
  AND project_id = 's44jFHXzCxjRbF0E7vxbo';
