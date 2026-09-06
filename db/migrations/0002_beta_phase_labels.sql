-- Ayna has already launched. Current product work is Beta Fixes, not MVP work.

UPDATE tasks
SET
  title = 'Import the full Best Version Updates beta master list into the tracker',
  description = 'Load the deduplicated beta, user-feedback, tracker, and meeting action items into this project with owners, priorities, and due dates.',
  updated_at = NOW()
WHERE id = 'bvu-20260902-002';

UPDATE tasks
SET
  title = 'Run full no-console-error beta smoke test',
  description = 'Test signup, onboarding, Browse, personalized results, Ecosystem, product modal, Buy Now, feedback, contact, logout/login, and mobile with no unexpected console/server errors.',
  updated_at = NOW()
WHERE id = 'bvu-20260902-021';

UPDATE tasks
SET
  title = 'Set up PostHog for beta usage analytics',
  description = 'Completed Aug 10 beta action item: configure PostHog so the team can see how the launched beta is being used.',
  updated_at = NOW()
WHERE id = 'bvu-20260902-093';

UPDATE tasks
SET
  title = 'Email beta users with testing questions and feedback form',
  description = 'Completed Aug 10 beta action item: send beta testers instructions, test questions, and a feedback form.',
  updated_at = NOW()
WHERE id = 'bvu-20260902-094';

UPDATE milestones
SET
  title = 'Beta feedback fixes ready for re-test',
  description = 'Ship and verify the highest-priority beta tester feedback before the next outreach round.'
WHERE id = 'bvu-ms-20260910';
