/**
 * Property-based / fuzz tests (R803 / ROB-08): instead of a handful of
 * hand-picked cases, these generate many random documents and command
 * sequences from a seeded PRNG and check an invariant holds every time.
 * Seeded, so a failure is reproducible and the suite never flakes.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { insertSubtree, moveNode, removeNode, updateProps } from '../commands';
import { documentsEqual, documentToPuck, puckToDocument } from '../converter';
import {
  type BuilderDocument,
  type BuilderNode,
  DOCUMENT_VERSION,
  type NodeId,
} from '../document';
import {
  DEVICES,
  type Device,
  inheritedFrom,
  resetDeviceValue,
  valueForDevice,
  withDeviceValue,
} from '../fields';
import { documentProblems } from '../patch';
import type { SlotPosition } from '../tree';

/** Deterministic PRNG (mulberry32), so a failing seed is reproducible. */
function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SLOT_NAMES = ['content', 'left', 'right'];

/**
 * A random, well-formed document: a tree of nodes with simple slots, each
 * carrying its own id prop. Only adds a slot key when it has children — an
 * empty slot and no slot at all are indistinguishable once round-tripped
 * through Puck's *inline* format (see the regression test in
 * converter.test.ts), so a slot with zero children isn't a meaningful case
 * to fuzz here.
 */
function randomDocument(rng: () => number, maxNodes: number): BuilderDocument {
  const nodes: Record<NodeId, BuilderNode> = {};
  const rootSlot: NodeId[] = [];
  let n = 0;
  const nextId = () => `n${n++}`;

  function maybeAddChildren(slots: Record<string, NodeId[]>, depth: number) {
    if (depth <= 0 || n >= maxNodes) return;
    const slotCount = 1 + Math.floor(rng() * 2);
    for (let s = 0; s < slotCount && n < maxNodes; s++) {
      const slot = SLOT_NAMES[s % SLOT_NAMES.length];
      const children: NodeId[] = [];
      const childCount = 1 + Math.floor(rng() * 2);
      for (let c = 0; c < childCount && n < maxNodes; c++) {
        const id = nextId();
        const childSlots: Record<string, NodeId[]> = {};
        nodes[id] = {
          id,
          type: 'Box',
          props: { id, label: `node-${id}` },
          slots: childSlots,
        };
        children.push(id);
        maybeAddChildren(childSlots, depth - 1);
      }
      if (children.length > 0) slots[slot] = children;
    }
  }

  const topCount = 1 + Math.floor(rng() * 4);
  for (let i = 0; i < topCount && n < maxNodes; i++) {
    const id = nextId();
    const slots: Record<string, NodeId[]> = {};
    nodes[id] = { id, type: 'Box', props: { id, label: `node-${id}` }, slots };
    rootSlot.push(id);
    maybeAddChildren(slots, 3);
  }

  return { version: DOCUMENT_VERSION, root: { props: {} }, nodes, rootSlot };
}

const RUNS = 50;

describe('fuzz: converter round-trips a random document (R803)', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    it(`seed ${seed}`, () => {
      const rng = prng(seed);
      const doc = randomDocument(rng, 12);
      const roundTripped = puckToDocument(documentToPuck(doc));
      assert.ok(
        documentsEqual(doc, roundTripped),
        `round trip changed the document for seed ${seed}`
      );
      assert.deepEqual(documentProblems(roundTripped), []);
    });
  }
});

describe('fuzz: random command sequences never corrupt the tree (R803)', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    it(`seed ${seed}`, () => {
      const rng = prng(seed);
      let doc = randomDocument(rng, 10);
      assert.deepEqual(
        documentProblems(doc),
        [],
        'the generated document starts valid'
      );

      for (let step = 0; step < 20; step++) {
        const ids = Object.keys(doc.nodes);
        if (ids.length === 0) break;
        const pick = () => ids[Math.floor(rng() * ids.length)];
        const randomSlot = (): SlotPosition => ({
          parentId: rng() < 0.4 ? null : pick(),
          slot: SLOT_NAMES[Math.floor(rng() * SLOT_NAMES.length)],
          index: Math.floor(rng() * 5),
        });

        const action = Math.floor(rng() * 4);
        if (action === 0) {
          // move a random node to a random (possibly invalid) position
          doc = moveNode(doc, pick(), randomSlot());
        } else if (action === 1) {
          doc = removeNode(doc, pick());
        } else if (action === 2) {
          doc = updateProps(doc, pick(), { touched: step });
        } else {
          const id = `added-${seed}-${step}`;
          doc = insertSubtree(
            doc,
            {
              rootId: id,
              nodes: { [id]: { id, type: 'Box', props: { id }, slots: {} } },
            },
            randomSlot()
          );
        }

        const problems = documentProblems(doc);
        assert.deepEqual(
          problems,
          [],
          `step ${step} (action ${action}) broke the tree for seed ${seed}: ${problems.join('; ')}`
        );
      }
    });
  }
});

describe('fuzz: responsive inheritance invariants (R803)', () => {
  for (let seed = 1; seed <= RUNS; seed++) {
    it(`seed ${seed}`, () => {
      const rng = prng(seed);
      let value: number | Partial<Record<Device, number>> | undefined;
      for (let step = 0; step < 15; step++) {
        const device = DEVICES[Math.floor(rng() * DEVICES.length)] as Device;
        if (rng() < 0.3) {
          value = resetDeviceValue(value, device);
        } else {
          value = withDeviceValue(value, device, step);
        }

        for (const probe of DEVICES) {
          const shown = valueForDevice(value, probe);
          const from = inheritedFrom(value, probe);
          // The two must agree on whether anything is shown at all.
          assert.equal(
            shown === undefined,
            from === null,
            `valueForDevice/inheritedFrom disagree for ${probe} at step ${step}, seed ${seed}`
          );
        }
      }
    });
  }
});
