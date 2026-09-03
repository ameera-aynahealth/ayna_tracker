-- Exact health-intake requirements supplied by Ameera.
-- Idempotent updates to the existing beta task list; no new unrelated tasks.

-- Health intake is the #1 active beta priority. Keep the main redesign first,
-- then the section-by-section implementation immediately behind it.
UPDATE tasks
SET priority = 'urgent',
    due_at = TIMESTAMPTZ '2026-09-03 17:00:00-04',
    original_due_at = TIMESTAMPTZ '2026-09-03 17:00:00-04',
    updated_at = NOW()
WHERE id = 'bvu-beta-20260903-042';

UPDATE tasks
SET priority = 'urgent',
    due_at = CASE
      WHEN id IN ('bvu-beta-20260903-043', 'bvu-beta-20260903-044') THEN TIMESTAMPTZ '2026-09-04 17:00:00-04'
      WHEN id IN ('bvu-beta-20260903-045', 'bvu-beta-20260903-046', 'bvu-beta-20260903-047') THEN TIMESTAMPTZ '2026-09-05 17:00:00-04'
      WHEN id IN ('bvu-beta-20260903-048', 'bvu-beta-20260903-049', 'bvu-beta-20260903-050') THEN TIMESTAMPTZ '2026-09-06 17:00:00-04'
      ELSE TIMESTAMPTZ '2026-09-07 17:00:00-04'
    END,
    original_due_at = CASE
      WHEN id IN ('bvu-beta-20260903-043', 'bvu-beta-20260903-044') THEN TIMESTAMPTZ '2026-09-04 17:00:00-04'
      WHEN id IN ('bvu-beta-20260903-045', 'bvu-beta-20260903-046', 'bvu-beta-20260903-047') THEN TIMESTAMPTZ '2026-09-05 17:00:00-04'
      WHEN id IN ('bvu-beta-20260903-048', 'bvu-beta-20260903-049', 'bvu-beta-20260903-050') THEN TIMESTAMPTZ '2026-09-06 17:00:00-04'
      ELSE TIMESTAMPTZ '2026-09-07 17:00:00-04'
    END,
    updated_at = NOW()
WHERE id BETWEEN 'bvu-beta-20260903-043' AND 'bvu-beta-20260903-053';

UPDATE tasks
SET description = 'Replace the older intake with the final 7-section branching intake exactly as specified: 1) Core Profile, 2) Goals, 3) Relevant Symptoms, 4) Health + Safety, 5) Tried Before, 6) Shopping Preferences, 7) Results. Health Match must remain separate from Shopping Preferences.'
WHERE id = 'bvu-beta-20260903-042';

UPDATE tasks
SET description = 'Questions/fields: age range; life stage; optional ZIP code.'
WHERE id = 'bvu-beta-20260903-043';

UPDATE tasks
SET description = 'Questions/fields: main health goal; choose the top 1-3 priorities that matter most right now.'
WHERE id = 'bvu-beta-20260903-044';

UPDATE tasks
SET title = 'Health intake Section 3: Relevant Symptoms',
    description = 'Questions/fields: relevant symptoms; choose the top 1-3 symptoms; severity; frequency; timing. Only when relevant, ask period/flow/pain follow-ups.'
WHERE id = 'bvu-beta-20260903-045';

UPDATE tasks
SET description = 'Questions/fields: diagnosed conditions, with an Other / not listed free-text option so users can manually enter a condition that is not in the preset list; allergies/sensitivities; pregnancy/TTC/postpartum/breastfeeding status; medications and hormonal treatments; supplements; serious reactions; products/treatments stopped because of reactions or side effects; whether symptoms are new, worsening, or interfering with daily function.'
WHERE id = 'bvu-beta-20260903-046';

UPDATE tasks
SET description = 'Add the red-flag safety gate to Health + Safety. Concerning responses should trigger appropriate-care guidance before product recommendations rather than continuing as if this were routine shopping.'
WHERE id = 'bvu-beta-20260903-047';

UPDATE tasks
SET description = 'Questions/fields: products, treatments, or approaches the user has already tried; what did not work; why it failed, was stopped, or was disliked.'
WHERE id = 'bvu-beta-20260903-048';

UPDATE tasks
SET description = 'Questions/fields: preferred product formats; price/budget; what matters most when shopping, including evidence, safety, price, ingredients, reviews, convenience, doctor-recommended options, sustainability, and FSA/HSA eligibility; relevant ingredient/material preferences.'
WHERE id = 'bvu-beta-20260903-049';

UPDATE tasks
SET description = 'Shopping Preferences must influence shopping/ranking preferences only. Keep them visibly and logically separate from Health Match so price, convenience, sustainability, reviews, affiliate status, or similar shopping factors never inflate the health relevance score.'
WHERE id = 'bvu-beta-20260903-050';

UPDATE tasks
SET description = 'Results should present Health Match separately from Shopping Preferences and explain why a product may fit the user without implying that the percentage is medically validated. Health Match weighting: primary goal 20; symptoms 20; diagnoses 15; life stage 10; severity 5; frequency 5; timing 5; medication compatibility 5; tried-before 5; product health attributes 10; affiliate/commission/partner status 0.'
WHERE id = 'bvu-beta-20260903-051';

UPDATE tasks
SET description = 'Use conditional branching so users only see extra cycle, UTI, menopause/perimenopause, pelvic-floor, pregnancy, digestive, and other concern-specific questions when their prior answers make those questions relevant.'
WHERE id = 'bvu-beta-20260903-052';

UPDATE tasks
SET description = 'Create a dedicated perimenopause path/category and relevant intake branching. Do not bury perimenopause entirely under menopause.'
WHERE id = 'bvu-beta-20260903-053';
