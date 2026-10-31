const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Run the actual TypeScript API modules without Expo or live backend requests.
function loadSource(entry, overrides = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(__dirname, '..', filename);
    if (!path.extname(filename)) filename += '.ts';
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
      fileName: filename,
    }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'expo-crypto') return require('node:crypto');
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}`);
      if (name.startsWith('.'))
        return load(path.resolve(path.dirname(filename), name));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${source}\n})`, {
      filename,
    })(localRequire, module, module.exports);
    return module.exports;
  }
  return load(entry);
}

const policy = loadSource('src/campaigns/selection.ts');
const campaign = { id: 'campaign-a', name: 'A', role: 'player', dm_id: 'dm' };

function apiHarness(moduleName, response) {
  const calls = [];
  const module = loadSource(moduleName, {
    '@/api/client': {
      apiRequest: async (...args) => {
        calls.push(args);
        return typeof response === 'function' ? response(...args) : response;
      },
    },
  });
  return { module, calls };
}

test('campaign lists are filtered by campaign membership role, not a global role', () => {
  const items = [campaign, { ...campaign, id: 'campaign-b', role: 'dm' }];
  assert.deepEqual(
    policy.campaignsForRole(items, 'player').map((item) => item.id),
    ['campaign-a'],
  );
  assert.deepEqual(
    policy.campaignsForRole(items, 'dm').map((item) => item.id),
    ['campaign-b'],
  );
  assert.deepEqual(policy.campaignsForRole(items, null), []);
});

test('restoration revalidates membership and uses fresh campaign details', async () => {
  const calls = [];
  const restored = await policy.restoreCampaignSelection(
    { userId: 'u', mode: 'player', campaign, characterId: 'char' },
    'u',
    async (id) => {
      calls.push(id);
      return { ...campaign, name: 'Updated' };
    },
  );
  assert.deepEqual(calls, ['campaign-a']);
  assert.equal(restored.campaign.name, 'Updated');
  assert.equal(restored.characterId, 'char');
});

test('another account, invalid mode, and cleared logout preferences cannot restore', async () => {
  let calls = 0;
  const fetch = async () => {
    calls++;
    return campaign;
  };
  for (const saved of [
    null,
    { userId: 'other', mode: 'player', campaign },
    { userId: 'u', mode: 'admin', campaign },
  ]) {
    assert.equal(
      await policy.restoreCampaignSelection(saved, 'u', fetch),
      null,
    );
  }
  assert.equal(calls, 0);
});

test('changed roles and mismatched campaign responses cannot restore', async () => {
  const saved = { userId: 'u', mode: 'player', campaign };
  assert.equal(
    await policy.restoreCampaignSelection(saved, 'u', async () => ({
      ...campaign,
      role: 'dm',
    })),
    null,
  );
  assert.equal(
    await policy.restoreCampaignSelection(saved, 'u', async () => ({
      ...campaign,
      id: 'unrelated',
    })),
    null,
  );
});

test('deleted, revoked, and offline campaign restoration never grants access', async () => {
  for (const status of [403, 404, 503]) {
    await assert.rejects(
      policy.restoreCampaignSelection(
        { userId: 'u', mode: 'player', campaign },
        'u',
        async () => {
          throw new Error(String(status));
        },
      ),
      new RegExp(String(status)),
    );
  }
});

test('combat deep links must match the selected campaign', () => {
  policy.assertCombatCampaign('a', 'a');
  for (const [combatId, activeId] of [
    ['b', 'a'],
    [undefined, 'a'],
    [null, 'a'],
    [undefined, undefined],
  ]) {
    assert.throws(
      () => policy.assertCombatCampaign(combatId, activeId),
      /selected campaign/,
    );
  }
});

test('campaign creation and join use existing authenticated endpoints', async () => {
  const { module, calls } = apiHarness('src/api/campaigns.ts', {
    data: campaign,
  });
  await module.createCampaign(' A ', ' Description ');
  await module.joinCampaign(' secret-invitation ');
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    name: 'A',
    description: 'Description',
  });
  assert.equal(calls[0][0], '/campaigns');
  assert.deepEqual(JSON.parse(calls[1][1].body), { code: 'secret-invitation' });
  assert.equal(calls[1][0], '/campaigns/join');
});

test('campaign listing unwraps data and assignment sends only a character reference', async () => {
  const { module, calls } = apiHarness('src/api/campaigns.ts', {
    data: [campaign],
  });
  assert.deepEqual(await module.listCampaigns(), [campaign]);
  await module.assignCharacter('a/b', 'char-1');
  assert.equal(calls[1][0], '/campaigns/a%2Fb/characters');
  assert.deepEqual(JSON.parse(calls[1][1].body), { characterId: 'char-1' });
});

test('the global character library has no campaign filter; DM filters reach the server', async () => {
  const { module, calls } = apiHarness('src/api/characters.ts', { data: [] });
  await module.listCharacters();
  await module.listCharacters({
    campaignId: 'a',
    party: false,
    category: 'Monster',
    encounterRole: 'Boss',
    minChallengeRating: 0,
    maxChallengeRating: 3,
  });
  assert.equal(calls[0][0], '/characters');
  const query = new URL(calls[1][0], 'https://example.test').searchParams;
  assert.equal(query.get('campaignId'), 'a');
  assert.equal(query.get('party'), 'false');
  assert.equal(query.get('minChallengeRating'), '0');
  assert.equal(query.get('maxChallengeRating'), '3');
  assert.equal(query.get('encounterRole'), 'Boss');
});

test('combat serialization retains campaign, participants, outcome, and timestamps', async () => {
  const data = {
    id: 'combat',
    campaignId: 'a',
    name: 'Encounter',
    status: 'finished',
    outcome: 'draw',
    team1: [{ characterId: 'one' }],
    team2: [{ characterId: 'two' }],
    createdAt: '2026-01-01T00:00:00.000Z',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T01:00:00.000Z',
  };
  const { module, calls } = apiHarness('src/api/combats.ts', { data });
  const combat = await module.loadCombat('combat');
  await module.saveCombat(combat);
  assert.deepEqual(JSON.parse(calls[1][1].body), data);
});

test('combat lists send the active campaign, and API authorization failures propagate', async () => {
  const { module, calls } = apiHarness('src/api/combats.ts', { data: [] });
  await module.listCombats('campaign-a');
  await module.listCombats('campaign-b');
  assert.equal(calls[0][0], '/combats?campaignId=campaign-a');
  assert.equal(calls[1][0], '/combats?campaignId=campaign-b');
  const failed = apiHarness('src/api/campaigns.ts', () => {
    throw new Error('Forbidden');
  });
  await assert.rejects(failed.module.getCampaign('a'), /Forbidden/);
});


test('read-only character controls disable mutations but allow view-only controls', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const access = loadSource('src/components/main-window/character-access.tsx', {
    'react-native': {
      Pressable: props => React.createElement('button', { disabled: props.disabled }, props.children),
      TextInput: props => React.createElement('input', { readOnly: props.editable === false }),
      Switch: props => React.createElement('input', { type: 'checkbox', disabled: props.disabled }),
    },
  });
  const view = readOnly => renderToStaticMarkup(React.createElement(access.CharacterReadOnlyContext.Provider, { value: readOnly },
    React.createElement(access.CharacterPressable, null, 'Edit'),
    React.createElement(access.CharacterPressable, { allowReadOnly: true }, 'Expand'),
    React.createElement(access.CharacterTextInput), React.createElement(access.CharacterSwitch),
  ));
  const reader = view(true);
  assert.match(reader, /<button disabled="">Edit/);
  assert.match(reader, /<button>Expand/);
  assert.match(reader, /readOnly=""/i);
  assert.match(reader, /type="checkbox" disabled=""/);
  assert.doesNotMatch(view(false), /disabled|readonly/i);
});

test('character create and load unwrap envelopes and preserve nested model data', async () => {
  const data = {
    id: 'hero', name: 'Hero', species: 'Human', background: 'Soldier',
    classLevels: [{ characterClass: 'Fighter', subClass: '', level: 1 }],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    maxHp: 10, currentHp: 7, temporaryHp: 2, speed: 30,
    equipment: [{ name: 'Rope', quantity: 1, weight: 5, value: '1 gp', description: '50 feet' }],
    statBonuses: [{ stat: 'armor_class', amount: 1, reason: 'Shield', category: null }],
  };
  const { module } = apiHarness('src/api/characters.ts', { data });
  const character = await module.loadCharacter('hero');
  const created = await module.createCharacter(character);
  assert.equal(created.id, 'hero');
  assert.equal(created.currentHp, 7);
  assert.equal(created.temporaryHp, 2);
  assert.equal(created.equipment[0].name, 'Rope');
  assert.equal(created.equipment[0].value, '1 gp');
  assert.equal(created.statBonuses[0].amount, 1);
});
