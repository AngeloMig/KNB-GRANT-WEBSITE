import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSupportChoice, recommendSupport, supportInquiryUrl, supportInquiryNotes, supportJobs } from '../src/data/support-plans.ts';

const basic = { workload: 'occasional', focus: 'care', response: 'standard' };
test('no recommendation before all three valid answers exist', () => {
  assert.equal(recommendSupport({}), null);
  assert.equal(recommendSupport({ ...basic, response: 'instant' }), null);
  assert.equal(recommendSupport({ workload: 'weekly', focus: 'features' }), null);
});
test('capacity and response are matched separately', () => {
  assert.equal(recommendSupport(basic).value, '20');
  assert.equal(recommendSupport({ ...basic, workload: 'monthly' }).value, '20');
  assert.equal(recommendSupport({ ...basic, workload: 'weekly' }).value, '40');
  assert.equal(recommendSupport({ ...basic, workload: 'weekly', focus: 'features' }).value, '80');
  assert.equal(recommendSupport({ ...basic, response: 'same-day' }).value, '40');
  assert.equal(recommendSupport({ ...basic, response: 'priority' }).value, '80');
  assert.equal(recommendSupport({ ...basic, workload: 'dedicated' }).value, 'vip');
});
test('jobs use unique, valid IDs and act as a capacity minimum', () => {
  const recommendation = recommendSupport({ ...basic, jobs: ['images','images','code','not-a-job'] });
  assert.deepEqual(recommendation.jobs, { count: 2, low: 3, high: 7 });
  const allJobs = supportJobs.map(job => job.id);
  assert.equal(recommendSupport({ ...basic, jobs: allJobs }).value, '40');
  assert.equal(recommendSupport({ ...basic, workload: 'weekly', focus: 'features', jobs: allJobs }).value, '80');
});
test('saved or URL data cannot inject arbitrary notes', () => {
  assert.deepEqual(cleanSupportChoice({ workload: '<script>', focus: 'care', jobs: ['alt', {}, 'alt'] }), { focus: 'care', jobs: ['alt'] });
  assert.equal(supportInquiryNotes(new URLSearchParams('focus=<script>&tasks=private-preview,unknown')), '');
});
test('handoff respects the chosen plan and repository base path', () => {
  const link = supportInquiryUrl('/KNB-GRANT-WEBSITE/', '20', { ...basic, response: 'priority', jobs: ['images','alt'] });
  const url = new URL(link, 'https://example.test');
  assert.equal(url.pathname, '/KNB-GRANT-WEBSITE/estimate/');
  assert.equal(url.searchParams.get('plan'), '20');
  assert.equal(url.searchParams.get('response'), 'priority');
  const notes = supportInquiryNotes(url.searchParams);
  assert.match(notes, /Within 4 business hours/);
  assert.match(notes, /Resize and compress heavy images/);
  assert.match(notes, /Add image text descriptions/);
  assert.equal(supportInquiryUrl('/', '40'), '/estimate/?plan=40');
});
test('every valid combination is stable and faster response never lowers capacity', () => {
  const rank = { '20': 0, '40': 1, '80': 2, vip: 3 };
  for (const workload of ['occasional','monthly','weekly','dedicated']) {
    for (const focus of ['care','growth','features']) {
      let previous = -1;
      for (const response of ['standard','same-day','priority']) {
        const result = recommendSupport({ workload, focus, response });
        assert.ok(result);
        assert.ok(rank[result.value] >= previous);
        assert.equal(result.reasons.length, 3);
        previous = rank[result.value];
      }
    }
  }
});
