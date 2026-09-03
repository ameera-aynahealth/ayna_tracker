-- Exact Best Version Updates beta list supplied by Ameera on Sept. 2-3, 2026.
-- Replaces every task and milestone created by the previous Best Version import.
-- Preserves any task that existed in this project before that import.

BEGIN;

DELETE FROM tasks
WHERE id LIKE 'bvu-20260902-%'
   OR id LIKE 'bvu-beta-20260903-%';

DELETE FROM milestones
WHERE id LIKE 'bvu-ms-%';

WITH context AS (
  SELECT p.id AS project_id, p.workspace_id, u.id AS ameera_id
  FROM projects p
  JOIN users u
    ON u.workspace_id = p.workspace_id
   AND LOWER(u.email) = 'ameera@aynahealth.co'
  WHERE p.id = 's44jFHXzCxjRbF0E7vxbo'
  LIMIT 1
),
seed(seq, title, description, source_status) AS (
  VALUES
    (1, 'Email confirmation flow', 'token-hash email confirmation works correctly.', 'DONE'),
    (2, 'Google login', 'Google OAuth works and preserves the correct login origin/redirect.', 'DONE'),
    (3, 'Auth modal fixes', 'signup/login modal behavior was cleaned up.', 'DONE'),
    (4, 'Production deployment', 'latest product/catalog safety work is live on www.aynahealth.co.', 'DONE'),
    (5, 'Mobile/desktop navigation breakpoint', 'fixed the header dead zone around tablet widths.', 'DONE'),
    (6, 'Custom 404 page', 'Beta task from the Sept. 2-3 master QA list.', 'DONE'),
    (7, 'Contact page/form', 'functional contact page is live.', 'DONE'),
    (8, 'Contact form Website field', 'make Website optional/conditional where appropriate.', 'OPEN'),
    (9, 'Unique route/page titles', 'Beta task from the Sept. 2-3 master QA list.', 'DONE'),
    (10, 'FSA/HSA filtering', 'products now populate instead of returning nothing.', 'DONE'),
    (11, 'FSA/HSA', 'verify filtering and eligibility badges with real products before telling the tester it is fully closed.', 'RE-TEST'),
    (12, 'Product back control', 'product detail now has a way back.', 'DONE'),
    (13, 'Product Buy Now controls', 'Beta task from the Sept. 2-3 master QA list.', 'DONE'),
    (14, 'Wishlist control on product detail', 'Beta task from the Sept. 2-3 master QA list.', 'DONE'),
    (15, 'Add to Ecosystem control on product detail', 'Beta task from the Sept. 2-3 master QA list.', 'DONE'),
    (16, 'Product routing', 'make sure Browse, Recommendations, Ecosystem, and search all open the correct product and return users to the correct place.', 'RE-TEST'),
    (17, 'PCOS/birth-control search relevance', 'logic was tightened so pregnancy/postpartum items should not incorrectly dominate those searches.', 'DONE'),
    (18, 'Shruti''s search issue', 'specifically test PCOS and birth-control searches again before closing her feedback.', 'RE-TEST'),
    (19, 'Missing product images in queries', 'image-resolution work was added.', 'DONE/ADDRESSED'),
    (20, 'Search-result images', 'run representative searches and confirm images actually display consistently.', 'RE-TEST'),
    (21, 'Product-photo zoom', 'users should be able to enlarge a product image.', 'OPEN'),
    (22, 'Product summaries rewritten more neutrally', 'reduced confusing/unsupported efficacy language.', 'DONE'),
    (23, 'Clinician-opinion guardrail', 'unsourced clinician-style copy is labeled as ayna synthesis of peer-reviewed literature and clinical guidance. Not a direct clinician quote.', 'DONE'),
    (24, 'Scientific-evidence guardrails', 'centralized evidence was added to product records.', 'DONE'),
    (25, 'Evidence scope labeling', 'product-specific evidence is distinguished from category/adjacent evidence.', 'DONE'),
    (26, 'Community-review guardrail', 'unsourced community ratings/reviews are no longer presented as factual consensus.', 'DONE'),
    (27, 'Recall wording guardrail', 'static claims such as "No recalls" were replaced with safer current-recall language.', 'DONE'),
    (28, 'Privacy wording cleanup', 'stale or unsupported privacy claims were neutralized.', 'DONE'),
    (29, 'Prescription-only product gate', 'Rx-only products are filtered out of the marketplace.', 'DONE'),
    (30, 'Product catalog safety audit', 'the current static catalog audit covered 181 products and reached 0 failures / 0 warnings.', 'DONE'),
    (31, 'Source-by-source evidence verification', 'the audit checks presence/safety, but we still need to verify every legacy scientific citation actually supports what it is attached to.', 'OPEN'),
    (32, 'Remove/fix any mismatched legacy scientific sources', 'we already found at least one legacy PMID that was unrelated to the vaginal-health claim it had been attached to.', 'OPEN'),
    (33, 'Audit synthetic "similar profiles" content', 'remove or clearly reframe any synthetic quotes that could look like real testimonials.', 'OPEN'),
    (34, 'Apply evidence/safety guardrails to database-discovered products too', 'current static ALL_PRODUCTS guardrails do not automatically prove every database product is safe/sourced.', 'OPEN'),
    (35, 'Product UI emoji cleanup', 'product-facing UI/data was cleaned so we are not using emoji-based warning/status symbols.', 'DONE'),
    (36, 'Personalized relevance scoring improvements', 'symptoms/profile inputs now influence product relevance more than before.', 'DONE'),
    (37, 'Relevant products showing 0% Match', 'fix cases where appropriate products can still display a zero match.', 'OPEN'),
    (38, 'Match-score calibration', 'stop lots of products from receiving nearly identical percentages.', 'OPEN'),
    (39, 'Age/goals-only personalization', 'make sure age/goals without frustration/history data still use real Health Match logic instead of falling back to generic marketing scores.', 'OPEN'),
    (40, 'Personalized ranking audit', 'verify recommendedRank or other static ranking fields are not overriding true individualized relevance.', 'OPEN'),
    (41, 'Keep affiliate status out of Health Match', 'personalized recommendations must have zero knowledge of who pays ayna.', 'REQUIRED'),
    (42, 'Final health intake redesign', 'replace the older six-screen intake with the final branching intake we designed.', 'OPEN'),
    (43, 'Health intake Section 1: Core Profile', 'age range, life stage, optional ZIP.', 'OPEN'),
    (44, 'Health intake Section 2: Goals', 'main goal, top 1-3 priorities, broader health areas.', 'OPEN'),
    (45, 'Health intake Section 3: Symptoms', 'relevant symptoms, top symptoms, severity, frequency, timing, flow/pain where relevant.', 'OPEN'),
    (46, 'Health intake Section 4: Health + Safety', 'diagnoses, allergies/sensitivities, pregnancy/TTC/postpartum/breastfeeding, medications, hormonal treatments, supplements, previous reactions, new/worsening symptoms.', 'OPEN'),
    (47, 'Health intake safety gate', 'concerning responses should trigger appropriate-care guidance before product recommendations.', 'OPEN'),
    (48, 'Health intake Section 5: Tried Before', 'what users tried, what failed, and why.', 'OPEN'),
    (49, 'Health intake Section 6: Shopping Preferences', 'format, budget, values, ingredient/material preferences.', 'OPEN'),
    (50, 'Keep Shopping Preferences separate from Health Match', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (51, 'Health intake Section 7: Results', 'clearly explain personalized results without presenting the Match % as medically validated.', 'OPEN'),
    (52, 'Branch the intake', 'only show cycle, UTI, menopause, pelvic-floor, pregnancy, digestive, etc. questions when relevant.', 'OPEN'),
    (53, 'Dedicated perimenopause section', 'do not bury perimenopause entirely under menopause.', 'OPEN'),
    (54, 'Expand 50+ / healthy-aging representation', 'beta feedback specifically points toward strength, energy, sleep, hormonal changes, and overall-health needs being better represented.', 'OPEN'),
    (55, 'Ecosystem/history clearing bug', 'users must not lose Ecosystem, health history, or intake data while navigating.', 'OPEN'),
    (56, 'Health-profile persistence', 'saved profile data should survive navigation, refresh, and login/logout.', 'OPEN'),
    (57, 'user_health_profiles 404', 'remove or repair the failing legacy request.', 'OPEN'),
    (58, 'phone_numbers 403', 'fix the permission/request issue without weakening security.', 'OPEN'),
    (59, 'Remove retired/deprecated database-table calls', 'production should not continue requesting resources that no longer exist.', 'OPEN'),
    (60, 'Wishlist persistence', 'saved products should remain saved across refresh/navigation/sessions.', 'OPEN'),
    (61, 'Monthly check-in persistence', 'responses should not disappear.', 'OPEN'),
    (62, 'Finish health-profile editor', 'users need to understand and edit what ayna knows about them.', 'OPEN'),
    (63, 'Ask Ayna/product chat unification', 'the same assistant behavior should work from product pages, profile, and other surfaces.', 'OPEN'),
    (64, 'Ask Ayna backend quota issue', 'the earlier backend/quota failure was addressed.', 'DONE'),
    (65, 'In-chat medical disclaimer', 'health/device answers need clear educational-not-medical-advice language.', 'OPEN'),
    (66, 'No-diagnosis guardrail', 'Ayna should not diagnose users.', 'OPEN'),
    (67, 'Urgent/concerning-symptom handling', 'direct users appropriately when symptoms may warrant professional/urgent care.', 'OPEN'),
    (68, 'Manufacturer instructions behavior', 'after general safety/use information, Ayna should say something like: "If there''s a specific cup you had in mind, I can send you a link to the brand''s official instructions on how to use it."', 'OPEN'),
    (69, 'Official instructions only', 'for product-specific insertion, use, wear time, cleaning, removal, etc., link to the manufacturer''s official instructions rather than inventing directions.', 'OPEN'),
    (70, 'Do not auto-add chat suggestions to Ecosystem', 'user should explicitly choose to add them.', 'OPEN'),
    (71, 'Chat profile-change transparency', 'show what Ayna changed when conversation updates profile information.', 'OPEN'),
    (72, 'Add Undo after chat/profile changes', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (73, 'Add View Recommendations after relevant profile changes', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (74, 'Chat markdown/formatting', 'render lists, paragraphs, headings, links, and citations cleanly.', 'OPEN'),
    (75, 'Search latency', 'reduce searches taking roughly 15-25 seconds.', 'OPEN'),
    (76, 'Search loading state', 'immediately show that a search is processing.', 'OPEN'),
    (77, '/api/search-suggestions intermittent 503', 'fix stability.', 'OPEN'),
    (78, 'Neycher/name matching', 'make sure searches for exact brand names/products reliably find them.', 'OPEN'),
    (79, 'Earlier search/product filtering deployment', 'the Aug. 10 filtering update was pushed for testing.', 'DONE'),
    (80, 'Browse search + Clear Search', 'verify both the search and full reset behavior.', 'OPEN'),
    (81, 'Filter-combination QA', 'category, concern, price, FSA/HSA, etc. should work together and reset correctly.', 'OPEN'),
    (82, 'Category scrolling/reset', 'navigation should not leave users at confusing inherited scroll positions.', 'OPEN'),
    (83, 'Product discovery rotation', 'Browse should not keep showing exactly the same products every time.', 'OPEN'),
    (84, 'Rotation must still respect eligibility and personalization', 'rotation cannot bypass product safety/vetting or individualized relevance.', 'OPEN'),
    (85, 'Cheapest-retailer comparison', 'this is still not built.', 'OPEN'),
    (86, 'Do not claim "cheapest" unless prices are currently verified', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (87, 'Product price/quantity audit', 'displayed prices and pack sizes need verification.', 'OPEN'),
    (88, 'Fix LOLA price/pack-count mismatch', 'this was specifically flagged by beta feedback.', 'OPEN'),
    (89, 'Verify every Buy Now URL', 'no broken or wrong retailer destinations.', 'OPEN'),
    (90, 'Affiliate/purchase URL completeness', 'fill approved affiliate URLs where they exist while keeping them completely separate from Health Match.', 'OPEN'),
    (91, 'Affiliate disclosure', 'product cards need clear commission/affiliate disclosure when applicable.', 'OPEN'),
    (92, '"How We Make Money" transparency QA', 'make sure it plainly explains affiliate revenue and that recommendations remain unbiased.', 'OPEN'),
    (93, 'Evidence-tab wishlist overlap', 'fix the overlapping UI.', 'OPEN'),
    (94, 'Fix Happi image', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (95, 'Add/verify missing Nature, Winx, and LOLA logos', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (96, 'Missing Amazon review data', 'never invent a count/rating; show neutral unavailable state unless sourced.', 'OPEN'),
    (97, 'Product evidence modal QA', 'spot-check summary, clinician synthesis, literature, community, safety, recall, pricing, and links across representative products.', 'OPEN'),
    (98, 'Doctor Prep blank state/page', 'it should never render as an unexplained empty screen.', 'OPEN'),
    (99, 'Empty Ecosystem recommendations', 'give users a useful starting point instead of a dead end.', 'OPEN'),
    (100, 'Contextual Swap feature', 'Ecosystem Swap should suggest appropriate alternatives.', 'OPEN'),
    (101, 'Escape-to-close', 'closable overlays/modals should consistently support keyboard Escape.', 'OPEN'),
    (102, 'Signup popup recurrence', 'verify Amrutha''s issue where the Browse signup prompt repeatedly appeared and was hard to close.', 'OPEN'),
    (103, 'Amrutha', 'once recurrence is confirmed fixed, follow up with her.', 'RE-TEST'),
    (104, 'Subhra', 'product zoom, persistence/history, pricing/quantity, retailer comparison, images, and product-page usability need checking before closing her feedback.', 'RE-TEST'),
    (105, 'Marlene', 'do not close until the dedicated perimenopause experience exists.', 'RE-TEST'),
    (106, 'Alt-text audit', 'finish image accessibility gaps.', 'OPEN'),
    (107, 'Metadata/SEO pass', 'titles, descriptions, canonical metadata, social previews, and public indexing.', 'OPEN'),
    (108, 'Favicon/app-icon verification', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (109, 'Full mobile/tablet QA', 'particularly around previously problematic 769-900px widths.', 'OPEN'),
    (110, 'Accessibility QA for older users', 'simplify areas that create unnecessary onboarding/language friction.', 'OPEN'),
    (111, 'Translation support', 'scope it carefully before shipping.', 'LATER BETA'),
    (112, 'Foggy/pearly mirror/glass-shelf UI', 'design exploration is lower priority than stability and usability.', 'LATER BETA'),
    (113, 'Full auth regression QA', 'email signup, confirmation, Google login, redirects, logout, login, and session persistence.', 'OPEN'),
    (114, 'Full beta smoke test', 'signup -> onboarding -> health profile -> Browse -> search -> personalized recommendations -> product detail -> evidence -> Buy Now -> Wishlist -> Ecosystem -> Ask Ayna -> feedback/contact -> logout/login -> mobile.', 'OPEN'),
    (115, 'No unexpected production console/server errors during that smoke test', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (116, 'PostHog was set up for beta usage analytics', 'Beta task from the Sept. 2-3 master QA list.', 'DONE'),
    (117, 'Production-domain analytics connection/internal traffic work was addressed', 'Beta task from the Sept. 2-3 master QA list.', 'DONE'),
    (118, 'Validate DAU/WAU and beta counts against known tester activity before using them externally', 'Beta task from the Sept. 2-3 master QA list.', 'OPEN'),
    (119, 'Track beta funnel', 'accounts created, onboarding completion, active testers, feedback submissions, and major drop-off points.', 'OPEN'),
    (120, 'Consolidate weekly beta feedback', 'deduplicate feedback, prioritize it, attach it to the correct product task, and record when a tester can be contacted again.', 'OPEN'),
    (121, 'Re-contact fixed-feedback testers', 'FSA/HSA tester first; Amrutha after popup re-test; Shruti after relevance spot-check; Subhra only after remaining issues; Marlene after perimenopause.', 'OPEN'),
    (122, 'Beta access/waitlist decision', 'once the agreed early-user threshold is passed, remove/revise the beta waitlist gate.', 'OPEN'),
    (123, 'Continue customer-discovery/beta interviews', 'use them specifically to surface onboarding, search, personalization, product-data, and trust issues rather than treating them as general marketing research.', 'OPEN')
),
prepared AS (
  SELECT
    seed.*,
    CASE
      WHEN seed.source_status IN ('DONE', 'DONE/ADDRESSED') THEN 'completed'
      WHEN seed.source_status = 'RE-TEST' THEN 'needs_review'
      WHEN seed.source_status = 'LATER BETA' THEN 'backlog'
      ELSE 'not_started'
    END AS tracker_status,
    CASE
      WHEN seed.source_status = 'REQUIRED' OR seed.seq IN (37, 38, 41, 42, 47, 55, 56, 57, 58, 59, 63, 65, 66, 67, 68, 69, 75, 77, 87, 88, 102, 113, 114, 115) THEN 'urgent'
      WHEN seed.source_status = 'RE-TEST' OR seed.seq IN (11, 16, 18, 20, 21, 31, 32, 33, 34, 39, 40, 43, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 60, 61, 62, 70, 71, 72, 73, 74, 76, 78, 80, 81, 83, 84, 85, 86, 89, 90, 91, 92, 93, 97, 98, 99, 100, 101, 103, 104, 105, 109, 110, 118, 119, 120, 121, 123) THEN 'high'
      WHEN seed.source_status = 'LATER BETA' OR seed.seq IN (108, 111, 112, 122) THEN 'low'
      ELSE 'medium'
    END AS tracker_priority,
    CASE
      WHEN seed.seq IN (79, 116) THEN DATE '2026-08-10'
      WHEN seed.seq IN (117) THEN DATE '2026-08-28'
      WHEN seed.seq IN (11, 37, 41, 55, 56, 57, 58, 59, 65, 66, 67, 77) THEN DATE '2026-09-04'
      WHEN seed.seq IN (16, 18, 20, 38, 63, 68, 69, 75, 76, 88, 102) THEN DATE '2026-09-05'
      WHEN seed.seq IN (70, 78, 103) THEN DATE '2026-09-06'
      WHEN seed.seq IN (39, 40, 60, 61, 71, 72, 73, 80, 87) THEN DATE '2026-09-07'
      WHEN seed.seq IN (21, 43, 47, 74, 81, 89, 93, 113) THEN DATE '2026-09-08'
      WHEN seed.seq IN (44, 62, 98) THEN DATE '2026-09-09'
      WHEN seed.seq IN (8, 42, 45, 53, 83, 84, 85, 86, 91, 114, 115) THEN DATE '2026-09-10'
      WHEN seed.seq IN (46, 82, 94, 95, 99, 105, 120) THEN DATE '2026-09-11'
      WHEN seed.seq IN (32, 33, 48, 90, 92, 97, 100, 101, 104, 109) THEN DATE '2026-09-12'
      WHEN seed.seq IN (49, 50) THEN DATE '2026-09-13'
      WHEN seed.seq IN (34, 51, 96, 118) THEN DATE '2026-09-14'
      WHEN seed.seq IN (52, 119) THEN DATE '2026-09-15'
      WHEN seed.seq IN (31, 106) THEN DATE '2026-09-16'
      WHEN seed.seq IN (54, 107) THEN DATE '2026-09-17'
      WHEN seed.seq IN (108, 110, 121, 123) THEN DATE '2026-09-18'
      WHEN seed.seq IN (111) THEN DATE '2026-09-25'
      WHEN seed.seq IN (112, 122) THEN DATE '2026-09-30'
      ELSE DATE '2026-09-02'
    END AS tracker_due_date
  FROM seed
)
INSERT INTO tasks (
  id, workspace_id, project_id, title, description, status, priority, task_type,
  owner_id, created_by_id, due_at, original_due_at, due_timezone,
  completed_at, completed_by_id, last_activity_at, created_at, updated_at
)
SELECT
  'bvu-beta-20260903-' || LPAD(prepared.seq::text, 3, '0'),
  context.workspace_id,
  context.project_id,
  prepared.title,
  prepared.description,
  prepared.tracker_status::task_status,
  prepared.tracker_priority::task_priority,
  'task'::task_type,
  context.ameera_id,
  context.ameera_id,
  (prepared.tracker_due_date + TIME '17:00') AT TIME ZONE 'America/New_York',
  (prepared.tracker_due_date + TIME '17:00') AT TIME ZONE 'America/New_York',
  'America/New_York',
  CASE WHEN prepared.tracker_status = 'completed'
    THEN (prepared.tracker_due_date + TIME '17:00') AT TIME ZONE 'America/New_York'
    ELSE NULL END,
  CASE WHEN prepared.tracker_status = 'completed' THEN context.ameera_id ELSE NULL END,
  NOW(), NOW(), NOW()
FROM prepared
CROSS JOIN context;

UPDATE projects
SET status = 'active',
    health = 'needs_attention',
    priority = 'urgent',
    due_date = TIMESTAMPTZ '2026-09-30 17:00:00-04',
    updated_at = NOW()
WHERE id = 's44jFHXzCxjRbF0E7vxbo';

COMMIT;
