import * as assert from 'assert';
import { mapTaskStateFilterToCode, sortTasksByCreateTimeDesc } from '../src/views/taskUtils';

describe('views/taskUtils', () => {
  it('maps task state filter to Koji state code', () => {
    assert.strictEqual(mapTaskStateFilterToCode('ALL'), undefined);
    assert.strictEqual(mapTaskStateFilterToCode('FREE'), 0);
    assert.strictEqual(mapTaskStateFilterToCode('OPEN'), 1);
    assert.strictEqual(mapTaskStateFilterToCode('CLOSED'), 2);
    assert.strictEqual(mapTaskStateFilterToCode('CANCELED'), 3);
    assert.strictEqual(mapTaskStateFilterToCode('ASSIGNED'), 4);
    assert.strictEqual(mapTaskStateFilterToCode('FAILED'), 5);
  });

  it('sorts tasks by create_time desc, fallback to id desc', () => {
    const tasks: any[] = [
      { id: 10, create_time: '2020-01-01 00:00:00' },
      { id: 11, create_time: '2021-01-01 00:00:00' },
      { id: 12, create_time: null },
      { id: 13, create_time: 'not-a-date' },
      { id: 14, create_time: '2021-01-01 00:00:00' },
    ];

    const sorted = sortTasksByCreateTimeDesc(tasks as any);
    assert.deepStrictEqual(
      sorted.map((t: any) => t.id),
      // 2021 first (id desc for same timestamp), then 2020, then invalid/empty (id desc)
      [14, 11, 10, 13, 12]
    );
  });
});


