-- Best Version Updates master task import
-- Generated 2026-09-02. Idempotent by project + case-insensitive title.
-- Project: https://aynatracker.vercel.app/projects/s44jFHXzCxjRbF0E7vxbo

UPDATE projects
SET
  status = 'active',
  health = 'needs_attention',
  priority = 'urgent',
  due_date = TIMESTAMPTZ '2026-09-30 17:00:00-04',
  updated_at = NOW()
WHERE id = 's44jFHXzCxjRbF0E7vxbo';

WITH context AS (
  SELECT
    p.id AS project_id,
    p.workspace_id,
    COALESCE(
      (
        SELECT u.id
        FROM users u
        WHERE u.workspace_id = p.workspace_id
          AND LOWER(u.email) = 'ameera@aynahealth.co'
        LIMIT 1
      ),
      p.owner_id,
      (
        SELECT u.id
        FROM users u
        WHERE u.workspace_id = p.workspace_id
        ORDER BY CASE WHEN u.role = 'admin' THEN 0 ELSE 1 END, u.created_at
        LIMIT 1
      )
    ) AS creator_id
  FROM projects p
  WHERE p.id = 's44jFHXzCxjRbF0E7vxbo'
),
seed(seq, title, owner_email, status, priority, due_date, task_type, description) AS (
  VALUES
  (1, 'Fix tracker project-task table overflow and broken bottom header', 'ameera@aynahealth.co', 'in_progress', 'urgent', '2026-09-03', 'bug', 'Replace the clipped/sticky project table header with a stable responsive list; keep Task, Priority, Status, Owner, and Due visible.'),
  (2, 'Import the full Best Version Updates master list into the tracker', 'ameera@aynahealth.co', 'in_progress', 'urgent', '2026-09-03', 'administrative', 'Load the deduplicated MVP, beta, user-feedback, tracker, and meeting action items into this project with owners, priorities, and due dates.'),
  (3, 'Fix user_health_profiles 404 errors', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-04', 'bug', 'Remove or repair failing user_health_profiles requests so profile data loads and saves without 404s.'),
  (4, 'Fix phone_numbers 403 errors', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-04', 'bug', 'Resolve permission/auth failures on phone_numbers requests without weakening access controls.'),
  (5, 'Fix intermittent /api/search-suggestions 503 errors', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-04', 'bug', 'Identify and remove intermittent 503 failures in search suggestions; preserve graceful fallback behavior.'),
  (6, 'Remove calls to retired or deprecated database tables', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-04', 'bug', 'Audit production requests for retired-table calls and remove stale code paths that create backend errors.'),
  (7, 'Stop ecosystem and health-profile data from resetting between pages', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-04', 'bug', 'Persist ecosystem/history/intake state across navigation so users do not have to redo intake or lose saved history.'),
  (8, 'Unify Ask Ayna and product chat behavior', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-05', 'bug', 'Use one consistent assistant experience for real health/product questions across profile, search, and product pages.'),
  (9, 'Add chat safety disclaimer, no-diagnosis guardrail, and urgent-care handling', 'ameera@aynahealth.co', 'not_started', 'urgent', '2026-09-04', 'task', 'Show clear education-not-medical-advice language and route concerning symptoms toward appropriate medical care.'),
  (10, 'Offer official brand instructions when a user names a specific product', 'ameera@aynahealth.co', 'not_started', 'urgent', '2026-09-04', 'task', 'After generic safety guidance, Ayna should say that if the user has a specific cup/product in mind it can provide a link to the brand''s official instructions. Use only the manufacturer''s official guide.'),
  (11, 'Do not auto-add chat recommendations to the Ecosystem', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-05', 'bug', 'Recommendations suggested in chat must require an explicit user action before they are added to the Ecosystem.'),
  (12, 'Add View Recommendations and Undo after chat/profile changes', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-06', 'task', 'When chat changes profile inputs, show exactly what changed and provide View Recommendations and Undo controls.'),
  (13, 'Fix chat markdown and response formatting', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-06', 'bug', 'Render headings, lists, links, citations, and paragraphs cleanly without raw markdown artifacts.'),
  (14, 'Reduce search latency and add a clear loading state', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-05', 'bug', 'Bring 15-25 second search waits down materially and show immediate loading feedback while results are being assembled.'),
  (15, 'Calibrate personalized match-score variation', 'aditi@aynahealth.co', 'not_started', 'urgent', '2026-09-06', 'task', 'Prevent overly similar match percentages; ensure age, goals, symptoms, diagnoses, life stage, severity, frequency, timing, medications, tried-before, and health attributes affect ranking as intended.'),
  (16, 'Build the final 7-section health intake', 'ameera@aynahealth.co', 'not_started', 'urgent', '2026-09-08', 'deliverable', 'Implement the final intake structure: core profile, goals, symptoms, health/safety, tried-before, shopping preferences, and results. Keep Health Match separate from Shopping Preferences.'),
  (17, 'Add a separate perimenopause category and offerings', 'ameera@aynahealth.co', 'not_started', 'urgent', '2026-09-05', 'task', 'Do not group perimenopause only under menopause; add its own browse/recommendation path and relevant product/service mapping.'),
  (18, 'Spot-check PCOS and birth-control search relevance', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-06', 'bug', 'Verify pregnancy/postpartum products do not incorrectly surface for PCOS or birth-control searches unless context makes them relevant.'),
  (19, 'Re-test signup popup recurrence and close behavior', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-06', 'bug', 'Confirm the Browse signup popup can always be closed and does not repeatedly reappear after dismissal.'),
  (20, 'Run full auth signup, confirmation, logout, and login QA', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-06', 'task', 'Test email signup/confirmation, Google login, logout/login, redirects, and preserved origin flows end-to-end.'),
  (21, 'Run full no-console-error MVP smoke test', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-09', 'task', 'Test signup, onboarding, Browse, personalized results, Ecosystem, product modal, Buy Now, feedback, contact, logout/login, and mobile with no unexpected console/server errors.'),
  (22, 'Verify product images appear in search/query results', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-06', 'bug', 'Re-test the prior missing-image issue across representative searches and fix any remaining resolver gaps.'),
  (23, 'Add product-photo zoom on product detail', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-07', 'task', 'Allow users to enlarge product imagery without losing their place in the product modal/page.'),
  (24, 'Audit product price and quantity accuracy, starting with LOLA', 'ameera@aynahealth.co', 'not_started', 'urgent', '2026-09-07', 'research', 'Verify displayed price, pack count, quantity, and retailer details against current official/retailer pages; fix the LOLA mismatch first.'),
  (25, 'Add cheapest-retailer comparison or clearly label available purchase options', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-09', 'task', 'Help users compare retailer purchase options without claiming a retailer is cheapest unless the current prices are actually verified.'),
  (26, 'Verify every Buy Now URL and new-tab behavior', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-07', 'task', 'Spot-check catalog purchase links, official brand/affiliate routing, and opening behavior; remove broken or misleading destinations.'),
  (27, 'Re-test FSA/HSA filters and badges', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-07', 'task', 'Confirm FSA/HSA eligibility filters populate real products and badges are only shown when supported by source data.'),
  (28, 'Verify product routing from Browse, Recommendations, and Ecosystem', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-07', 'task', 'Make sure every product card opens the correct product detail and back navigation returns users to the expected context.'),
  (29, 'Verify wishlist/saved-item persistence', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-08', 'bug', 'Saved products must persist across refresh, navigation, and login sessions.'),
  (30, 'Fix monthly check-in persistence', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-08', 'bug', 'Ensure monthly check-in answers and updates persist and do not disappear after navigation or refresh.'),
  (31, 'Fix blank Doctor Prep state/page', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-08', 'bug', 'Doctor Prep should never render blank; add usable content or an intentional empty state.'),
  (32, 'Fix Browse search and Clear Search behavior', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-08', 'bug', 'Search should return relevant results and Clear Search should fully reset the query and result state.'),
  (33, 'QA filter behavior including price filtering', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-09', 'task', 'Verify category, concern, price, FSA/HSA, and other filters can be combined and cleared without stale results.'),
  (34, 'Fix category scrolling and reset scroll position after navigation', 'aditi@aynahealth.co', 'not_started', 'medium', '2026-09-11', 'bug', 'Category navigation should scroll predictably and new pages/modals should not inherit confusing old scroll positions.'),
  (35, 'Support Escape-to-close for overlays and modals', 'aditi@aynahealth.co', 'not_started', 'medium', '2026-09-11', 'task', 'Add consistent keyboard Escape behavior to closable dialogs without breaking form state.'),
  (36, 'Add contextual Swap actions in the Ecosystem', 'aditi@aynahealth.co', 'not_started', 'medium', '2026-09-12', 'task', 'Swap should suggest appropriate alternatives based on the user''s current item and profile context.'),
  (37, 'Add recommendations for an empty Ecosystem', 'aditi@aynahealth.co', 'not_started', 'medium', '2026-09-12', 'task', 'If the Ecosystem is empty, provide a useful starting set or prompt rather than a dead end.'),
  (38, 'Finish health-profile controls/editor', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-10', 'task', 'Make profile fields easy to review/edit and ensure changes visibly affect recommendations only after the user confirms them.'),
  (39, 'Fix Evidence-tab wishlist overlap', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-09', 'bug', 'Resolve overlapping controls/content in the Evidence tab at supported desktop and mobile widths.'),
  (40, 'Fix Happi product image', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-10', 'bug', 'Replace or repair the broken/wrong Happi image using an official or approved source.'),
  (41, 'Add missing Nature, Winx, and LOLA brand logos', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-10', 'task', 'Add accurate brand assets and verify they render consistently across product cards and detail views.'),
  (42, 'Handle missing Amazon review data safely', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-14', 'research', 'Do not invent or imply review counts. Add verified review data only when sourced; otherwise show a neutral unavailable state.'),
  (43, 'Close remaining image alt-text gaps', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-14', 'task', 'Add concise descriptive alt text to meaningful product/interface images and empty alt text to decorative images.'),
  (44, 'Finish metadata and SEO pass', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-15', 'task', 'Verify page titles, descriptions, canonical metadata, social previews, and index/noindex behavior for public pages.'),
  (45, 'Add/verify favicon and app icons', 'ameera@aynahealth.co', 'not_started', 'low', '2026-09-18', 'task', 'Use the current ayna brand mark consistently in browser/app icon contexts.'),
  (46, 'Run mobile and tablet navigation QA including 769-900px', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-10', 'task', 'Re-test the previously fixed nav dead zone and complete responsive QA across key routes.'),
  (47, 'Finish safety UX distinction between education and medical advice', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-09', 'task', 'Make the difference between educational product information and medical advice clear in product, chat, and recommendation surfaces.'),
  (48, 'QA product summaries, evidence, clinician synthesis, community sections, and recalls', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-10', 'task', 'Spot-check product modals for neutral summaries, sourced evidence, correct synthesis labels, no invented community claims, and current recall language.'),
  (49, 'Refresh/rotate product discovery results instead of repeating the same items', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-10', 'task', 'Introduce controlled product rotation on refresh while preserving eligibility, personalization, vetting, and partner-ranking rules.'),
  (50, 'Add clear affiliate/commission disclosures on product cards', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-10', 'task', 'Clearly disclose affiliate relationships without allowing affiliate status to influence personalized Health Match.'),
  (51, 'QA the How We Make Money page and link it from relevant disclosures', 'puloma@aynahealth.co', 'not_started', 'medium', '2026-09-11', 'task', 'Confirm the page explains affiliate revenue plainly and is easy to reach from marketplace disclosures.'),
  (52, 'QA company/landing-page messaging against current beta positioning', 'puloma@aynahealth.co', 'not_started', 'medium', '2026-09-15', 'task', 'Keep the company page aligned with the current personalized women''s-health marketplace positioning and unbiased recommendation language.'),
  (53, 'Follow up with Kamari for customer discovery', 'eliz@aynahealth.co', 'not_started', 'high', '2026-09-05', 'follow_up', 'Proceed with the customer discovery follow-up captured in the Aug 10 MVP Check-In.'),
  (54, 'Complete customer discovery follow-ups with Amelia, Kamari, and Kendall', 'eliz@aynahealth.co', 'not_started', 'high', '2026-09-08', 'follow_up', 'Collect concrete onboarding, search, recommendation, and trust feedback and add resulting bugs/tasks to the tracker.'),
  (55, 'Maintain Monday 5 PM technical check-ins', 'puloma@aynahealth.co', 'not_started', 'medium', '2026-09-07', 'meeting_action_item', 'Keep the recurring 30-minute Monday technical alignment meeting and use the tracker as the source of truth for weekly goals.'),
  (56, 'Track beta tester funnel and weekly feedback completion', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-07', 'research', 'Track accounts, active testers, onboarding completion, feedback submissions, and the highest-friction steps without relying on inflated vanity metrics.'),
  (57, 'Remove the beta waitlist gate after more than 50 early users', 'ameera@aynahealth.co', 'waiting', 'medium', '2026-09-30', 'milestone', 'Keep the waitlist until the agreed early-user threshold is surpassed, then remove or revise the gate.'),
  (58, 'Consolidate beta feedback into a weekly prioritized bug list', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-07', 'administrative', 'Deduplicate tester comments, assign P0/P1/P2 priority, link screenshots to tracker tasks, and close the loop with testers when fixes are verified.'),
  (59, 'Set up creator beta-testing workflow for unpaid collaborations', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-12', 'task', 'Use clear unpaid-collaboration language, authentic creator testing, and a repeatable feedback intake process.'),
  (60, 'Verify PostHog production domain and internal-traffic exclusion', 'ameera@aynahealth.co', 'completed', 'medium', '2026-08-28', 'task', 'Confirm production traffic is attributed to the correct live domain and internal team traffic is excluded.'),
  (61, 'Validate DAU/WAU and key beta analytics against known usage', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-08', 'research', 'Compare PostHog counts with known tester activity and investigate discrepancies before using the numbers externally.'),
  (62, 'Plan accessibility improvements for older users', 'eliz@aynahealth.co', 'not_started', 'medium', '2026-09-16', 'research', 'Use beta feedback to reduce onboarding/language friction for older users and document the highest-impact changes.'),
  (63, 'Scope language translation support', 'eliz@aynahealth.co', 'backlog', 'low', '2026-09-25', 'research', 'Define a safe translation approach for key onboarding and marketplace surfaces; do not ship until quality can be maintained.'),
  (64, 'Prototype the foggy/pearly mirror and glass-shelf interface', 'aditi@aynahealth.co', 'backlog', 'low', '2026-09-25', 'deliverable', 'Explore the agreed white/foggy mirror aesthetic, outward-swinging animation, and glass shelves without blocking stability work.'),
  (65, 'Connect/finish Substack waitlist integration', 'aditi@aynahealth.co', 'not_started', 'medium', '2026-09-14', 'task', 'Confirm waitlist members can flow into the intended Substack process and document the connection status.'),
  (66, 'Check Substack project status with Eliz/Puloma', 'aditi@aynahealth.co', 'not_started', 'medium', '2026-09-08', 'follow_up', 'Close the loop on the outstanding Substack work captured in the Aug 10 MVP Check-In.'),
  (67, 'Add tracker revision/review workflow with email notifications', 'aditi@aynahealth.co', 'not_started', 'high', '2026-09-12', 'task', 'Add a clear revision/review state and send appropriate notifications without creating Slack clutter.'),
  (68, 'Allow bug screenshots to be attached directly to tracker tasks', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-12', 'task', 'Make the tracker the source of truth for bug screenshots and supporting attachments rather than Slack.'),
  (69, 'Enable copy/paste images into task fields', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-15', 'task', 'Support pasting an image directly into a task and saving it as a task attachment.'),
  (70, 'Add a dedicated file-upload section under task links', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-15', 'task', 'Add a clear Files section alongside links/attachments with upload progress and safe file handling.'),
  (71, 'Add a tracker back button that preserves context', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-13', 'task', 'Provide predictable back navigation from task/project details without losing filters or scroll position.'),
  (72, 'Support multiple task reviewers', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-18', 'task', 'Replace the single-reviewer limitation with multiple reviewers while keeping permissions and notifications clear.'),
  (73, 'Remove duplicate team entry from the tracker', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-11', 'administrative', 'Remove the redundant team record without deleting real user history or assignments.'),
  (74, 'Finish tracker theme consistency with the ayna website', 'ameera@aynahealth.co', 'in_progress', 'medium', '2026-09-16', 'task', 'Keep typography, spacing, colors, controls, and navigation aligned with the current ayna visual system.'),
  (75, 'Integrate Gmail due-date alerts', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-18', 'task', 'Send useful due-soon/overdue task alerts by email with deduplication and user notification preferences.'),
  (76, 'Add Slack notifications for tracker updates', 'ameera@aynahealth.co', 'backlog', 'low', '2026-09-25', 'task', 'Add optional Slack notifications after email/task flows are stable; avoid duplicating every tracker event.'),
  (77, 'Improve tracker calendar visibility', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-16', 'task', 'Make due dates, milestones, overdue work, and upcoming meetings easier to scan from Calendar.'),
  (78, 'Send Alubri contract link to Joe and Mariah', 'puloma@aynahealth.co', 'not_started', 'high', '2026-09-04', 'partnership', 'Confirm the correct contract link is shared with the intended Alubri signers and track signature status.'),
  (79, 'Follow up with LiM', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-04', 'follow_up', 'Complete the outstanding LiM follow-up from the Aug 27 meeting.'),
  (80, 'Complete Elitone and LOLA affiliate/sign-up setup', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-05', 'partnership', 'Finish required affiliate/sign-up steps and save the approved links/codes in the partnership records.'),
  (81, 'Send current screen recordings and marketplace assets to partner brands', 'puloma@aynahealth.co', 'not_started', 'high', '2026-09-05', 'deliverable', 'Send partners the requested product placement/screenshots/recordings using the current beta experience.'),
  (82, 'Create the Nia product waitlist and sign-up flow', 'eliz@aynahealth.co', 'not_started', 'medium', '2026-09-11', 'partnership', 'Set up the agreed lightweight Google Sheet/sign-up workflow for the Nia product and exclusive-code interest.'),
  (83, 'Reach out to the previously contacted partner using the updated partnership strategy', 'ameera@aynahealth.co', 'not_started', 'medium', '2026-09-08', 'partnership', 'Re-engage with the updated affiliate, content, discount-code, marketplace, and reporting structure.'),
  (84, 'Check Neycher product shipment status', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-04', 'follow_up', 'Confirm whether the partner products have shipped and record expected arrival dates.'),
  (85, 'Send Neycher/partner marketing assets', 'puloma@aynahealth.co', 'not_started', 'high', '2026-09-05', 'deliverable', 'Deliver current marketplace screenshots, content assets, and any requested partner materials.'),
  (86, 'Finalize affiliate links/codes for signed or near-signed partners', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-09', 'partnership', 'Close outstanding affiliate setup for signed/near-signed partners while keeping partner status separate from personalized ranking.'),
  (87, 'Request products for the Sep 12-13 AI-Powered Women conference booth', 'ameera@aynahealth.co', 'in_progress', 'urgent', '2026-09-04', 'partnership', 'Follow up with partner brands that agreed to send products and explain that ayna will display them at the Sep 12-13 conference booth.'),
  (88, 'Prepare conference booth product display and partner-labeling plan', 'ameera@aynahealth.co', 'not_started', 'high', '2026-09-10', 'deliverable', 'Plan how gifted/partner products will be displayed at the booth with accurate brand and affiliate disclosures.'),
  (89, 'Set up monthly partner performance reporting', 'puloma@aynahealth.co', 'not_started', 'medium', '2026-09-18', 'task', 'Standardize monthly reporting for traffic, clicks, conversions, and agreed social/content deliverables.'),
  (90, 'Deploy product search/filtering fix for user testing', 'aditi@aynahealth.co', 'completed', 'high', '2026-08-10', 'bug', 'Completed Aug 10 action item: push product filtering changes so the team could test search behavior.'),
  (91, 'Draft the How We Make Money page with Ameera', 'puloma@aynahealth.co', 'completed', 'medium', '2026-08-10', 'deliverable', 'Completed Aug 10 action item recorded for project history.'),
  (92, 'Provide Substack connection details', 'eliz@aynahealth.co', 'completed', 'medium', '2026-08-10', 'task', 'Completed Aug 10 action item: provide the requested Substack account/API connection information.'),
  (93, 'Set up PostHog for MVP usage analytics', 'aditi@aynahealth.co', 'completed', 'high', '2026-08-10', 'task', 'Completed Aug 10 action item: configure PostHog so the team can see how the MVP is being used.'),
  (94, 'Email MVP users with testing questions and feedback form', 'aditi@aynahealth.co', 'completed', 'high', '2026-08-10', 'task', 'Completed Aug 10 action item: send MVP testers instructions/questions and a feedback form.'),
  (95, 'Schedule recurring Monday 5 PM technical check-ins', 'puloma@aynahealth.co', 'completed', 'medium', '2026-08-10', 'meeting_action_item', 'Completed Aug 10 action item: recurring 30-minute Monday 5 PM team check-in scheduled.'),
  (96, 'Complete Alubri/Sarah integration call', 'eliz@aynahealth.co', 'completed', 'high', '2026-08-28', 'meeting_action_item', 'Historical Aug 27 action item: move the Alubri integration discussion from email to a live call with Sarah and the relevant team.'),
  (97, 'Send the Alubri integration calendar invite', 'eliz@aynahealth.co', 'completed', 'medium', '2026-08-28', 'administrative', 'Historical Aug 27 action item: calendar invite sent for the integration discussion.'),
  (98, 'Verify the launch LinkedIn post links to the ayna company page', 'eliz@aynahealth.co', 'not_started', 'medium', '2026-09-05', 'content', 'Check the original launch LinkedIn post and ensure the ayna company name/page is properly hyperlinked.'),
  (99, 'Verify the live ayna domain is connected correctly in analytics', 'ameera@aynahealth.co', 'completed', 'high', '2026-08-28', 'task', 'Historical analytics task: production domain connection corrected and checked against real traffic.'),
  (100, 'Publish the official ayna launch announcement before partner-specific posts', 'ameera@aynahealth.co', 'completed', 'high', '2026-08-25', 'content', 'Historical decision/action: official launch announcement was prioritized before individual partnership content.'),
  (101, 'Update the company website to the official live domain', 'ameera@aynahealth.co', 'completed', 'high', '2026-08-28', 'task', 'Historical domain task: use the official aynahealth.co production domain consistently.')
)
INSERT INTO tasks (
  id,
  workspace_id,
  project_id,
  title,
  description,
  status,
  priority,
  task_type,
  owner_id,
  created_by_id,
  due_at,
  original_due_at,
  due_timezone,
  last_activity_at,
  created_at,
  updated_at
)
SELECT
  'bvu-20260902-' || LPAD(seed.seq::text, 3, '0'),
  context.workspace_id,
  context.project_id,
  seed.title,
  seed.description,
  seed.status::task_status,
  seed.priority::task_priority,
  seed.task_type::task_type,
  (
    SELECT u.id
    FROM users u
    WHERE u.workspace_id = context.workspace_id
      AND LOWER(u.email) = LOWER(seed.owner_email)
    LIMIT 1
  ),
  context.creator_id,
  (seed.due_date::date + TIME '17:00') AT TIME ZONE 'America/New_York',
  (seed.due_date::date + TIME '17:00') AT TIME ZONE 'America/New_York',
  'America/New_York',
  NOW(),
  NOW(),
  NOW()
FROM seed
CROSS JOIN context
WHERE context.creator_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM tasks existing
    WHERE existing.project_id = context.project_id
      AND LOWER(existing.title) = LOWER(seed.title)
  );

WITH context AS (
  SELECT id AS project_id
  FROM projects
  WHERE id = 's44jFHXzCxjRbF0E7vxbo'
),
milestone_seed(id, title, description, due_date) AS (
  VALUES
    ('bvu-ms-20260905', 'P0 stability and safety triage', 'Close the most urgent production errors, persistence bugs, and chat safety gaps.', '2026-09-05'),
    ('bvu-ms-20260910', 'MVP feedback fixes ready for re-test', 'Ship and verify the highest-priority tester feedback before the next outreach round.', '2026-09-10'),
    ('bvu-ms-20260911', 'Conference-ready product experience', 'Have product data, purchase links, partner disclosures, and booth materials ready before Sep 12.', '2026-09-11'),
    ('bvu-ms-20260918', 'Health intake and personalization v2', 'Finish the new health intake and validate Health Match behavior separately from shopping preferences.', '2026-09-18'),
    ('bvu-ms-20260930', 'Tracker and polish backlog complete', 'Finish remaining tracker workflow, accessibility, metadata, and lower-priority polish work.', '2026-09-30')
)
INSERT INTO milestones (id, project_id, title, description, due_date, completed)
SELECT
  milestone_seed.id,
  context.project_id,
  milestone_seed.title,
  milestone_seed.description,
  (milestone_seed.due_date::date + TIME '17:00') AT TIME ZONE 'America/New_York',
  false
FROM milestone_seed
CROSS JOIN context
WHERE NOT EXISTS (
  SELECT 1 FROM milestones existing WHERE existing.id = milestone_seed.id
);
